#!/usr/bin/env npx ts-node
/**
 * 숏폼 씬 프롬프트 생성기 (Flow용)
 *
 * 전체 스크립트를 분석하여 10개 핵심 장면을 정의하고,
 * Flow에서 사용할 일관된 스타일의 비디오 프롬프트를 생성합니다.
 *
 * ⚠️ Style Consistency 핵심:
 *   - 모든 장면에 동일한 MASTER_STYLE 프리픽스 적용
 *   - 주인공 캐릭터 외형 고정 (PROTAGONIST)
 *   - 색상 팔레트 통일 (COLOR_PALETTE)
 *   - 카메라 언어 통일
 *
 * 출력:
 *   - scenes-short.json (장면 정의 + 타이밍)
 *   - 콘솔에 Flow용 프롬프트 출력 (복사용)
 *
 * 사용법: npx ts-node src/JuknaraBriefingTechNews/generateScenePrompts-short.ts
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
// 🎨 STYLE CONSISTENCY SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 마스터 스타일 프리픽스 — 모든 프롬프트 앞에 붙음
 * Flow에서 스타일 일관성을 위해 필수
 */
const MASTER_STYLE = `Cinematic 9:16 vertical video, consistent visual style throughout:
cyberpunk neon color palette (vibrant cyan, hot pink, deep purple, electric blue),
dark atmospheric backgrounds with rain and fog, high contrast neon lighting,
smooth cinematic camera movements, futuristic sci-fi aesthetic,
Blade Runner inspired atmosphere, no text or UI elements on screen.`;

/**
 * 주인공 캐릭터 정의 — 레이 달리오 대역
 * 모든 장면에서 동일한 외형 유지
 */
const PROTAGONIST = `a futuristic humanoid robot with glowing cyan LED eyes,
sleek metallic chrome body with neon circuit line accents,
holographic display elements floating around its head and hands,
standing in dark cyberpunk environments with neon reflections`;

/**
 * 색상 팔레트 — 모든 장면에 적용
 */
const COLOR_PALETTE = `
Color palette: dark backgrounds (#0a0a1a), vibrant neon cyan (#00ffff) highlights,
hot pink (#ff00ff) accents, electric purple (#8b00ff) secondary,
deep blue shadows, high contrast neon lighting throughout`;

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
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SceneShort {
  id: string;           // "scene01", "scene02", ...
  index: number;
  title: string;        // 장면 제목 (한글)
  description: string;  // 장면 설명 (한글)
  startSec: number;     // 오디오에서 시작 시점
  endSec: number;       // 끝 시점
  durationSec: number;
  flowPrompt: string;   // Flow에 입력할 전체 프롬프트
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
    const output = execSync(`afinfo "${AUDIO_FILE}" 2>/dev/null`, {
      encoding: "utf-8",
    });
    const match = output.match(/estimated duration:\s*([\d.]+)/);
    if (match) return parseFloat(match[1]);
  } catch {}
  return 87; // fallback
}

async function main() {
  const totalDuration = getAudioDuration();
  const fullScript = SCRIPT_SHORT.map((ch) => `[${ch.title}]\n${ch.script}`).join("\n\n");

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎬 Flow용 씬 프롬프트 생성기`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📝 주제: ${TOPIC}`);
  console.log(`📝 제목: ${TITLE}`);
  console.log(`⏱️  총 길이: ${totalDuration.toFixed(1)}초`);
  console.log(`🎨 스타일: Cyberpunk Neon\n`);

  // Gemini에게 10개 장면 분석 요청
  const analysisPrompt = `You are a video storyboard director. Analyze this Korean narration script and divide it into exactly 10 visual scenes for a short-form video.

SCRIPT:
${fullScript}

TOTAL DURATION: ${totalDuration.toFixed(1)} seconds

TASK:
1. Divide the script into 10 scenes based on narrative flow and topic changes
2. Each scene should be 6-12 seconds long
3. Assign appropriate timing (startSec, endSec) that covers the full duration
4. For each scene, describe what should be visually shown (in English)
5. The visual should match the narration content at that moment

IMPORTANT VISUAL GUIDELINES:
- The protagonist is: ${PROTAGONIST}
- Style: Elegant documentary, soft muted colors, cinematic
- NO text, captions, or UI elements should appear in scenes
- Focus on visual metaphors for abstract concepts (investing, principles, empires, etc.)

OUTPUT FORMAT (JSON array):
[
  {
    "index": 0,
    "title": "장면 제목 (한글)",
    "description": "이 장면에서 나레이션되는 내용 요약 (한글)",
    "startSec": 0,
    "endSec": 8.5,
    "visualDescription": "Detailed English description of what should be shown visually in this scene. Be specific about setting, actions, objects, mood."
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

    // Build scenes with Flow prompts
    scenes = parsed.map((s: any, i: number) => {
      const id = `scene${String(i + 1).padStart(2, "0")}`;

      // 카메라 움직임 선택 (장면 특성에 따라)
      const cameraOptions = Object.values(CAMERA_MOVEMENTS);
      const camera = cameraOptions[i % cameraOptions.length];

      // Flow 프롬프트 조합: 마스터 스타일 + 장면 설명 + 카메라
      const flowPrompt = `${MASTER_STYLE}

Scene: ${s.visualDescription}

${s.visualDescription.toLowerCase().includes("protagonist") || s.visualDescription.toLowerCase().includes("man")
  ? `The main character is ${PROTAGONIST}.`
  : ""}

Camera: ${camera}. ${COLOR_PALETTE}`;

      return {
        id,
        index: i,
        title: s.title,
        description: s.description,
        startSec: s.startSec,
        endSec: s.endSec,
        durationSec: s.endSec - s.startSec,
        flowPrompt,
        videoFile: `scenes/${id}.mp4`,
      };
    });

  } catch (err: any) {
    console.error(`❌ Gemini 분석 실패: ${err.message}`);
    console.log(`\n⚠️ 기본 10개 장면으로 대체합니다.\n`);

    // Fallback: 균등 분할
    const sceneCount = 10;
    const sceneDuration = totalDuration / sceneCount;

    for (let i = 0; i < sceneCount; i++) {
      const chapter = SCRIPT_SHORT[Math.floor(i / 2)] || SCRIPT_SHORT[SCRIPT_SHORT.length - 1];
      const id = `scene${String(i + 1).padStart(2, "0")}`;
      const camera = Object.values(CAMERA_MOVEMENTS)[i % Object.values(CAMERA_MOVEMENTS).length];

      scenes.push({
        id,
        index: i,
        title: `${chapter.title} (${i + 1})`,
        description: chapter.script.substring(0, 100),
        startSec: i * sceneDuration,
        endSec: (i + 1) * sceneDuration,
        durationSec: sceneDuration,
        flowPrompt: `${MASTER_STYLE}\n\nScene: ${chapter.imagePrompt}\n\nCamera: ${camera}. ${COLOR_PALETTE}`,
        videoFile: `scenes/${id}.mp4`,
      });
    }
  }

  // JSON 저장
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(scenes, null, 2));
  console.log(`📁 scenes-short.json 저장 완료\n`);

  // 콘솔에 Flow 프롬프트 출력 (복사용)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎬 FLOW 비디오 프롬프트 (복사해서 사용하세요)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│  🎨 MASTER STYLE (모든 영상에 공통 적용)      │`);
  console.log(`└─────────────────────────────────────────────┘`);
  console.log(`\n${MASTER_STYLE}\n`);

  console.log(`┌─────────────────────────────────────────────┐`);
  console.log(`│  👤 PROTAGONIST (주인공 캐릭터)               │`);
  console.log(`└─────────────────────────────────────────────┘`);
  console.log(`\n${PROTAGONIST}\n`);

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const scene of scenes) {
    console.log(`┌─────────────────────────────────────────────┐`);
    console.log(`│  [${scene.id.toUpperCase()}] ${scene.title.padEnd(28)}│`);
    console.log(`│  ⏱️  ${scene.startSec.toFixed(1)}초 ~ ${scene.endSec.toFixed(1)}초 (${scene.durationSec.toFixed(1)}초)            │`);
    console.log(`└─────────────────────────────────────────────┘`);
    console.log(`📝 ${scene.description}\n`);
    console.log(`🎬 FLOW PROMPT:`);
    console.log(`─────────────────────────────────────────────`);
    console.log(scene.flowPrompt);
    console.log(`─────────────────────────────────────────────`);
    console.log(`📁 저장 위치: public/videos/${scene.videoFile}\n\n`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 완료! 위 프롬프트로 Flow에서 영상을 생성한 후`);
  console.log(`   public/videos/scenes/ 폴더에 저장하세요.`);
  console.log(`   파일명: scene01.mp4 ~ scene10.mp4`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
