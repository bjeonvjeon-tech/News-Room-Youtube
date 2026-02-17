/**
 * NanoBanana (Gemini) 이미지 생성 스크립트 (숏폼용 9:16)
 *
 * 사용법: npx ts-node src/JuknaraBriefing/generateImages-short.ts
 *
 * ⚠️ 고정 포맷:
 *   - 비율: 9:16 portrait (1080x1920)
 *   - 출력: public/images-short/
 *   - script-short.ts에서 챕터 읽음
 */

import fs from "fs";
import path from "path";
import { SCRIPT_SHORT } from "./script-short";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${API_KEY}`;

const OUTPUT_DIR = path.join(__dirname, "../../public/images-short");

async function generateImage(
  prompt: string,
  filename: string
): Promise<void> {
  console.log(`Generating: ${filename}...`);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Generate an image: ${prompt}. The image should be in 9:16 portrait aspect ratio (1080x1920), suitable for vertical short-form video format like TikTok or YouTube Shorts.`,
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

  for (const chapter of SCRIPT_SHORT) {
    await generateImage(chapter.imagePrompt, chapter.id);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\nAll short-form images generated!");
}

main();
