#!/usr/bin/env npx ts-node
/**
 * 숏폼 오디오 클립 메타데이터 생성 스크립트
 *
 * full_narration_short.mp3의 길이를 측정하여
 * 8초 단위 클립 메타데이터(clips-short.json)를 생성합니다.
 *
 * ⚠️ 실제 오디오 파일 분할은 하지 않습니다 (ffmpeg 불필요).
 *    Veo 비디오 생성에는 메타데이터만 필요합니다.
 *
 * 출력: clips-short.json (각 클립의 시작/끝 시간 메타데이터)
 *
 * 사용법: npx ts-node src/JuknaraBriefing/splitAudio-short.ts
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const CLIP_DURATION = 8; // seconds — Veo 3.1 max duration
const AUDIO_DIR = path.join(__dirname, "../../public/audio");
const INPUT_FILE = path.join(AUDIO_DIR, "full_narration_short.mp3");
const OUTPUT_JSON = path.join(__dirname, "clips-short.json");

export interface AudioClipShort {
  id: string;        // "clip001", "clip002", ...
  index: number;     // 0-based
  file: string;      // "clips-short/clip001.mp3" (reference only)
  startSec: number;
  endSec: number;
  durationSec: number;
  durationFrames: number; // at 30fps
}

function getAudioDuration(filePath: string): number {
  // Try afinfo first (macOS built-in)
  try {
    const output = execSync(`afinfo "${filePath}" 2>/dev/null`, {
      encoding: "utf-8",
    });
    const match = output.match(/estimated duration:\s*([\d.]+)/);
    if (match) return parseFloat(match[1]);
  } catch {}

  // Fallback: ffprobe
  try {
    const output = execSync(
      `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
      { encoding: "utf-8" }
    );
    return parseFloat(output.trim());
  } catch {}

  throw new Error(`Cannot determine audio duration for: ${filePath}`);
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ 오디오 파일이 없습니다: ${INPUT_FILE}`);
    process.exit(1);
  }

  const totalDuration = getAudioDuration(INPUT_FILE);
  const clipCount = Math.ceil(totalDuration / CLIP_DURATION);

  console.log(`\n✂️  숏폼 오디오 클립 메타데이터 생성`);
  console.log(`📊 전체 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`📊 클립 단위: ${CLIP_DURATION}초`);
  console.log(`📊 총 클립 수: ${clipCount}개\n`);

  const clips: AudioClipShort[] = [];

  for (let i = 0; i < clipCount; i++) {
    const startSec = i * CLIP_DURATION;
    const endSec = Math.min((i + 1) * CLIP_DURATION, totalDuration);
    const durationSec = endSec - startSec;
    const id = `clip${String(i + 1).padStart(3, "0")}`;

    const clip: AudioClipShort = {
      id,
      index: i,
      file: `clips-short/${id}.mp3`,
      startSec,
      endSec,
      durationSec,
      durationFrames: Math.round(durationSec * 30),
    };

    clips.push(clip);
    console.log(
      `  ✅ ${id}: ${startSec.toFixed(1)}s → ${endSec.toFixed(1)}s (${durationSec.toFixed(1)}s, ${clip.durationFrames} frames)`
    );
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(clips, null, 2));
  console.log(`\n📋 clips-short.json 저장 완료 (${clips.length}개 클립)`);
  console.log(`📁 ${OUTPUT_JSON}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
