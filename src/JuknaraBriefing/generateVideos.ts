#!/usr/bin/env npx ts-node
/**
 * Veo 3.1 클립 비디오 생성 스크립트
 *
 * videoPrompts.json을 읽어 각 8초 클립에 대응하는
 * 비디오를 Veo 3.1 API로 생성하고 public/videos/clips/ 에 저장합니다.
 *
 * 파이프라인:
 *   splitAudio.ts → generateVideoPrompts.ts → [이 스크립트] → Remotion render
 *
 * 사용법: npx ts-node src/JuknaraBriefing/generateVideos.ts
 */

import fs from "fs";
import path from "path";
import type { VideoPrompt } from "./generateVideoPrompts";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyAJFOsi-5QMrUUOnXkZU6S6cc8rKZ0PWSU";

const MODEL = "veo-3.1-fast-generate-preview";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const GENERATE_URL = `${BASE_URL}/models/${MODEL}:predictLongRunning`;

const OUTPUT_DIR = path.join(__dirname, "../../public/videos/clips");
const PROMPTS_JSON = path.join(__dirname, "videoPrompts.json");

// Veo 3.1: fixed 8 seconds per clip
const VIDEO_DURATION = 8;
const ASPECT_RATIO = "16:9";
const RESOLUTION = "720p";

// ── Submit video generation request ──
async function submitVideoGeneration(prompt: string): Promise<string> {
  const body = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio: ASPECT_RATIO,
      resolution: RESOLUTION,
      durationSeconds: VIDEO_DURATION,
      sampleCount: 1,
    },
  };

  const res = await fetch(GENERATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const operationName = data.name;
  if (!operationName) {
    throw new Error(
      "No operation name in Veo response: " + JSON.stringify(data)
    );
  }

  return operationName;
}

// ── Poll for operation completion ──
async function pollOperation(operationName: string): Promise<string> {
  const pollUrl = `${BASE_URL}/${operationName}`;
  const maxAttempts = 120; // 10 minutes max (5s intervals)

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const res = await fetch(pollUrl, {
      headers: { "x-goog-api-key": API_KEY },
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`  Poll error (attempt ${i + 1}): ${err}`);
      continue;
    }

    const data = await res.json();

    if (data.done) {
      const samples =
        data.response?.generateVideoResponse?.generatedSamples ||
        data.response?.generatedSamples ||
        [];

      if (samples.length === 0) {
        throw new Error(
          "No generated samples in response: " + JSON.stringify(data)
        );
      }

      const videoUri = samples[0]?.video?.uri || samples[0]?.uri;

      if (!videoUri) {
        throw new Error("No video URI found: " + JSON.stringify(samples[0]));
      }

      return videoUri;
    }

    const elapsed = (i + 1) * 5;
    process.stdout.write(`\r  ⏳ Waiting... ${elapsed}s`);
  }

  throw new Error(
    `Timeout: operation ${operationName} did not complete in 10 minutes`
  );
}

// ── Download video from URI ──
async function downloadVideo(
  videoUri: string,
  outputPath: string
): Promise<void> {
  const res = await fetch(videoUri, {
    headers: { "x-goog-api-key": API_KEY },
  });

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

// ── Main ──
async function main() {
  if (!fs.existsSync(PROMPTS_JSON)) {
    console.error(
      "❌ videoPrompts.json이 없습니다. generateVideoPrompts.ts를 먼저 실행하세요."
    );
    process.exit(1);
  }

  const prompts: VideoPrompt[] = JSON.parse(
    fs.readFileSync(PROMPTS_JSON, "utf-8")
  );

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n🎬 Veo 3.1 클립 비디오 생성 시작`);
  console.log(`📊 총 ${prompts.length}개 클립, 각 ${VIDEO_DURATION}초`);
  console.log(`📐 해상도: ${RESOLUTION}, 비율: ${ASPECT_RATIO}`);
  console.log(`📁 출력: ${OUTPUT_DIR}\n`);

  // Check which videos already exist (for resuming)
  const existing = new Set<string>();
  for (const vp of prompts) {
    const filePath = path.join(OUTPUT_DIR, `${vp.clipId}.mp4`);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 10000) {
        existing.add(vp.clipId);
      }
    }
  }

  if (existing.size > 0) {
    console.log(
      `⏭️  이미 생성된 클립 건너뛰기: ${[...existing].join(", ")}\n`
    );
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < prompts.length; i++) {
    const vp = prompts[i];

    // Skip existing
    if (existing.has(vp.clipId)) {
      console.log(
        `✅ [${i + 1}/${prompts.length}] ${vp.clipId} — 이미 존재, 건너뛰기`
      );
      successCount++;
      continue;
    }

    console.log(
      `\n🎬 [${i + 1}/${prompts.length}] ${vp.clipId} (${vp.chapterId}: ${vp.chapterTitle})`
    );
    console.log(`  📝 프롬프트: ${vp.videoPrompt.substring(0, 120)}...`);

    try {
      console.log("  🚀 Veo 3.1에 생성 요청 중...");
      const operationName = await submitVideoGeneration(vp.videoPrompt);
      console.log(`  📋 Operation: ${operationName}`);

      const videoUri = await pollOperation(operationName);
      console.log(`\n  📥 비디오 다운로드 중...`);

      const outputPath = path.join(OUTPUT_DIR, `${vp.clipId}.mp4`);
      await downloadVideo(videoUri, outputPath);

      const fileSize = fs.statSync(outputPath).size;
      console.log(
        `  ✅ 저장 완료: ${vp.clipId}.mp4 (${(fileSize / 1024 / 1024).toFixed(1)}MB)`
      );
      successCount++;
    } catch (err: any) {
      console.error(`  ❌ 실패: ${err.message}`);
      failCount++;
    }

    // Rate limiting between requests
    if (i < prompts.length - 1) {
      console.log("  ⏳ 다음 요청까지 3초 대기...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎬 클립 비디오 생성 완료!`);
  console.log(`  ✅ 성공: ${successCount}/${prompts.length}`);
  if (failCount > 0) {
    console.log(`  ❌ 실패: ${failCount}/${prompts.length}`);
    console.log(
      `  💡 실패한 클립은 스크립트를 다시 실행하면 자동으로 재시도됩니다.`
    );
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
