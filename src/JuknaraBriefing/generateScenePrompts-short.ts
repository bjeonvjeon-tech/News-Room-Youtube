#!/usr/bin/env npx ts-node
/**
 * 적나라브리핑 2.0 — 숏폼 씬 프롬프트 생성기
 *
 * 전체 스크립트를 분석하여 핵심 장면을 정의하고,
 * 일관된 스타일의 비디오 프롬프트를 생성합니다.
 *
 * 영상 구조:
 * - Opening (scene01): 뉴스룸 앵커 등장
 * - Body (scene02~N-1): 본문 애니메이션
 * - Closing (sceneN): 뉴스룸 복귀
 *
 * ⚠️ Style Consistency 핵심:
 *   - 모든 장면에 동일한 MASTER_STYLE 프리픽스 적용
 *   - 주인공 캐릭터 외형 고정 (PROTAGONIST)
 *   - Opening/Closing: NEWSROOM 배경 사용
 *   - Body: 다양하고 다채로운 해외 도시/유명 인사 장면
 *
 * 출력:
 *   - scenes-short.json (장면 정의 + 타이밍)
 *
 * 사용법: npx ts-node src/JuknaraBriefing/generateScenePrompts-short.ts
 */

import fs from "fs";
import path from "path";
import { SCRIPT_SHORT, TITLE, TOPIC } from "./script-short";

const API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyBcpg5e86SKNISKHy7NKCaJEBS87RBHoGo";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const OUTPUT_JSON = path.join(__dirname, "scenes-short.json");
const AUDIO_FILE = path.join(__dirname, "../../public/audio/full_narration_short.mp3");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 STYLE CONSISTENCY SYSTEM (적나라브리핑 2.0)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 마스터 스타일 프리픽스 — 모든 프롬프트 앞에 붙음
 * 한국형 신화 웹툰 스타일
 */
const MASTER_STYLE = `Cinematic 9:16 vertical video, Korean mythical webtoon (manhwa) style — Cinematic digital ink lineart.
Clean sharp contours, disciplined line-weight hierarchy (bold outer silhouettes, medium interior forms, ultra-thin facial lines).
Filmic cel-to-painterly hybrid shading with clearly defined shadow shapes and soft gradient rolloff.
Rich luminous colors with confident saturation and clean value grouping. 1-2 vivid accent colors, bright and clean but never neon.
Soft directional lighting with gentle falloff, practical-inspired bounce light.
Dynamic poses with matched eye-lines.
NO photorealistic rendering, NO direct camera gaze, NO centered portrait framing, NO static hero poster poses.
No on-screen text or UI elements except news lower-thirds.`;

/**
 * 마스터 캐릭터: K-아나운서 '태리 (Taeri)'
 * ⚠️ Opening/Closing에만 등장. Body 씬에는 절대 등장하지 않음.
 * Body 씬의 랜덤 캐릭터는 MASTER_STYLE 렌더링 규칙만 따름.
 */
const PROTAGONIST = `a young Korean female news anchor 'Taeri' in her late 20s,
sharp intelligent eyes, long straight black hair past shoulders,
wearing a fitted pink (rose) blazer over a crisp white blouse,
confident and approachable demeanor, dynamic emotional reactions`;

/**
 * 뉴스룸 배경 (Opening/Closing용)
 */
const NEWSROOM = `NYC-based Fox News/CNBC-style anchor studio newsroom.
Giant LED wall screens showing live NASDAQ index, Bitcoin price charts, US map with data overlays.
In one corner, a clock displaying Seoul time with a 'SEOUL' placard.
Professional broadcast lighting, sleek modern desk, dark navy and metallic gold color scheme.`;

/**
 * 색상 팔레트 — 뉴스룸 장면에 적용
 */
const COLOR_PALETTE = `
Color palette: rich luminous tones, confident saturated highlights,
dark navy shadows, metallic gold accents, vivid reds for emphasis,
warm broadcast lighting throughout`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎬 본문 비주얼 디렉팅 가이드 — 4가지 서브 스타일
// "스타일은 하나, 연출은 무한대"
// 마스터 스타일의 렌더링 규칙은 유지하되,
// 색감/조명/구도/은유가 뉴스 유형에 따라 달라짐
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BODY_SUB_STYLES = {
  /** TYPE A: 테크 & 미래 혁신 (The 'Neon Future' Stream) */
  neon_future: {
    name: "Neon Future",
    targets: "AI, space industry, big tech products, future tech, crypto surge",
    concept: "Overwhelming flow of information and a radiant future (or dystopia). Fast-paced, complex, overflowing with energy.",
    keywords: "hologram interfaces, data streams, circuit diagrams, cyberpunk cityscape, light particles, ascending graphs",
    colorPalette: `Maintain master style lineart, but add NEON accent colors (electric blue, cyber lime, magenta) as bold highlights. Deep blue/purple backgrounds with dramatic depth.`,
    composition: `Wide-angle lens for overwhelming scale. Data particles converging to form giant shapes (logos, faces). Camera rushes through data streams. Speed and spectacle.`,
  },
  /** TYPE B: 경제 & 금융 위기 (The 'Heavy Titans' & Abstract Monsters) */
  heavy_titans: {
    name: "Heavy Titans",
    targets: "Interest rates, inflation, stock crash, economic crisis, national debt",
    concept: "Massive forces crushing us. Economic principles visualized as giant monsters or physical pressure, heightening crisis tension.",
    keywords: "titans, inflation monster, heavy chains, vaults, collapsing buildings, blood-red downward arrows, crushing machinery",
    colorPalette: `Heavy desaturated tones. Deep gray, blood red, rusted orange, murky ochre. Deeper and sharper shadows for noir atmosphere.`,
    composition: `Low angle shots looking up at massive economic phenomena for intimidation. Destructive physics effects — things breaking, crumbling, shattering. Heavy oppressive framing.`,
  },
  /** TYPE C: 정치 & 국제 정세 (The 'Grand Chessboard' Theater) */
  grand_chessboard: {
    name: "Grand Chessboard",
    targets: "US elections, US-China trade war, diplomatic policy, legislation",
    concept: "Cold strategy and backstage deals. Sophisticated but chilling atmosphere. Show influence symbolically rather than through portraits.",
    keywords: "chessboard, giant invisible hands, puppet strings, flags on maps, closed doors, spotlights",
    colorPalette: `Restrained and luxurious tones. Deep green, burgundy, gold, charcoal black. Dramatic theatrical lighting with spotlights and strong contrast.`,
    composition: `High angle (top-down) views of strategic maps. Very static compositions building tension. Symmetrical framing for authority and confrontation.`,
  },
  /** TYPE D: 사회 & 트렌드/문화 (The 'Pop Art' Mirror) */
  pop_art_mirror: {
    name: "Pop Art Mirror",
    targets: "Gen MZ trends, social issues (drugs, crime), cultural phenomena (K-pop influence)",
    concept: "Satire and direct reflection. Lighter and kitsch, or a distorted mirror reflecting society's dark side.",
    keywords: "smartphone screens as worlds, emoji explosions, pop art speech bubbles, shopping carts, distorted mirrors",
    colorPalette: `Punchy pop colors (yellow, pink, mint) for trends, OR very dry and pale tones for social critique. Bold flat areas of color.`,
    composition: `Collage-like mixing of multiple elements. Vertical smartphone-ratio compositions within compositions. Cynical fourth-wall-breaking expressions.`,
  },
} as const;

/**
 * 카메라 움직임 옵션 — 장면별로 선택 적용
 */
const CAMERA_MOVEMENTS = {
  slowPush: "very slow cinematic push-in towards subject",
  gentlePan: "gentle horizontal pan revealing the scene",
  staticWide: "static wide shot with subtle ambient movement",
  closeUp: "intimate close-up with shallow depth of field",
  overShoulder: "over-the-shoulder perspective shot",
  aerial: "slow descending aerial view",
  tracking: "smooth tracking shot following movement",
  zoomIn: "dynamic zoom in from wide newsroom to medium close-up",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SceneShort {
  id: string;           // "scene01", "scene02", ...
  index: number;
  title: string;        // 장면 제목 (한글)
  description: string;  // 장면 설명 (한글)
  sceneType: "opening" | "body" | "closing";
  bodySubStyle?: string; // 본문 서브 스타일 (body 타입에서만)
  startSec: number;     // 오디오에서 시작 시점
  endSec: number;       // 끝 시점
  durationSec: number;
  flowPrompt: string;   // 전체 프롬프트
  videoFile: string;    // "scenes/scene01.mp4"
}

async function callGemini(prompt: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
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
  return text.trim();
}

function getAudioDuration(): number {
  try {
    const { execSync } = require("child_process");
    // Try ffprobe first (linux), then afinfo (macOS)
    try {
      const output = execSync(`ffprobe -i "${AUDIO_FILE}" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null`, {
        encoding: "utf-8",
      });
      const duration = parseFloat(output.trim());
      if (!isNaN(duration)) return duration;
    } catch {}
    try {
      const output = execSync(`afinfo "${AUDIO_FILE}" 2>/dev/null`, {
        encoding: "utf-8",
      });
      const match = output.match(/estimated duration:\s*([\d.]+)/);
      if (match) return parseFloat(match[1]);
    } catch {}
  } catch {}
  return 60; // fallback
}

async function main() {
  const totalDuration = getAudioDuration();
  const fullScript = SCRIPT_SHORT.map((ch) => `[${ch.title}] (${ch.sceneType})\n${ch.script}`).join("\n\n");

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎬 적나라브리핑 2.0 — 씬 프롬프트 생성기`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📝 주제: ${TOPIC}`);
  console.log(`📝 제목: ${TITLE}`);
  console.log(`⏱️  총 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`🎨 스타일: Korean Mythical Webtoon / Newsroom\n`);

  // Gemini에게 장면 분석 요청
  const sceneCount = SCRIPT_SHORT.length;
  const analysisPrompt = `You are a video storyboard director for a Korean news briefing show called "적나라브리핑" (Juknara Briefing).

SHOW CONCEPT: A Korean animation anchor named "Taeri" delivers US news from a NYC newsroom. The visual style is Korean mythical webtoon (manhwa) style.

VIDEO STRUCTURE:
- Opening (1 scene): Taeri in the newsroom, dynamic camera zoom
- Body (${sceneCount - 2} scenes): Full-screen animation matching the news content
- Closing (1 scene): Return to newsroom, Taeri wraps up

SCRIPT:
${fullScript}

TOTAL DURATION: ${totalDuration.toFixed(1)} seconds

TASK:
1. Divide the script into exactly ${sceneCount} visual scenes matching the chapter structure
2. The FIRST scene is the Opening (newsroom with anchor)
3. The LAST scene is the Closing (newsroom with anchor)
4. Middle scenes are Body scenes with diverse, colorful animation
5. Assign appropriate timing (startSec, endSec) covering the full duration
6. For each scene, describe what should be visually shown (in English)

IMPORTANT VISUAL GUIDELINES:
- The master character (protagonist) is: ${PROTAGONIST}
- ⚠️ CRITICAL CHARACTER RULE:
  - Opening/Closing scenes: Master character 'Taeri' MUST appear in the newsroom
  - Body scenes: Master character 'Taeri' MUST NOT appear. No Taeri in any body scene.
  - Body scenes may include anonymous/random characters rendered in the master webtoon style, but NEVER Taeri herself.
- Opening/Closing: NYC newsroom with LED walls, anchor desk, Taeri present
- Body scenes MUST use one of these 4 visual sub-styles based on news type:

  TYPE A "neon_future" (Tech & Innovation): ${BODY_SUB_STYLES.neon_future.concept}
    Keywords: ${BODY_SUB_STYLES.neon_future.keywords}
    Color: ${BODY_SUB_STYLES.neon_future.colorPalette}

  TYPE B "heavy_titans" (Economy & Finance Crisis): ${BODY_SUB_STYLES.heavy_titans.concept}
    Keywords: ${BODY_SUB_STYLES.heavy_titans.keywords}
    Color: ${BODY_SUB_STYLES.heavy_titans.colorPalette}

  TYPE C "grand_chessboard" (Politics & International): ${BODY_SUB_STYLES.grand_chessboard.concept}
    Keywords: ${BODY_SUB_STYLES.grand_chessboard.keywords}
    Color: ${BODY_SUB_STYLES.grand_chessboard.colorPalette}

  TYPE D "pop_art_mirror" (Society & Trends): ${BODY_SUB_STYLES.pop_art_mirror.concept}
    Keywords: ${BODY_SUB_STYLES.pop_art_mirror.keywords}
    Color: ${BODY_SUB_STYLES.pop_art_mirror.colorPalette}

- The "bodySubStyle" field determines which sub-style palette/composition to apply
- "Make the invisible visible": abstract concepts (economic indicators, political pressure, tech disruption) must be translated into concrete visual metaphors
- Style consistency is maintained by the master lineart style; variety comes from color, lighting, composition, and metaphor
- NO text, captions, or UI elements in scenes

OUTPUT FORMAT (JSON array):
[
  {
    "index": 0,
    "title": "장면 제목 (한글)",
    "description": "이 장면에서 나레이션되는 내용 요약 (한글)",
    "sceneType": "opening",
    "bodySubStyle": null,
    "startSec": 0,
    "endSec": 8.5,
    "visualDescription": "Detailed English description of what should be shown visually."
  },
  {
    "index": 1,
    "title": "본문 제목",
    "description": "본문 설명",
    "sceneType": "body",
    "bodySubStyle": "neon_future",
    "startSec": 8.5,
    "endSec": 20.0,
    "visualDescription": "Body scene with visual metaphor matching the sub-style."
  },
  ...
]

Output ONLY valid JSON, no markdown or explanation.`;

  console.log(`🤖 Gemini에게 장면 분석 요청 중...\n`);

  let scenes: SceneShort[] = [];

  try {
    const rawJson = await callGemini(analysisPrompt);

    // Clean up response
    let cleanJson = rawJson;
    if (rawJson.includes("```")) {
      const match = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
      cleanJson = match ? match[1].trim() : rawJson;
    }

    const parsed = JSON.parse(cleanJson);

    // Build scenes with prompts
    scenes = parsed.map((s: any, i: number) => {
      const id = `scene${String(i + 1).padStart(2, "0")}`;
      const sceneType = s.sceneType || (i === 0 ? "opening" : i === parsed.length - 1 ? "closing" : "body");
      const bodySubStyle = s.bodySubStyle || null;

      // 카메라 움직임 선택
      const cameraOptions = Object.values(CAMERA_MOVEMENTS);
      const camera = sceneType === "opening"
        ? CAMERA_MOVEMENTS.zoomIn
        : sceneType === "closing"
        ? CAMERA_MOVEMENTS.closeUp
        : cameraOptions[i % cameraOptions.length];

      // 프롬프트 조합
      let flowPrompt: string;
      if (sceneType === "opening" || sceneType === "closing") {
        // 뉴스룸 씬: 뉴스룸 배경 + 마스터 캐릭터(태리)
        flowPrompt = `${MASTER_STYLE}

Scene: ${NEWSROOM} ${s.visualDescription}

The anchor is ${PROTAGONIST}.

Camera: ${camera}. ${COLOR_PALETTE}`;
      } else {
        // 본문 씬: 서브 스타일 적용, 마스터 캐릭터(태리) 제외
        const subStyle = bodySubStyle && BODY_SUB_STYLES[bodySubStyle as keyof typeof BODY_SUB_STYLES];
        const subStyleDirective = subStyle
          ? `\nVisual Direction [${subStyle.name}]: ${subStyle.concept}\nKeywords: ${subStyle.keywords}\n${subStyle.colorPalette}\n${subStyle.composition}`
          : "";

        flowPrompt = `${MASTER_STYLE}
${subStyleDirective}

IMPORTANT: Do NOT include the news anchor 'Taeri' (young Korean woman with long black hair and pink blazer) in this scene. This is a body scene — only show the news content visuals, environments, and anonymous characters if needed. Any characters must be different from Taeri.

Scene: ${s.visualDescription}

Camera: ${camera}.`;
      }

      return {
        id,
        index: i,
        title: s.title,
        description: s.description,
        sceneType,
        bodySubStyle,
        startSec: s.startSec,
        endSec: s.endSec,
        durationSec: s.endSec - s.startSec,
        flowPrompt,
        videoFile: `scenes/${id}.mp4`,
      };
    });

  } catch (err: any) {
    console.error(`❌ Gemini 분석 실패: ${err.message}`);
    console.log(`\n⚠️ 기본 장면으로 대체합니다.\n`);

    // Fallback: 균등 분할
    const sceneDuration = totalDuration / sceneCount;

    for (let i = 0; i < sceneCount; i++) {
      const chapter = SCRIPT_SHORT[i] || SCRIPT_SHORT[SCRIPT_SHORT.length - 1];
      const id = `scene${String(i + 1).padStart(2, "0")}`;
      const sceneType = chapter.sceneType || "body";
      const camera = Object.values(CAMERA_MOVEMENTS)[i % Object.values(CAMERA_MOVEMENTS).length];

      const isNewsroom = sceneType === "opening" || sceneType === "closing";
      const basePrompt = isNewsroom
        ? `${NEWSROOM} ${chapter.imagePrompt}`
        : chapter.imagePrompt;

      scenes.push({
        id,
        index: i,
        title: chapter.title,
        description: chapter.script.substring(0, 100),
        sceneType,
        startSec: i * sceneDuration,
        endSec: (i + 1) * sceneDuration,
        durationSec: sceneDuration,
        flowPrompt: `${MASTER_STYLE}\n\nScene: ${basePrompt}\n\nCamera: ${camera}. ${COLOR_PALETTE}`,
        videoFile: `scenes/${id}.mp4`,
      });
    }
  }

  // JSON 저장
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(scenes, null, 2));
  console.log(`📁 scenes-short.json 저장 완료\n`);

  // 콘솔에 프롬프트 출력
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎬 비디오 프롬프트 (복사해서 사용하세요)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│  🎨 MASTER STYLE (모든 영상에 공통 적용)      │`);
  console.log(`└─────────────────────────────────────────────┘`);
  console.log(`\n${MASTER_STYLE}\n`);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│  👤 PROTAGONIST (K-아나운서 태리)             │`);
  console.log(`└─────────────────────────────────────────────┘`);
  console.log(`\n${PROTAGONIST}\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const scene of scenes) {
    const typeEmoji = { opening: "📺", body: "🎨", closing: "📺" }[scene.sceneType];
    console.log(`┌─────────────────────────────────────────────┐`);
    console.log(`│  ${typeEmoji} [${scene.id.toUpperCase()}] ${scene.title.padEnd(24)} (${scene.sceneType}) │`);
    console.log(`│  ⏱️  ${scene.startSec.toFixed(1)}초 ~ ${scene.endSec.toFixed(1)}초 (${scene.durationSec.toFixed(1)}초)            │`);
    console.log(`└─────────────────────────────────────────────┘`);
    console.log(`📝 ${scene.description}\n`);
    console.log(`🎬 PROMPT:`);
    console.log(`─────────────────────────────────────────────`);
    console.log(scene.flowPrompt);
    console.log(`─────────────────────────────────────────────`);
    console.log(`📁 저장 위치: public/videos/${scene.videoFile}\n\n`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 완료!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
