import * as fs from "fs";
import * as path from "path";
import * as jwt from "jsonwebtoken";

/**
 * Kling AI API를 사용한 자동 비디오 생성
 *
 * Access Key + Secret Key → JWT Token → API 호출
 */

// Kling API 설정
const KLING_ACCESS_KEY = "AgyY4dfbyPNaMyeR8NQ8KCK8MPMTy4k8";
const KLING_SECRET_KEY = "BnHRM4MBg9YBmJB99EJ9keCHnKfBPHKL";
const KLING_API_BASE = "https://api.klingai.com";

// 생성 설정
const VIDEO_DURATION = "5"; // 5초 또는 10초
const ASPECT_RATIO = "9:16"; // 숏폼용 세로
const MODEL = "kling-v1"; // kling-v1 (std/pro), kling-v1-5 (pro only), kling-v1-6 (pro only)
const MODE = "std"; // std (빠름, 저렴) 또는 pro (고품질)

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

interface KlingTaskResponse {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
    created_at?: number;
    updated_at?: number;
  };
}

interface KlingTaskResult {
  code: number;
  message: string;
  request_id: string;
  data: {
    task_id: string;
    task_status: string;
    task_status_msg?: string;
    task_result?: {
      videos: Array<{
        id: string;
        url: string;
        duration: string;
      }>;
    };
  };
}

/**
 * JWT 토큰 생성
 */
function generateJWT(): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    iss: KLING_ACCESS_KEY,
    exp: now + 1800, // 30분 후 만료
    nbf: now - 5, // 5초 전부터 유효
  };

  return jwt.sign(payload, KLING_SECRET_KEY, { header });
}

/**
 * Text-to-Video 태스크 생성
 */
async function createVideoTask(prompt: string): Promise<string> {
  const token = generateJWT();

  const response = await fetch(`${KLING_API_BASE}/v1/videos/text2video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model_name: MODEL,
      prompt: prompt,
      negative_prompt:
        "text, watermark, logo, caption, subtitle, blurry, distorted, low quality",
      cfg_scale: 0.5,
      mode: MODE,
      aspect_ratio: ASPECT_RATIO,
      duration: VIDEO_DURATION,
    }),
  });

  const result: KlingTaskResponse = await response.json();

  if (result.code !== 0) {
    throw new Error(`Task creation failed: ${result.message}`);
  }

  console.log(`   ✅ Task created: ${result.data.task_id}`);
  return result.data.task_id;
}

/**
 * 태스크 상태 확인
 */
async function checkTaskStatus(taskId: string): Promise<KlingTaskResult> {
  const token = generateJWT();

  const response = await fetch(
    `${KLING_API_BASE}/v1/videos/text2video/${taskId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
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
 * 태스크 완료까지 대기 (폴링)
 */
async function waitForCompletion(
  taskId: string,
  maxWaitMs: number = 600000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10초마다 확인

  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkTaskStatus(taskId);

    if (result.data.task_status === "succeed") {
      const videoUrl = result.data.task_result?.videos?.[0]?.url;
      if (videoUrl) {
        return videoUrl;
      }
      throw new Error("Video URL not found in result");
    }

    if (result.data.task_status === "failed") {
      throw new Error(`Task failed: ${result.data.task_status_msg}`);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r   ⏳ Generating... ${elapsed}s (${result.data.task_status})`);

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Task timed out");
}

/**
 * 메인 실행
 */
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎬 Kling AI 비디오 자동 생성");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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
  const results: { scene: string; status: string; file?: string }[] = [];

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
      // 1. 태스크 생성
      const taskId = await createVideoTask(scene.flowPrompt);

      // 2. 완료 대기
      const videoUrl = await waitForCompletion(taskId);
      console.log(`\n   🔗 Video URL: ${videoUrl.substring(0, 50)}...`);

      // 3. 다운로드
      console.log(`   📥 Downloading...`);
      await downloadVideo(videoUrl, outputFile);
      console.log(`   ✅ Saved: ${outputFile}`);

      results.push({ scene: scene.id, status: "success", file: outputFile });

      // API 레이트 리밋 방지 (5초 대기)
      await new Promise((resolve) => setTimeout(resolve, 5000));
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
