#!/usr/bin/env npx ts-node
/**
 * 숏폼 클립별 Veo 비디오 프롬프트 생성기
 *
 * clips-short.json + script-short.ts를 읽어서 각 8초 오디오 클립에 대응하는
 * 비디오 프롬프트를 Gemini API로 생성합니다.
 *
 * 출력: videoPrompts-short.json
 *
 * 사용법: npx ts-node src/StickFigureEconomics/generateVideoPrompts-short.ts
 */

import fs from "fs";
import path from "path";
import { SCRIPT_SHORT } from "./script-short";
import type { AudioClipShort } from "./splitAudio-short";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const CLIPS_JSON = path.join(__dirname, "clips-short.json");
const OUTPUT_JSON = path.join(__dirname, "videoPrompts-short.json");

const CELEBRITY_NAMES = [
  "Ray Dalio", "레이 달리오", "Dalio",
  "David Friedberg", "데이비드 프리드버그",
  "Bridgewater", "브릿지워터",
  "Samsung", "삼성",
  "Naval Ravikant", "나발 라비칸트",
];

function stripCelebrityNames(text: string): string {
  let result = text;
  for (const name of CELEBRITY_NAMES) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, "a wise elderly man");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

export interface VideoPromptShort {
  clipId: string;
  clipIndex: number;
  chapterId: string;
  chapterTitle: string;
  narrationExcerpt: string;
  videoPrompt: string;
  durationSec: number;
}

async function callGemini(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512,
      },
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      if (attempt < retries - 1 && (res.status === 429 || res.status >= 500)) {
        console.warn(`  ⚠️ API ${res.status}, 재시도 ${attempt + 2}/${retries}...`);
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw new Error(`Gemini API Error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || text.trim().length < 20) {
      if (attempt < retries - 1) {
        console.warn(`  ⚠️ Empty/short response, 재시도 ${attempt + 2}/${retries}...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw new Error("No usable text in Gemini response after retries");
    }
    return text.trim();
  }
  throw new Error("All retries exhausted");
}

function getChapterForClip(
  clip: AudioClipShort,
  chapterTimeline: { id: string; title: string; narration: string; imagePrompt: string; startSec: number; endSec: number }[]
) {
  const clipMid = (clip.startSec + clip.endSec) / 2;
  for (const ch of chapterTimeline) {
    if (clipMid >= ch.startSec && clipMid < ch.endSec) return ch;
  }
  return chapterTimeline[chapterTimeline.length - 1];
}

async function main() {
  if (!fs.existsSync(CLIPS_JSON)) {
    console.error("❌ clips-short.json이 없습니다. splitAudio-short.ts를 먼저 실행하세요.");
    process.exit(1);
  }

  const clips: AudioClipShort[] = JSON.parse(fs.readFileSync(CLIPS_JSON, "utf-8"));

  const totalChars = SCRIPT_SHORT.reduce((sum, ch) => sum + ch.script.length, 0);
  const totalDuration = clips[clips.length - 1].endSec;
  let currentSec = 0;

  const chapterTimeline = SCRIPT_SHORT.map((ch) => {
    const charRatio = ch.script.length / totalChars;
    const chDuration = charRatio * totalDuration;
    const start = currentSec;
    currentSec += chDuration;
    return {
      id: ch.id,
      title: ch.title,
      narration: ch.script,
      imagePrompt: ch.imagePrompt,
      startSec: start,
      endSec: currentSec,
    };
  });

  console.log(`\n🎬 숏폼 클립별 비디오 프롬프트 생성 시작`);
  console.log(`📊 총 클립: ${clips.length}개`);
  console.log(`📊 챕터: ${SCRIPT_SHORT.length}개\n`);

  const videoPrompts: VideoPromptShort[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const chapter = getChapterForClip(clip, chapterTimeline);

    console.log(`🎬 [${i + 1}/${clips.length}] ${clip.id} → ${chapter.id}: ${chapter.title}`);

    // 나레이션에서 이 클립 시간대에 해당하는 부분 추정
    const narrationLength = chapter.narration.length;
    const chapterDuration = chapter.endSec - chapter.startSec;
    const clipStartInChapter = Math.max(0, clip.startSec - chapter.startSec);
    const clipEndInChapter = Math.min(chapterDuration, clip.endSec - chapter.startSec);
    const charStart = Math.floor((clipStartInChapter / chapterDuration) * narrationLength);
    const charEnd = Math.ceil((clipEndInChapter / chapterDuration) * narrationLength);
    const narrationSlice = chapter.narration.substring(charStart, charEnd);

    const geminiPrompt = `Write a single video generation prompt for Veo AI video generator.

CONTEXT:
- This is clip ${i + 1} of ${clips.length} in a Korean educational short-form video (9:16 portrait, mobile)
- Chapter: "${chapter.title}"
- This specific 8-second clip's narration: "${narrationSlice}"
- Reference image description: "${chapter.imagePrompt}"

REQUIREMENTS:
- Write ONE detailed English paragraph (3-5 sentences) describing the exact visual scene
- Describe specific objects, backgrounds, lighting, colors, and camera movement
- Use cinematic language: "slow dolly in", "gentle pan", "rack focus", "ambient light"
- The scene should visually represent the narration content
- Do NOT include any real person names - use generic descriptions like "a wise elderly man with glasses"
- Do NOT include any text, captions, UI elements, or watermarks in the scene
- Format: 9:16 vertical portrait, cinematic quality
- Style: Clean minimalist illustration with warm watercolor textures, muted neutral tones with mint accents

OUTPUT: Write ONLY the video prompt text, nothing else. No quotes, no JSON, no explanations.`;

    try {
      let rawText = await callGemini(geminiPrompt);

      // Clean up: remove any wrapping quotes, markdown, or prefixes
      rawText = rawText.replace(/^```[\s\S]*?```$/gm, "").trim();
      rawText = rawText.replace(/^["']|["']$/g, "").trim();
      rawText = rawText.replace(/^(Video prompt:|Prompt:|Here is|Here's)[\s:]*/i, "").trim();

      let prompt = stripCelebrityNames(rawText);

      // Validate the prompt is substantial
      if (prompt.length < 50) {
        throw new Error(`Prompt too short (${prompt.length} chars): "${prompt}"`);
      }

      // Append quality suffix
      prompt += " Cinematic 4K quality, smooth motion, professional lighting. 9:16 vertical portrait composition.";

      const vp: VideoPromptShort = {
        clipId: clip.id,
        clipIndex: clip.index,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        narrationExcerpt: narrationSlice.substring(0, 80),
        videoPrompt: prompt,
        durationSec: clip.durationSec,
      };

      videoPrompts.push(vp);
      console.log(`  ✅ 프롬프트 (${prompt.length}자): ${prompt.substring(0, 120)}...`);
    } catch (err: any) {
      console.error(`  ❌ 실패: ${err.message}`);
      // Fallback: imagePrompt 기반
      let fallback = stripCelebrityNames(chapter.imagePrompt);
      fallback += " Cinematic slow motion, gentle camera dolly, warm ambient lighting. 9:16 vertical portrait, minimalist illustration style.";
      videoPrompts.push({
        clipId: clip.id,
        clipIndex: clip.index,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        narrationExcerpt: narrationSlice.substring(0, 80),
        videoPrompt: fallback,
        durationSec: clip.durationSec,
      });
      console.log(`  ⚠️ Fallback 사용 (${fallback.length}자): ${fallback.substring(0, 120)}...`);
    }

    if (i < clips.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(videoPrompts, null, 2));
  console.log(`\n📋 videoPrompts-short.json 저장 완료 (${videoPrompts.length}개 프롬프트)`);
  console.log(`📁 ${OUTPUT_JSON}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
