#!/usr/bin/env npx ts-node
/**
 * 오디오 클립 분할 스크립트
 *
 * full_narration.mp3를 max 8초 단위로 분할하여
 * public/audio/clips/ 폴더에 clip001.mp3, clip002.mp3, ... 로 저장합니다.
 *
 * 출력: clips.json (각 클립의 시작/끝 시간, 파일명 메타데이터)
 *
 * 사용법: npx ts-node src/JuknaraBriefing/splitAudio.ts
 * 의존성: ffmpeg (시스템에 설치되어 있어야 함)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const CLIP_DURATION = 8; // seconds — Veo 3.1 max duration
const AUDIO_DIR = path.join(__dirname, "../../public/audio");
const CLIP_DIR = path.join(AUDIO_DIR, "clips");
const INPUT_FILE = path.join(AUDIO_DIR, "full_narration.mp3");
const OUTPUT_JSON = path.join(__dirname, "clips.json");

export interface AudioClip {
  id: string;        // "clip001", "clip002", ...
  index: number;     // 0-based
  file: string;      // "clips/clip001.mp3"
  startSec: number;  // start time in seconds
  endSec: number;    // end time in seconds
  durationSec: number;
  durationFrames: number; // at 30fps
}

function getAudioDuration(filePath: string): number {
  try {
    // macOS afinfo
    const output = execSync(`afinfo "${filePath}" 2>/dev/null`, {
      encoding: "utf-8",
    });
    const match = output.match(/estimated duration:\s*([\d.]+)/);
    if (match) return parseFloat(match[1]);
  } catch {}

  try {
    // fallback: ffprobe
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

  // Clean & create clip directory
  if (fs.existsSync(CLIP_DIR)) {
    fs.rmSync(CLIP_DIR, { recursive: true });
  }
  fs.mkdirSync(CLIP_DIR, { recursive: true });

  // Get total duration
  const totalDuration = getAudioDuration(INPUT_FILE);
  const clipCount = Math.ceil(totalDuration / CLIP_DURATION);

  console.log(`\n✂️  오디오 클립 분할 시작`);
  console.log(`📊 전체 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`📊 클립 단위: ${CLIP_DURATION}초`);
  console.log(`📊 총 클립 수: ${clipCount}개`);
  console.log(`📁 출력: ${CLIP_DIR}\n`);

  const clips: AudioClip[] = [];

  for (let i = 0; i < clipCount; i++) {
    const startSec = i * CLIP_DURATION;
    const endSec = Math.min((i + 1) * CLIP_DURATION, totalDuration);
    const durationSec = endSec - startSec;
    const id = `clip${String(i + 1).padStart(3, "0")}`;
    const fileName = `${id}.mp3`;
    const outputPath = path.join(CLIP_DIR, fileName);

    // ffmpeg split
    execSync(
      `ffmpeg -y -i "${INPUT_FILE}" -ss ${startSec} -t ${durationSec} -acodec copy "${outputPath}" 2>/dev/null`,
      { encoding: "utf-8" }
    );

    const clip: AudioClip = {
      id,
      index: i,
      file: `clips/${fileName}`,
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

  // Save metadata
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(clips, null, 2));
  console.log(`\n📋 clips.json 저장 완료 (${clips.length}개 클립)`);
  console.log(`📁 ${OUTPUT_JSON}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
