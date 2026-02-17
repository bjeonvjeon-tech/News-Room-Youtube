/**
 * 적나라브리핑 2.0 — Gemini 3 Pro 씬 이미지 생성 (I2V용)
 *
 * scenes-short.json의 프롬프트를 사용하여 씬별 이미지 생성
 * 스타일: 한국형 신화 웹툰 / 시네마틱 디지털 잉크 선화
 * 출력: public/images/scenes/scene01.jpg ~ sceneN.jpg
 */

import fs from "fs";
import path from "path";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

const OUTPUT_DIR = path.join(__dirname, "../../public/images/scenes");

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

/**
 * flowPrompt에서 이미지 생성용 프롬프트 추출
 * (Camera, Color palette 부분 제거하고 Scene 부분만 사용)
 */
function extractImagePrompt(flowPrompt: string): string {
  // "Scene:" 부분 추출
  const sceneMatch = flowPrompt.match(/Scene:\s*([^]*?)(?=Camera:|$)/i);
  if (sceneMatch) {
    return sceneMatch[1].trim();
  }
  // 없으면 전체 사용 (처음 500자)
  return flowPrompt.substring(0, 500);
}

async function generateImage(
  prompt: string,
  filename: string
): Promise<boolean> {
  console.log(`\n🎨 Generating: ${filename}`);
  console.log(`   📝 Prompt: ${prompt.substring(0, 80)}...`);

  const fullPrompt = `Generate a high-quality illustration image in 9:16 portrait aspect ratio (1080x1920 pixels).

Style requirements:
- Korean mythical webtoon (manhwa) style — Cinematic digital ink lineart
- Clean sharp contours, disciplined line-weight hierarchy (bold outer silhouettes, medium interior forms, ultra-thin facial lines)
- Filmic cel-to-painterly hybrid shading with clearly defined shadow shapes and soft gradient rolloff
- Rich luminous colors with confident saturation, 1-2 vivid accent colors (bright but never neon)
- Soft directional lighting with gentle falloff, practical-inspired bounce light
- NO photorealistic rendering, NO text, captions, logos, or watermarks
- Consistent character model across all scenes

Scene: ${prompt}`;

  const body = {
    contents: [
      {
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   ❌ API Error: ${response.status}`);
      console.error(`   ${errorText.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    const candidates = data.candidates;

    if (!candidates || candidates.length === 0) {
      console.error(`   ❌ No candidates returned`);
      return false;
    }

    const parts = candidates[0].content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const filePath = path.join(OUTPUT_DIR, `${filename}.jpg`);
        fs.writeFileSync(filePath, Buffer.from(imageData, "base64"));
        console.log(`   ✅ Saved: ${filename}.jpg`);
        return true;
      }
    }

    console.error(`   ❌ No image data in response`);
    return false;
  } catch (err) {
    console.error(`   ❌ Error:`, err);
    return false;
  }
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎨 Gemini 3 Pro 씬 이미지 생성 (I2V용)");
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
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results: { scene: string; status: string }[] = [];

  for (const scene of scenes) {
    const outputFile = path.join(OUTPUT_DIR, `${scene.id}.jpg`);

    // 이미 존재하면 스킵
    if (fs.existsSync(outputFile)) {
      console.log(`⏭️  [${scene.id}] 이미 존재함 - 스킵`);
      results.push({ scene: scene.id, status: "skipped" });
      continue;
    }

    const imagePrompt = extractImagePrompt(scene.flowPrompt);
    const success = await generateImage(imagePrompt, scene.id);
    results.push({ scene: scene.id, status: success ? "success" : "failed" });

    // API 레이트 리밋 방지 (3초 대기)
    await new Promise((resolve) => setTimeout(resolve, 3000));
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
    console.log("🎉 모든 이미지 생성 완료!");
    console.log("   다음: npx ts-node src/JuknaraBriefing/generateVideos-i2v.ts");
  }
}

main();
