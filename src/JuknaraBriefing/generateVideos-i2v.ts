import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { fal } from "@fal-ai/client";

/**
 * Wan 2.5 Image-to-Video - fal.ai API
 *
 * Opening/Closing: 5초 클립을 frame-stitch로 이어붙임 (seamless)
 *   - 마지막 프레임 추출 → 다음 클립의 시작 이미지로 사용
 *   - 결과물은 scenes-extended/에 직접 저장
 *
 * Body: 단일 5초 클립 생성 (이후 reverse-loop으로 10초 확장)
 *   - 결과물은 scenes/에 저장
 *
 * 가격 (5초 기준, num_frames=81):
 *   - 480p: ~$0.20
 *   - 720p: ~$0.40
 */

// fal.ai API 설정
const FAL_API_KEY = "afa50a32-22ff-4ad2-abc0-9fa8f880bc29:9e0e2560c923871584de6ae1a5a54d6e";

// 생성 설정
const RESOLUTION = "480p" as const; // "480p" 또는 "720p"
const MODEL = "fal-ai/wan-25-preview/image-to-video";
const NUM_FRAMES = 81; // 81=5초 (최대)
const VIDEO_DURATION_SEC = 5; // 비디오 길이 (초)

// 가격 계산 (5초 기준)
const PRICE_PER_VIDEO: Record<string, number> = {
  "480p": 0.20,
  "720p": 0.40,
};

interface SceneInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  sceneType?: "opening" | "body" | "closing";
  startSec: number;
  endSec: number;
  durationSec: number;
  flowPrompt: string;
  videoFile: string;
  videoMode?: "frame-stitch" | "reverse-loop";
  clipsNeeded?: number;
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
 * FFmpeg 경로 찾기
 */
function findFFmpeg(): string | null {
  const possiblePaths = [
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "ffmpeg",
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
 * flowPrompt에서 모션 프롬프트 추출
 */
function extractMotionPrompt(flowPrompt: string): string {
  // Camera 부분 추출
  const cameraMatch = flowPrompt.match(/Camera:\s*([^\n]+)/i);
  const camera = cameraMatch ? cameraMatch[1].trim() : "slow cinematic movement";

  // Scene 설명 추출
  const sceneMatch = flowPrompt.match(/Scene:\s*([^]*?)(?=Camera:|$)/i);
  const scene = sceneMatch ? sceneMatch[1].trim().substring(0, 200) : "";

  return `${camera}. Gentle ambient motion, subtle movement. ${scene.substring(0, 100)}`;
}

/**
 * 이미지를 Base64로 변환
 */
function imageToBase64(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString("base64");
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Image-to-Video 생성 (단일 5초 클립)
 */
async function generateVideo(imagePath: string, motionPrompt: string): Promise<string> {
  console.log(`   🎬 Generating with Wan 2.5 I2V...`);

  const imageBase64 = imageToBase64(imagePath);

  const result = await fal.subscribe(MODEL, {
    input: {
      image_url: imageBase64,
      prompt: motionPrompt,
      resolution: RESOLUTION,
      num_frames: NUM_FRAMES, // 81=5초 (최대)
      enable_safety_checker: false,
    } as any,
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
 * 비디오의 마지막 프레임 추출 (FFmpeg 사용)
 * Opening/Closing frame-stitch에서 다음 클립의 시작 이미지로 사용
 */
function extractLastFrame(ffmpeg: string, videoPath: string, outputImagePath: string): boolean {
  try {
    execSync(
      `${ffmpeg} -y -sseof -0.1 -i "${videoPath}" -frames:v 1 -q:v 2 "${outputImagePath}" -loglevel warning`,
      { stdio: "inherit" }
    );
    return fs.existsSync(outputImagePath);
  } catch (error) {
    console.error(`   ❌ 프레임 추출 실패: ${error}`);
    return false;
  }
}

/**
 * 여러 클립을 하나로 이어붙이기 (FFmpeg concat)
 */
function concatenateClips(ffmpeg: string, clips: string[], outputPath: string): boolean {
  if (clips.length === 1) {
    fs.copyFileSync(clips[0], outputPath);
    return true;
  }

  const tempList = outputPath.replace(".mp4", "_concat_list.txt");
  try {
    const listContent = clips.map((c) => `file '${c}'`).join("\n");
    fs.writeFileSync(tempList, listContent);

    execSync(
      `${ffmpeg} -y -f concat -safe 0 -i "${tempList}" -c copy "${outputPath}" -loglevel warning`,
      { stdio: "inherit" }
    );

    fs.unlinkSync(tempList);
    return fs.existsSync(outputPath);
  } catch (error) {
    console.error(`   ❌ 클립 합치기 실패: ${error}`);
    if (fs.existsSync(tempList)) fs.unlinkSync(tempList);
    return false;
  }
}

/**
 * Opening/Closing: Frame-stitch 방식으로 seamless 영상 생성
 *
 * 1. 씬 이미지로 첫 5초 클립 생성
 * 2. 마지막 프레임 추출 → 다음 클립의 시작 이미지
 * 3. 필요한 만큼 반복
 * 4. 모든 클립을 하나로 이어붙임
 * 5. scenes-extended/에 직접 저장
 */
async function generateFrameStitchedVideo(
  scene: SceneInfo,
  imagePath: string,
  scenesDir: string,
  extendedDir: string,
  ffmpeg: string,
  pricePerVideo: number
): Promise<{ status: string; cost: number }> {
  const clipsNeeded = scene.clipsNeeded || Math.ceil(scene.durationSec / VIDEO_DURATION_SEC);
  const tempDir = path.join(extendedDir, `temp-stitch-${scene.id}`);
  fs.mkdirSync(tempDir, { recursive: true });

  console.log(`   🔗 Frame-stitch: ${clipsNeeded}개 클립 필요 (${clipsNeeded * 5}초)`);

  const clips: string[] = [];
  let currentImage = imagePath;
  let totalCost = 0;

  try {
    for (let i = 0; i < clipsNeeded; i++) {
      const clipPath = path.join(tempDir, `clip_${String(i).padStart(2, "0")}.mp4`);
      console.log(`\n   📎 클립 ${i + 1}/${clipsNeeded}`);

      const motionPrompt = extractMotionPrompt(scene.flowPrompt);
      console.log(`   📝 Motion: ${motionPrompt.substring(0, 60)}...`);

      // I2V 생성
      const videoUrl = await generateVideo(currentImage, motionPrompt);
      console.log(`   🔗 URL: ${videoUrl.substring(0, 60)}...`);

      // 다운로드
      console.log(`   📥 Downloading clip ${i + 1}...`);
      await downloadVideo(videoUrl, clipPath);
      clips.push(clipPath);
      totalCost += pricePerVideo;

      // 마지막 클립이 아니면 → 마지막 프레임 추출 (다음 클립의 시작 이미지)
      if (i < clipsNeeded - 1) {
        const lastFramePath = path.join(tempDir, `frame_${String(i).padStart(2, "0")}.jpg`);
        console.log(`   🖼️  마지막 프레임 추출 → 다음 클립 시작 이미지`);
        if (!extractLastFrame(ffmpeg, clipPath, lastFramePath)) {
          console.error(`   ❌ 프레임 추출 실패 - 원본 이미지로 대체`);
          // 실패 시 원본 이미지 사용
        } else {
          currentImage = lastFramePath;
        }
      }

      // API 레이트 리밋 방지 (2초 대기)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 첫 번째 클립은 scenes/에도 저장 (호환성)
    const singleClipPath = path.join(scenesDir, `${scene.id}.mp4`);
    if (!fs.existsSync(singleClipPath)) {
      fs.copyFileSync(clips[0], singleClipPath);
    }

    // 모든 클립 이어붙이기 → scenes-extended/에 저장
    const stitchedPath = path.join(extendedDir, `${scene.id}.mp4`);
    console.log(`\n   📦 ${clips.length}개 클립 이어붙이기...`);
    if (concatenateClips(ffmpeg, clips, stitchedPath)) {
      console.log(`   ✅ Frame-stitch 완료: ${scene.id}.mp4 (${clipsNeeded * 5}초)`);
    } else {
      console.error(`   ❌ Frame-stitch 합치기 실패`);
      return { status: "failed", cost: totalCost };
    }

    // 임시 폴더 정리
    fs.rmSync(tempDir, { recursive: true, force: true });

    return { status: "success", cost: totalCost };
  } catch (error) {
    console.error(`   ❌ Frame-stitch 오류: ${error}`);
    // 임시 폴더 정리
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    return { status: "failed", cost: totalCost };
  }
}

/**
 * Body: 단일 5초 I2V 클립 생성 (이후 reverse-loop으로 10초 확장)
 */
async function generateSingleVideo(
  scene: SceneInfo,
  imagePath: string,
  outputDir: string,
  pricePerVideo: number
): Promise<{ status: string; cost: number }> {
  const outputFile = path.join(outputDir, `${scene.id}.mp4`);

  try {
    const motionPrompt = extractMotionPrompt(scene.flowPrompt);
    console.log(`   📝 Motion: ${motionPrompt.substring(0, 60)}...`);

    // I2V 생성
    const videoUrl = await generateVideo(imagePath, motionPrompt);
    console.log(`   🔗 URL: ${videoUrl.substring(0, 60)}...`);

    // 다운로드
    console.log(`   📥 Downloading...`);
    await downloadVideo(videoUrl, outputFile);
    console.log(`   ✅ Saved: ${scene.id}.mp4`);

    return { status: "success", cost: pricePerVideo };
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
    return { status: "failed", cost: 0 };
  }
}

/**
 * 메인 실행
 */
async function main() {
  const pricePerVideo = PRICE_PER_VIDEO[RESOLUTION];

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎬 Wan 2.5 Image-to-Video 변환");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📦 모델: ${MODEL}`);
  console.log(`🖥️  해상도: ${RESOLUTION}`);
  console.log(`⏱️  클립 길이: ${VIDEO_DURATION_SEC}초 (${NUM_FRAMES} frames)`);
  console.log(`🔗 Opening/Closing: frame-stitch (5초 클립 이어붙이기)`);
  console.log(`🔄 Body: 단일 5초 (이후 reverse-loop → 10초)\n`);

  // API 키 확인
  if (!FAL_API_KEY || FAL_API_KEY.length < 10) {
    console.error("❌ FAL_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  // FFmpeg 확인 (frame-stitch에 필요)
  const ffmpeg = findFFmpeg();
  if (ffmpeg) {
    console.log(`✅ FFmpeg 발견: ${ffmpeg}`);
  } else {
    console.log("⚠️  FFmpeg 미발견 - Opening/Closing frame-stitch에 필요합니다.");
    console.log("   macOS: brew install ffmpeg");
    console.log("   Ubuntu: sudo apt install ffmpeg");
  }

  // scenes-short.json 로드
  const scenesPath = path.join(__dirname, "scenes-short.json");
  if (!fs.existsSync(scenesPath)) {
    console.error("❌ scenes-short.json not found");
    process.exit(1);
  }

  const scenes: SceneInfo[] = JSON.parse(fs.readFileSync(scenesPath, "utf-8"));
  console.log(`📝 ${scenes.length}개 씬 로드됨`);

  // 씬 타입별 분류
  const openingClosing = scenes.filter(
    (s) => s.sceneType === "opening" || s.sceneType === "closing"
  );
  const body = scenes.filter(
    (s) => !s.sceneType || s.sceneType === "body"
  );
  console.log(`   🔗 Opening/Closing (frame-stitch): ${openingClosing.length}개`);
  console.log(`   🔄 Body (single clip): ${body.length}개`);

  // 비용 예측
  const bodyClips = body.length;
  const stitchClips = openingClosing.reduce(
    (acc, s) => acc + (s.clipsNeeded || Math.ceil(s.durationSec / VIDEO_DURATION_SEC)),
    0
  );
  const totalClips = bodyClips + stitchClips;
  console.log(`💰 예상 비용: $${(pricePerVideo * totalClips).toFixed(2)} (${totalClips}개 클립)\n`);

  // 이미지 폴더 확인
  const imageDir = path.join(__dirname, "../../public/images/scenes");
  if (!fs.existsSync(imageDir)) {
    console.error("❌ 이미지 폴더 없음: public/images/scenes/");
    console.log("   먼저 generateSceneImages.ts를 실행하세요.");
    process.exit(1);
  }

  // 출력 폴더 생성
  const scenesDir = path.join(__dirname, "../../public/videos/scenes");
  const extendedDir = path.join(__dirname, "../../public/videos/scenes-extended");
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.mkdirSync(extendedDir, { recursive: true });

  // 각 씬별 비디오 생성
  const results: { scene: string; status: string; cost?: number; mode?: string }[] = [];
  let totalCost = 0;

  for (const scene of scenes) {
    const imagePath = path.join(imageDir, `${scene.id}.jpg`);
    const isStitch = scene.sceneType === "opening" || scene.sceneType === "closing";

    // 이미지 존재 확인
    if (!fs.existsSync(imagePath)) {
      console.log(`\n⚠️  [${scene.id}] 이미지 없음 - 스킵`);
      results.push({ scene: scene.id, status: "no_image" });
      continue;
    }

    // 이미 완료된 경우 스킵
    if (isStitch) {
      const extendedFile = path.join(extendedDir, `${scene.id}.mp4`);
      if (fs.existsSync(extendedFile)) {
        console.log(`\n⏭️  [${scene.id}] stitched 비디오 이미 존재 - 스킵`);
        results.push({ scene: scene.id, status: "skipped", mode: "frame-stitch" });
        continue;
      }
    } else {
      const singleFile = path.join(scenesDir, `${scene.id}.mp4`);
      if (fs.existsSync(singleFile)) {
        console.log(`\n⏭️  [${scene.id}] 비디오 이미 존재 - 스킵`);
        results.push({ scene: scene.id, status: "skipped", mode: "single" });
        continue;
      }
    }

    const typeLabel = isStitch ? "🔗 frame-stitch" : "🎨 body";
    console.log(`\n🎬 [${scene.id}] ${scene.title} (${typeLabel})`);

    if (isStitch) {
      // Opening/Closing: frame-stitch
      if (!ffmpeg) {
        console.error(`   ❌ FFmpeg 필요 (frame-stitch) - 스킵`);
        results.push({ scene: scene.id, status: "failed", mode: "frame-stitch" });
        continue;
      }
      const result = await generateFrameStitchedVideo(
        scene, imagePath, scenesDir, extendedDir, ffmpeg, pricePerVideo
      );
      totalCost += result.cost;
      results.push({ scene: scene.id, status: result.status, cost: result.cost, mode: "frame-stitch" });
    } else {
      // Body: 단일 5초 클립
      const result = await generateSingleVideo(scene, imagePath, scenesDir, pricePerVideo);
      totalCost += result.cost;
      results.push({ scene: scene.id, status: result.status, cost: result.cost, mode: "single" });

      // API 레이트 리밋 방지 (2초 대기)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // 결과 요약
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 결과 요약");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const success = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const noImage = results.filter((r) => r.status === "no_image").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`✅ 성공: ${success}`);
  console.log(`⏭️  스킵: ${skipped}`);
  console.log(`⚠️  이미지없음: ${noImage}`);
  console.log(`❌ 실패: ${failed}`);
  console.log(`💰 총 비용: $${totalCost.toFixed(2)}`);

  // 모드별 상세
  const stitchResults = results.filter((r) => r.mode === "frame-stitch");
  const singleResults = results.filter((r) => r.mode === "single");
  console.log(`\n🔗 Frame-stitch (Opening/Closing): ${stitchResults.filter((r) => r.status === "success").length}/${stitchResults.length}`);
  console.log(`🔄 Single clip (Body): ${singleResults.filter((r) => r.status === "success").length}/${singleResults.length}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (success + skipped === scenes.length) {
    console.log("🎉 모든 비디오 준비 완료!");
    console.log("   다음 단계: Body 씬 reverse-loop 확장");
    console.log("   npx ts-node src/JuknaraBriefing/createReverseLoop.ts");
  }
}

main().catch(console.error);
