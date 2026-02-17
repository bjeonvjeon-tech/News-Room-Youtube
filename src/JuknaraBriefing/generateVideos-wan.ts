import * as fs from "fs";
import * as path from "path";
import { fal } from "@fal-ai/client";

/**
 * Wan 2.5 Text-to-Video - fal.ai API를 통한 비디오 생성
 *
 * 가격 (5초 기준):
 *   - 480p: $0.25
 *   - 720p: $0.50
 *   - 1080p: $0.75
 *
 * 10개 씬 (480p) = $2.50 (가장 저렴!)
 */

// fal.ai API 설정
const FAL_API_KEY = "afa50a32-22ff-4ad2-abc0-9fa8f880bc29:9e0e2560c923871584de6ae1a5a54d6e";

// 생성 설정
const VIDEO_DURATION = "5" as const; // "5" 또는 "10"
const ASPECT_RATIO = "9:16" as const; // "16:9", "9:16", "1:1"
const RESOLUTION = "480p" as const; // "480p", "720p", "1080p"
const MODEL = "fal-ai/wan-25-preview/text-to-video";

// 가격 계산
const PRICE_PER_SECOND: Record<string, number> = {
  "480p": 0.05,
  "720p": 0.10,
  "1080p": 0.15,
};

interface SceneInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  flowPrompt: string;
  videoFile: string;
}

interface FalVideoResult {
  video: {
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
  };
}

/**
 * fal.ai 클라이언트 설정
 */
fal.config({
  credentials: FAL_API_KEY,
});

/**
 * 비디오 생성 요청
 */
async function generateVideo(prompt: string): Promise<string> {
  console.log(`   🎬 Generating with Wan 2.5...`);

  const result = await fal.subscribe(MODEL, {
    input: {
      prompt: prompt,
      duration: VIDEO_DURATION,
      aspect_ratio: ASPECT_RATIO,
      resolution: RESOLUTION,
      negative_prompt:
        "text, watermark, logo, caption, subtitle, blurry, distorted, low quality, ugly, deformed",
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        const logs = update.logs || [];
        if (logs.length > 0) {
          const lastLog = logs[logs.length - 1];
          process.stdout.write(`\r   ⏳ ${lastLog.message || "Processing..."}     `);
        }
      }
    },
  });

  const data = result.data as FalVideoResult;
  console.log(`\n   ✅ Video generated!`);
  return data.video.url;
}

/**
 * 비디오 다운로드
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

/**
 * 메인 실행
 */
async function main() {
  const durationNum = parseInt(VIDEO_DURATION);
  const pricePerVideo = PRICE_PER_SECOND[RESOLUTION] * durationNum;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎬 Wan 2.5 비디오 자동 생성 (최저가)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📦 모델: ${MODEL}`);
  console.log(`⏱️  길이: ${VIDEO_DURATION}초`);
  console.log(`📐 비율: ${ASPECT_RATIO}`);
  console.log(`🖥️  해상도: ${RESOLUTION}`);
  console.log(`💰 예상 비용: $${(pricePerVideo * 10).toFixed(2)} (10개 씬)\n`);

  // API 키 확인
  if (!FAL_API_KEY || FAL_API_KEY.length < 10) {
    console.error("❌ FAL_KEY가 설정되지 않았습니다.");
    console.log("   fal.ai API 키 발급: https://fal.ai/dashboard/keys");
    process.exit(1);
  }

  // scenes-short.json 로드
  const scenesPath = path.join(__dirname, "scenes-short.json");
  if (!fs.existsSync(scenesPath)) {
    console.error("❌ scenes-short.json not found");
    console.log("   먼저 generateScenePrompts-short.ts를 실행하세요.");
    process.exit(1);
  }

  const scenes: SceneInfo[] = JSON.parse(fs.readFileSync(scenesPath, "utf-8"));
  console.log(`📝 ${scenes.length}개 씬 로드됨\n`);

  // 출력 폴더 생성
  const outputDir = path.join(__dirname, "../../public/videos/scenes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 각 씬별 비디오 생성
  const results: { scene: string; status: string; file?: string; cost?: number }[] = [];
  let totalCost = 0;

  for (const scene of scenes) {
    const outputFile = path.join(outputDir, `${scene.id}.mp4`);

    // 이미 존재하면 스킵
    if (fs.existsSync(outputFile)) {
      console.log(`⏭️  [${scene.id}] 이미 존재함 - 스킵`);
      results.push({ scene: scene.id, status: "skipped", file: outputFile });
      continue;
    }

    console.log(`\n🎬 [${scene.id}] ${scene.title}`);
    console.log(`   📝 프롬프트 길이: ${scene.flowPrompt.length}자`);

    try {
      // 1. 비디오 생성
      const videoUrl = await generateVideo(scene.flowPrompt);
      console.log(`   🔗 URL: ${videoUrl.substring(0, 60)}...`);

      // 2. 다운로드
      console.log(`   📥 Downloading...`);
      await downloadVideo(videoUrl, outputFile);
      console.log(`   ✅ Saved: ${scene.id}.mp4`);

      totalCost += pricePerVideo;
      results.push({ scene: scene.id, status: "success", file: outputFile, cost: pricePerVideo });

      // API 레이트 리밋 방지 (2초 대기)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      results.push({ scene: scene.id, status: "failed" });
    }
  }

  // 결과 요약
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 결과 요약");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const success = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`✅ 성공: ${success}`);
  console.log(`⏭️  스킵: ${skipped}`);
  console.log(`❌ 실패: ${failed}`);
  console.log(`💰 총 비용: $${totalCost.toFixed(2)}`);

  if (failed > 0) {
    console.log("\n실패한 씬:");
    results
      .filter((r) => r.status === "failed")
      .forEach((r) => console.log(`   - ${r.scene}`));
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (success + skipped === scenes.length) {
    console.log("🎉 모든 비디오 준비 완료!");
    console.log("   npx remotion render 로 최종 영상을 렌더링하세요.");
  }
}

main().catch(console.error);
