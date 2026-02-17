#!/usr/bin/env npx ts-node
/**
 * 롱폼 스크립트 변환기
 *
 * 완성된 스크립트 텍스트를 입력받아:
 * 1. [장 제목] 패턴으로 챕터 분할
 * 2. 각 챕터의 viralTag/viralHook 추출
 * 3. Gemini API로 각 챕터의 imagePrompt(영상 장면 묘사) 생성
 * 4. script.ts + generateTTS.py 자동 덮어쓰기
 *
 * ⚠️ 나레이션 텍스트는 요약/재작성 없이 원본 그대로 사용합니다.
 *
 * 사용법:
 *   npx ts-node src/StickFigureEconomics/generateScript.ts --file input.txt
 */

import fs from "fs";
import path from "path";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const FPS = 30;
const TTS_RATE = "+8%";

// ── Master Prompts ──
const MASTER_CHAR = `Minimalistic stick-figure illustration, clean lines, limited colors (white, black, gray, mint). Inspired by calm morning light aesthetic. Soft shadows, cozy interiors, props and outfit that fit for the story.`;

const MASTER_STYLE = `Warm editorial cartoon lineart with light watercolor texture; heavy outer contours, mid-weight interior seams, and ultra-thin facial lines with minimal hatching. Facial proportion lock: slightly enlarged head, medium-large eyes with simple irises, tiny nose mark, and a small mouth with restrained shapes; keep ratios stable across angles. Shading uses soft wash gradients over clean cel blocks to build volume, with edge-aware softening only on major form turns; highlights stay satin, rounded, and never mirror-bright. Color discipline: muted cool neutrals with clear value separation, plus one small warm accent family (mint); lighting is a soft directional key with gentle fill and a controlled glow rim. Consistent character model sheet across all scenes, no on-screen text, captions, logos, or watermarks.`;

// ── Gemini API call ──
async function callGemini(prompt: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
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

// ── 챕터 파싱 ──
interface ParsedChapter {
  title: string;
  narration: string;
}

function parseChapters(input: string): ParsedChapter[] {
  // [도입부], [1장], [2장], [마무리] 등의 패턴으로 분할
  const chapterRegex = /\[([^\]]+)\]\s*([^\[]*)/g;
  const chapters: ParsedChapter[] = [];
  let match;

  while ((match = chapterRegex.exec(input)) !== null) {
    const rawTitle = match[1].trim();
    let narration = match[2].trim();

    // 제목 정리: "도입부" → "후킹", "1장 제목" → "제목" 부분만
    let title = rawTitle;
    const titleMatch = rawTitle.match(/(?:\d+장\s*[-–]\s*)?(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // 나레이션에서 🇰🇷 한국인이 생각해볼 점 등 부가 텍스트 제거 (TTS에 포함하지 않음)
    narration = narration
      .replace(/🇰🇷[^\n]*\n?/g, "")
      .replace(/\*\*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (narration.length > 10) {
      chapters.push({ title, narration });
    }
  }

  return chapters;
}

// ── Main ──
async function main() {
  // 입력 읽기
  let input = "";
  const args = process.argv.slice(2);

  if (args[0] === "--file" && args[1]) {
    input = fs.readFileSync(args[1], "utf-8");
  } else if (args.length > 0) {
    input = args.join(" ");
  } else {
    console.error(
      "사용법: npx ts-node generateScript.ts --file input.txt"
    );
    process.exit(1);
  }

  console.log(`\n📝 입력 텍스트 길이: ${input.length}자`);

  // ── Step 1: 챕터 파싱 (원본 그대로) ──
  const chapters = parseChapters(input);
  if (chapters.length === 0) {
    console.error("❌ 챕터를 파싱할 수 없습니다. [제목] 패턴이 필요합니다.");
    process.exit(1);
  }

  const totalChapters = chapters.length;
  console.log(`✅ 파싱된 챕터: ${totalChapters}개`);
  chapters.forEach((ch, i) => {
    console.log(`  ${i}: ${ch.title} (${ch.narration.length}자)`);
  });

  // 전체 나레이션 (TTS용)
  const allNarrations = chapters.map((c) => c.narration);
  const totalChars = allNarrations.join("").length;
  const estimatedSeconds = Math.ceil(totalChars / 4.5 / 1.08);

  console.log(`\n📊 총 글자수: ${totalChars}`);
  console.log(
    `📊 예상 길이: ${estimatedSeconds}초 (${Math.floor(estimatedSeconds / 60)}분 ${estimatedSeconds % 60}초)`
  );

  // 주제/제목 추출 (첫 챕터 기반)
  const topic = chapters[0].narration.substring(0, 60).replace(/\n/g, " ");
  const title = chapters.length > 1 ? chapters[1].title : chapters[0].title;

  // ── Step 2: Gemini로 viralTag/viralHook/imageScene 생성 ──
  console.log(`\n🤖 Gemini에게 viralTag/Hook/imageScene 생성 요청 중...\n`);

  const geminiPrompt = `You are a visual scene designer for YouTube educational videos using stick-figure characters.

For each chapter below, generate:
1. viralTag: 이모지 + 2~4단어 한국어 태그 (예: ⚠️ 충격 실화)
2. viralHook: 시청자가 "뭐?!" 하고 반응할 1줄 한국어 문구 (짧고 강렬)
3. imageScene: 영문 2~3문장, 스틱피겨 캐릭터가 등장하는 구체적 장면 묘사

Chapters:
${chapters.map((ch, i) => `[${i}] ${ch.title}: ${ch.narration.substring(0, 150)}...`).join("\n")}

Output JSON array (one object per chapter, in order):
[
  {
    "viralTag": "...",
    "viralHook": "...",
    "imageScene": "..."
  }
]

Rules:
- viralTag: 이모지 + 한국어 (예: 🔥 공식 붕괴, 💰 부의 비밀)
- viralHook: 한국어 1줄 (예: "당신의 월급이 녹고 있다")
- imageScene: English, stick-figure characters with specific props/backgrounds
- No real celebrity names in imageScene
- JSON array only, no other text`;

  let chapterMeta: { viralTag: string; viralHook: string; imageScene: string }[] = [];

  try {
    const rawJson = await callGemini(geminiPrompt);
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      const match = rawJson.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    }
    chapterMeta = parsed;
    console.log(`✅ ${chapterMeta.length}개 챕터 메타데이터 생성 완료`);
  } catch (err: any) {
    console.warn(`⚠️ Gemini 메타데이터 생성 실패: ${err.message}`);
    console.warn("  → 기본값으로 대체합니다.");
  }

  // 부족한 메타데이터 기본값 채우기
  while (chapterMeta.length < totalChapters) {
    const i = chapterMeta.length;
    chapterMeta.push({
      viralTag: `📌 ${chapters[i]?.title || `파트 ${i + 1}`}`,
      viralHook: chapters[i]?.title || `핵심 포인트 ${i + 1}`,
      imageScene: `A stick figure character in a minimalist scene related to economics and finance. Clean white background with simple props.`,
    });
  }

  // ── Step 3: script.ts 생성 ──
  const totalFrames = estimatedSeconds * FPS;
  const sceneDur = Math.floor(totalFrames / totalChapters);

  console.log(`📊 총 프레임: ${totalFrames}, 씬당: ${sceneDur}\n`);

  const scriptTsContent = `/**
 * Stick Figure Economics — 롱폼 영상 스크립트
 * 주제: ${topic}
 * 형식: 16:9 (1920x1080), 롱폼 (~${Math.floor(estimatedSeconds / 60)}분 ${estimatedSeconds % 60}초)
 * ⚡ 자동 생성됨 by generateScript.ts (원본 스크립트 기반)
 */

export interface Chapter {
  id: string;
  title: string;
  script: string;
  imagePrompt: string;
  viralTag: string;
  viralHook: string;
  duration: number; // frames at 30fps
}

export const TOPIC = ${JSON.stringify(topic)};
export const TITLE = ${JSON.stringify(title)};
export const FPS = ${FPS};
export const TOTAL_DURATION = __TOTAL_DURATION__; // TTS 측정 후 업데이트됨

// Master prompts
const CHAR = ${JSON.stringify(MASTER_CHAR)};
const STYLE = ${JSON.stringify(MASTER_STYLE)};

const SCENE_DUR = __SCENE_DUR__;

export const SCRIPT: Chapter[] = [
${chapters
  .map(
    (ch, i) => `  {
    id: "ch${String(i).padStart(2, "0")}",
    title: ${JSON.stringify(ch.title)},
    script: ${JSON.stringify(ch.narration)},
    imagePrompt: \`\${CHAR} \${STYLE} ${(chapterMeta[i]?.imageScene || "A stick figure in a minimalist scene.").replace(/`/g, "'")} 16:9 landscape composition.\`,
    viralTag: ${JSON.stringify(chapterMeta[i]?.viralTag || `📌 ${ch.title}`)},
    viralHook: ${JSON.stringify(chapterMeta[i]?.viralHook || ch.title)},
    duration: ${i === chapters.length - 1 ? `__TOTAL_DURATION__ - (SCENE_DUR * ${totalChapters - 1})` : "SCENE_DUR"},
  }`
  )
  .join(",\n")}
];

export const FULL_NARRATION = SCRIPT.map((ch) => ch.script).join("\\n\\n");
`;

  // ── Step 4: generateTTS.py 생성 ──
  const fullNarration = allNarrations.join("\n\n");
  const ttsPyContent = `#!/usr/bin/env python3
"""
Edge TTS 나레이션 오디오 생성기
사용법: python3 src/StickFigureEconomics/generateTTS.py
"""

import asyncio
import os
import edge_tts

VOICE = "ko-KR-InJoonNeural"
RATE = "${TTS_RATE}"
VOLUME = "+0%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/audio")
OUTPUT_FILE = "full_narration.mp3"

FULL_SCRIPT = """${fullNarration.replace(/"""/g, '\\"\\"\\"')}"""


async def generate_tts():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    print(f"Generating TTS -> {OUTPUT_FILE}...")
    communicate = edge_tts.Communicate(FULL_SCRIPT, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(output_path)
    print(f"Saved: {output_path}")


if __name__ == "__main__":
    asyncio.run(generate_tts())
`;

  // 파일 저장
  const baseDir = path.join(__dirname);
  fs.writeFileSync(path.join(baseDir, "script.ts"), scriptTsContent);
  console.log("✅ script.ts 저장 완료");

  fs.writeFileSync(path.join(baseDir, "generateTTS.py"), ttsPyContent);
  console.log("✅ generateTTS.py 저장 완료");

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 다음 단계 (produce.sh 가 자동 실행합니다):
  1. python3 generateTTS.py          → TTS 생성
  2. afinfo로 실제 길이 측정          → script.ts 프레임 보정
  3. npx ts-node generateImages.ts   → 이미지 생성
  4. npx remotion render             → 영상 렌더
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
