import * as fs from "fs";
import * as path from "path";
import { fal } from "@fal-ai/client";

/**
 * Wan 2.5 Image-to-Video - fal.ai API
 *
 * 가격 (5초 기준):
 *   - 480p: $0.20
 *   - 720p: $0.40
 *
 * 10개 씬 (480p) = $2.00 (최저가!)
 */

// fal.ai API 설정
const FAL_API_KEY = "afa50a32-22ff-4ad2-abc0-9fa8f880bc29:9e0e2560c923871584de6ae1a5a54d6e";

// 생성 설정
const RESOLUTION = "480p" as const; // "480p" 또는 "720p"
const MODEL = "fal-ai/wan-25-preview/image-to-video";

// 가격 계산
const PRICE_PER_VIDEO: Record<string, number> = {
  "480p": 0.20,
  "720p": 0.40,
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
 * Image-to-Video 생성
 */
async function generateVideo(imagePath: string, motionPrompt: string): Promise<string> {
  console.log(`   🎬 Generating with Wan 2.5 I2V...`);

  const imageBase64 = imageToBase64(imagePath);

  const result = await fal.subscribe(MODEL, {
    input: {
      image_url: imageBase64,
      prompt: motionPrompt,
      resolution: RESOLUTION,
      enable_safety_checker: false,
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
  const pricePerVideo = PRICE_PER_VIDEO[RESOLUTION];

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎬 Wan 2.5 Image-to-Video 변환 (최저가)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📦 모델: ${MODEL}`);
  console.log(`🖥️  해상도: ${RESOLUTION}`);
  console.log(`💰 예상 비용: $${(pricePerVideo * 10).toFixed(2)} (10개 씬)\n`);

  // API 키 확인
  if (!FAL_API_KEY || FAL_API_KEY.length < 10) {
    console.error("❌ FAL_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  // scenes-short.json 로드
  const scenesPath = path.join(__dirname, "scenes-short.json");
  if (!fs.existsSync(scenesPath)) {
    console.error("❌ scenes-short.json not found");
    process.exit(1);
  }

  const scenes: SceneInfo[] = JSON.parse(fs.readFileSync(scenesPath, "utf-8"));
  console.log(`📝 ${scenes.length}개 씬 로드됨`);

  // 이미지 폴더 확인
  const imageDir = path.join(__dirname, "../../public/images/scenes");
  if (!fs.existsSync(imageDir)) {
    console.error("❌ 이미지 폴더 없음: public/images/scenes/");
    console.log("   먼저 generateSceneImages.ts를 실행하세요.");
    process.exit(1);
  }

  // 출력 폴더 생성
  const outputDir = path.join(__dirname, "../../public/videos/scenes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 각 씬별 비디오 생성
  const results: { scene: string; status: string; cost?: number }[] = [];
  let totalCost = 0;

  for (const scene of scenes) {
    const imagePath = path.join(imageDir, `${scene.id}.jpg`);
    const outputFile = path.join(outputDir, `${scene.id}.mp4`);

    // 이미지 존재 확인
    if (!fs.existsSync(imagePath)) {
      console.log(`\n⚠️  [${scene.id}] 이미지 없음 - 스킵`);
      results.push({ scene: scene.id, status: "no_image" });
      continue;
    }

    // 비디오 이미 존재하면 스킵
    if (fs.existsSync(outputFile)) {
      console.log(`\n⏭️  [${scene.id}] 비디오 이미 존재 - 스킵`);
      results.push({ scene: scene.id, status: "skipped" });
      continue;
    }

    console.log(`\n🎬 [${scene.id}] ${scene.title}`);

    try {
      const motionPrompt = extractMotionPrompt(scene.flowPrompt);
      console.log(`   📝 Motion: ${motionPrompt.substring(0, 60)}...`);

      // 1. I2V 생성
      const videoUrl = await generateVideo(imagePath, motionPrompt);
      console.log(`   🔗 URL: ${videoUrl.substring(0, 60)}...`);

      // 2. 다운로드
      console.log(`   📥 Downloading...`);
      await downloadVideo(videoUrl, outputFile);
      console.log(`   ✅ Saved: ${scene.id}.mp4`);

      totalCost += pricePerVideo;
      results.push({ scene: scene.id, status: "success", cost: pricePerVideo });

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
  const noImage = results.filter((r) => r.status === "no_image").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`✅ 성공: ${success}`);
  console.log(`⏭️  스킵: ${skipped}`);
  console.log(`⚠️  이미지없음: ${noImage}`);
  console.log(`❌ 실패: ${failed}`);
  console.log(`💰 총 비용: $${totalCost.toFixed(2)}`);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  if (success + skipped === scenes.length) {
    console.log("🎉 모든 비디오 준비 완료!");
    console.log("   npx remotion render StickFigureEconomicsShort out/final.mp4");
  }
}

main().catch(console.error);
