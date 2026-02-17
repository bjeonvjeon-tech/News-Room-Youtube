#!/usr/bin/env npx ts-node
/**
 * 클립별 Veo 비디오 프롬프트 생성기
 *
 * clips.json + script.ts를 읽어서 각 8초 오디오 클립에 대응하는
 * 비디오 프롬프트를 Gemini API로 생성합니다.
 *
 * 출력: videoPrompts.json (각 클립의 video prompt)
 *
 * 로직:
 *   1. clips.json에서 클립 타임라인 읽기
 *   2. script.ts에서 전체 나레이션 + 챕터 정보 읽기
 *   3. 각 클립의 시간대에 해당하는 나레이션 구간을 매칭
 *   4. Gemini에게 해당 나레이션 → 영상 프롬프트 변환 요청
 *   5. videoPrompts.json 저장
 *
 * 사용법: npx ts-node src/StickFigureEconomics/generateVideoPrompts.ts
 */

import fs from "fs";
import path from "path";
import { SCRIPT } from "./script";
import type { AudioClip } from "./splitAudio";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

const CLIPS_JSON = path.join(__dirname, "clips.json");
const OUTPUT_JSON = path.join(__dirname, "videoPrompts.json");

// ── Master Prompts (same as generateScript.ts) ──
const MASTER_CHAR = `Minimalistic stick-figure animation, clean lines, limited colors (white, black, gray, mint). Inspired by calm morning light aesthetic. Soft shadows, cozy interiors, props and outfit that fit for the story.`;

const MASTER_STYLE = `Warm editorial cartoon animation with light watercolor texture; heavy outer contours, mid-weight interior seams. Shading uses soft wash gradients. Color discipline: muted cool neutrals with clear value separation, plus one small warm accent family (mint). Consistent character model across all scenes, no on-screen text, captions, logos, or watermarks.`;

// ── Celebrity name filtering (same as generateVideos.ts) ──
const CELEBRITY_NAMES = [
  "Naval Ravikant", "JD Vance", "J.D. Vance", "Vance",
  "Jason Calacanis", "Chamath Palihapitiya", "David Sacks", "David Friedberg",
  "Elon Musk", "Mark Zuckerberg", "Sam Altman", "Trump", "Macron", "Modi",
  "Naval", "Calacanis", "Chamath", "Friedberg",
  "AngelList", "DeepSeek", "Samsung", "SK",
  "나발 라비칸트", "JD 밴스", "트럼프", "마크롱", "모디",
  "제이슨 칼라카니스", "차마스 팔리하피티야", "데이비드 삭스", "데이비드 프리드버그",
];

function stripCelebrityNames(text: string): string {
  let result = text;
  for (const name of CELEBRITY_NAMES) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, "a person");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

export interface VideoPrompt {
  clipId: string;        // "clip001"
  clipIndex: number;
  chapterId: string;     // 가장 가까운 챕터 id
  chapterTitle: string;
  narrationExcerpt: string; // 해당 구간 나레이션
  videoPrompt: string;   // Veo용 최종 프롬프트
  durationSec: number;
}

// ── Gemini API call ──
async function callGemini(prompt: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API Error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text in Gemini response");
  return text;
}

// ── Map clip time range to chapter ──
function getChapterForClip(clip: AudioClip, chapterTimeline: { id: string; title: string; narration: string; startSec: number; endSec: number }[]) {
  const clipMid = (clip.startSec + clip.endSec) / 2;
  for (const ch of chapterTimeline) {
    if (clipMid >= ch.startSec && clipMid < ch.endSec) {
      return ch;
    }
  }
  return chapterTimeline[chapterTimeline.length - 1]; // fallback to last
}

async function main() {
  if (!fs.existsSync(CLIPS_JSON)) {
    console.error("❌ clips.json이 없습니다. splitAudio.ts를 먼저 실행하세요.");
    process.exit(1);
  }

  const clips: AudioClip[] = JSON.parse(fs.readFileSync(CLIPS_JSON, "utf-8"));

  // Build chapter timeline (approximate based on narration char distribution)
  const totalChars = SCRIPT.reduce((sum, ch) => sum + ch.script.length, 0);
  const totalDuration = clips[clips.length - 1].endSec;
  let currentSec = 0;

  const chapterTimeline = SCRIPT.map((ch) => {
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

  console.log(`\n🎬 클립별 비디오 프롬프트 생성 시작`);
  console.log(`📊 총 클립: ${clips.length}개`);
  console.log(`📊 챕터: ${SCRIPT.length}개\n`);

  const videoPrompts: VideoPrompt[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const chapter = getChapterForClip(clip, chapterTimeline);

    console.log(`🎬 [${i + 1}/${clips.length}] ${clip.id} → ${chapter.id}: ${chapter.title}`);

    // Gemini에게 나레이션 → 영상 프롬프트 변환 요청
    const geminiPrompt = `You are a cinematic video prompt writer for AI video generation (Veo 3.1).

Given this narration excerpt from a Korean educational video about economics/business:

Chapter: "${chapter.title}"
Narration: "${chapter.narration}"
Time range: ${clip.startSec.toFixed(1)}s - ${clip.endSec.toFixed(1)}s of the full video

Character style: ${MASTER_CHAR}
Visual style: ${MASTER_STYLE}

Generate a single concise video prompt (in English, 2-3 sentences max) that:
1. Depicts a specific visual scene matching this narration moment
2. Uses stick-figure characters in the described style
3. Includes subtle cinematic motion (camera pan, zoom, character gesture)
4. Is suitable for an 8-second video clip
5. NO text, captions, logos, or watermarks on screen
6. NO real celebrity names

Output JSON:
{
  "videoPrompt": "the video generation prompt in English"
}`;

    try {
      const rawJson = await callGemini(geminiPrompt);
      let parsed: any;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        const match = rawJson.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { videoPrompt: "" };
      }

      let prompt = stripCelebrityNames(parsed.videoPrompt || "");
      prompt += " Cinematic slow motion, smooth camera movement, subtle ambient animation. High quality, detailed lighting, professional video composition. 16:9 widescreen.";

      const vp: VideoPrompt = {
        clipId: clip.id,
        clipIndex: clip.index,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        narrationExcerpt: chapter.narration.substring(0, 80),
        videoPrompt: prompt,
        durationSec: clip.durationSec,
      };

      videoPrompts.push(vp);
      console.log(`  ✅ 프롬프트: ${prompt.substring(0, 100)}...`);
    } catch (err: any) {
      console.error(`  ❌ 실패: ${err.message}`);
      // fallback: use chapter imagePrompt
      const fallback = stripCelebrityNames(chapter.imagePrompt || "A stick figure in a minimalist scene");
      videoPrompts.push({
        clipId: clip.id,
        clipIndex: clip.index,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        narrationExcerpt: chapter.narration.substring(0, 80),
        videoPrompt: fallback + " Cinematic slow motion, smooth camera movement. 16:9 widescreen.",
        durationSec: clip.durationSec,
      });
    }

    // Rate limiting
    if (i < clips.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Save
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(videoPrompts, null, 2));
  console.log(`\n📋 videoPrompts.json 저장 완료 (${videoPrompts.length}개 프롬프트)`);
  console.log(`📁 ${OUTPUT_JSON}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
