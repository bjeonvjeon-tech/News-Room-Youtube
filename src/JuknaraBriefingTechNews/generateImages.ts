/**
 * Gemini 2.5 Pro 이미지 생성 스크립트
 *
 * 모델: gemini-2.5-pro
 * API: Google Generative Language API v1beta
 *
 * 사용법: npx ts-node src/JuknaraBriefing/generateImages.ts
 *
 * script.ts의 각 챕터 imagePrompt를 사용해 이미지를 생성하고
 * public/images/ 폴더에 저장합니다.
 *
 * 새로운 주제로 영상을 만들 때:
 * 1. script.ts의 imagePrompt를 수정
 * 2. 이 스크립트 실행
 * 3. public/images/ 폴더에 이미지 생성 확인
 */

import fs from "fs";
import path from "path";
import { SCRIPT } from "./script";

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

const OUTPUT_DIR = path.join(__dirname, "../../public/images");

async function generateImage(prompt: string, filename: string): Promise<void> {
  console.log(`Generating: ${filename}...`);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate an image: ${prompt}. The image should be in 16:9 landscape aspect ratio (1920x1080), suitable for widescreen video format.`,
          },
        ],
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
      console.error(`API Error for ${filename}: ${response.status} ${errorText}`);
      return;
    }

    const data = await response.json();
    const candidates = data.candidates;

    if (!candidates || candidates.length === 0) {
      console.error(`No candidates returned for ${filename}`);
      return;
    }

    const parts = candidates[0].content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const filePath = path.join(OUTPUT_DIR, `${filename}.jpg`);
        fs.writeFileSync(filePath, Buffer.from(imageData, "base64"));
        console.log(`Saved: ${filePath}`);
        return;
      }
    }

    console.error(`No image data found in response for ${filename}`);
  } catch (err) {
    console.error(`Error generating ${filename}:`, err);
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const chapter of SCRIPT) {
    await generateImage(chapter.imagePrompt, chapter.id);
    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\nAll images generated!");
}

main();
