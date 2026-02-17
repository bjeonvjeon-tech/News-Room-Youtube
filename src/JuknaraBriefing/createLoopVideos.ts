import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

/**
 * 5초 영상을 정방향 + 역방향으로 10초 영상으로 변환
 * Remotion 내장 FFmpeg 사용
 */

const VIDEO_DIR = path.join(__dirname, "../../public/videos/scenes");

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔄 5초 → 10초 Loop 변환 (정방향 + 역방향)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // scene01.mp4 ~ scene10.mp4 처리
  for (let i = 1; i <= 10; i++) {
    const sceneId = `scene${i.toString().padStart(2, "0")}`;
    const inputFile = path.join(VIDEO_DIR, `${sceneId}.mp4`);
    const tempReverse = path.join(VIDEO_DIR, `${sceneId}_reverse.mp4`);
    const outputFile = path.join(VIDEO_DIR, `${sceneId}_loop.mp4`);

    if (!fs.existsSync(inputFile)) {
      console.log(`⚠️  [${sceneId}] 원본 없음 - 스킵`);
      continue;
    }

    // 이미 loop 버전이 있으면 스킵
    if (fs.existsSync(outputFile)) {
      console.log(`⏭️  [${sceneId}] 이미 존재 - 스킵`);
      continue;
    }

    console.log(`🔄 [${sceneId}] 변환 중...`);

    try {
      // 1. 역방향 영상 생성
      execSync(
        `npx remotion ffmpeg -i "${inputFile}" -vf reverse "${tempReverse}" -y`,
        { stdio: "pipe" }
      );

      // 2. 정방향 + 역방향 합치기 (concat)
      const concatList = path.join(VIDEO_DIR, `${sceneId}_concat.txt`);
      fs.writeFileSync(
        concatList,
        `file '${inputFile}'\nfile '${tempReverse}'`
      );

      execSync(
        `npx remotion ffmpeg -f concat -safe 0 -i "${concatList}" -c copy "${outputFile}" -y`,
        { stdio: "pipe" }
      );

      // 3. 임시 파일 정리
      fs.unlinkSync(tempReverse);
      fs.unlinkSync(concatList);

      console.log(`   ✅ ${sceneId}_loop.mp4 생성 완료`);
    } catch (error) {
      console.error(`   ❌ 오류: ${error}`);
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 완료! scenes-short.json의 videoFile을 _loop.mp4로 변경하세요");
}

main().catch(console.error);
