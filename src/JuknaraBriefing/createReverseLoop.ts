#!/usr/bin/env npx ts-node
/**
 * FFmpeg Reverse Loop 생성기 (TypeScript 버전)
 *
 * 5초 영상 → 10초 (원본 + 역재생)
 *
 * Remotion의 FFmpeg는 reverse 필터가 비활성화되어 있으므로,
 * 시스템 FFmpeg 또는 별도 설치가 필요합니다.
 *
 * 대안: 프레임 기반 역재생 구현
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const BASE_DIR = __dirname;
const INPUT_DIR = path.join(BASE_DIR, "../../public/videos/scenes");
const OUTPUT_DIR = path.join(BASE_DIR, "../../public/videos/scenes-extended");

interface SceneInfo {
  id: string;
  durationSec: number;
  playbackMode: string;
}

/**
 * FFmpeg 경로 찾기
 */
function findFFmpeg(): string | null {
  const possiblePaths = [
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg", // PATH에서 찾기
  ];

  for (const ffmpegPath of possiblePaths) {
    try {
      execSync(`${ffmpegPath} -version`, { stdio: "ignore" });
      return ffmpegPath;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 비디오 역재생 + 합치기 (FFmpeg 사용)
 */
function createReverseLoopWithFFmpeg(
  ffmpeg: string,
  inputFile: string,
  outputFile: string
): boolean {
  const tempDir = path.join(OUTPUT_DIR, "temp");
  const tempReversed = path.join(tempDir, "reversed.mp4");
  const tempList = path.join(tempDir, "list.txt");

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // 1. 역재생 영상 생성
    console.log("   🔄 역재생 생성 중...");
    execSync(
      `${ffmpeg} -y -i "${inputFile}" -vf reverse -af areverse "${tempReversed}" -loglevel warning`,
      { stdio: "inherit" }
    );

    // 2. concat 목록 생성
    fs.writeFileSync(tempList, `file '${inputFile}'\nfile '${tempReversed}'`);

    // 3. 합치기
    console.log("   📦 합치기...");
    execSync(
      `${ffmpeg} -y -f concat -safe 0 -i "${tempList}" -c copy "${outputFile}" -loglevel warning`,
      { stdio: "inherit" }
    );

    // 4. 임시 파일 삭제
    fs.rmSync(tempDir, { recursive: true, force: true });

    return true;
  } catch (error) {
    console.error(`   ❌ 오류: ${error}`);
    return false;
  }
}

/**
 * 프레임 기반 reverse loop (FFmpeg 없이)
 * Remotion에서 frame 조작으로 역재생 구현
 */
function createReverseLoopFrameBased(
  inputFile: string,
  outputFile: string
): boolean {
  // 이 방식은 Remotion 렌더링 시 구현
  // 여기서는 원본을 복사
  try {
    fs.copyFileSync(inputFile, outputFile);
    console.log("   ⚠️  FFmpeg 없음 - 원본 복사 (Remotion에서 frame 역재생 사용)");
    return true;
  } catch (error) {
    console.error(`   ❌ 복사 실패: ${error}`);
    return false;
  }
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄 Reverse Loop 생성기");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 출력 폴더 생성
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // FFmpeg 찾기
  const ffmpeg = findFFmpeg();
  if (ffmpeg) {
    console.log(`✅ FFmpeg 발견: ${ffmpeg}`);
  } else {
    console.log("⚠️  FFmpeg 미발견 - 원본 복사 모드로 전환");
    console.log("   Remotion에서 frame 기반 역재생을 사용합니다.");
  }

  // scenes-short.json 로드
  const scenesPath = path.join(BASE_DIR, "scenes-short.json");
  let scenes: SceneInfo[] = [];
  if (fs.existsSync(scenesPath)) {
    scenes = JSON.parse(fs.readFileSync(scenesPath, "utf-8"));
  } else {
    // 씬 파일 없으면 모든 mp4 처리
    const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".mp4"));
    scenes = files.map((f) => ({
      id: path.basename(f, ".mp4"),
      durationSec: 8, // 기본값
      playbackMode: "reverse-loop",
    }));
  }

  // reverse-loop 또는 5~10초 씬만 처리
  const targetScenes = scenes.filter(
    (s) =>
      s.playbackMode === "reverse-loop" ||
      (s.durationSec > 5 && s.durationSec <= 10)
  );

  console.log(`\n📝 ${targetScenes.length}개 씬 처리 예정 (reverse-loop)`);
  console.log(`📂 입력: ${INPUT_DIR}`);
  console.log(`📂 출력: ${OUTPUT_DIR}\n`);

  let success = 0;
  let skip = 0;
  let fail = 0;

  for (const scene of targetScenes) {
    const inputFile = path.join(INPUT_DIR, `${scene.id}.mp4`);
    const outputFile = path.join(OUTPUT_DIR, `${scene.id}.mp4`);

    console.log(`🎬 [${scene.id}]`);

    // 입력 파일 확인
    if (!fs.existsSync(inputFile)) {
      console.log(`   ⚠️  입력 파일 없음 - 스킵`);
      fail++;
      continue;
    }

    // 이미 존재하면 스킵
    if (fs.existsSync(outputFile)) {
      console.log(`   ⏭️  이미 존재 - 스킵`);
      skip++;
      continue;
    }

    // reverse loop 생성
    const result = ffmpeg
      ? createReverseLoopWithFFmpeg(ffmpeg, inputFile, outputFile)
      : createReverseLoopFrameBased(inputFile, outputFile);

    if (result) {
      console.log(`   ✅ 완료`);
      success++;
    } else {
      fail++;
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 결과");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 성공: ${success}`);
  console.log(`⏭️  스킵: ${skip}`);
  console.log(`❌ 실패: ${fail}`);
  console.log(`\n📁 출력 폴더: ${OUTPUT_DIR}`);

  if (!ffmpeg) {
    console.log("\n💡 FFmpeg 설치 방법:");
    console.log("   macOS: brew install ffmpeg");
    console.log("   Ubuntu: sudo apt install ffmpeg");
  }
}

main().catch(console.error);
