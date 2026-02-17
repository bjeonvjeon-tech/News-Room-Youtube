import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  OffthreadVideo,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { useEffect, useState } from "react";
import { SCRIPT_SHORT, FPS } from "./script-short";

/**
 * 숏폼 Scene 기반 비디오 컴포넌트 (TTS 타이밍 SSOT 기반)
 *
 * 핵심 로직:
 * 1. 모든 영상은 10초로 확장 (scenes-extended/)
 * 2. TTS 오디오 타이밍이 SSOT (Single Source of Truth)
 * 3. TTS 문장 길이에 맞춰 영상 truncate
 *
 * playbackMode:
 * - truncate: 오디오 <= 10초, 10초 영상을 TTS 길이에 맞춰 자름
 * - loop: 오디오 > 10초, 10초 영상 반복 재생
 */

// scenes-short.json 타입 (타이밍 정보 포함)
interface SentenceTiming {
  text: string;
  startSec: number;
  endSec: number;
  durationSec: number;
}

interface SceneInfo {
  id: string;
  index: number;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  startFrame?: number;
  endFrame?: number;
  durationFrames?: number;
  playbackMode?: "truncate" | "loop";
  videoFile: string;
  videoDuration?: number;
  needsTruncate?: boolean;
  truncateDuration?: number;
  audioFile?: string;
  sentences?: SentenceTiming[];
}

// scenes-short.json을 정적으로 import (빌드타임)
let SCENES: SceneInfo[] = [];
try {
  SCENES = require("./scenes-short.json");
} catch {
  // scenes-short.json 없으면 빈 배열
}

const AudioWithFallback: React.FC<{ src: string }> = ({ src }) => {
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    const audio = new window.Audio();
    audio.oncanplay = () => setHasAudio(true);
    audio.onerror = () => setHasAudio(false);
    audio.src = staticFile(src);
  }, [src]);

  if (!hasAudio) return null;

  return <Audio src={staticFile(src)} />;
};

/**
 * 각 Scene에 대한 비디오 + 오버레이 렌더링
 * TTS 타이밍에 맞춰 비디오 재생
 */
const SceneRenderer: React.FC<{
  scene: SceneInfo;
  chapterInfo: (typeof SCRIPT_SHORT)[0] | undefined;
  totalScenes: number;
}> = ({ scene, chapterInfo, totalScenes }) => {
  const frame = useCurrentFrame();
  const durationFrames = scene.durationFrames || Math.round(scene.durationSec * FPS);

  // 애니메이션 진행률
  const progress = frame / durationFrames;

  // 페이드 인/아웃 (부드럽게)
  const opacity = interpolate(
    frame,
    [0, 8, durationFrames - 8, durationFrames],
    [0.9, 1, 1, 0.9],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // viral tag 애니메이션
  const tagY = interpolate(frame, [0, 20], [-50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  // playbackMode 결정 (기본값: truncate)
  // - truncate: 10초 영상을 TTS 길이에 맞춰 자름 (Sequence가 자동으로 처리)
  // - loop: 10초 영상 반복 (TTS가 10초 초과 시)
  const playbackMode = scene.playbackMode || "truncate";

  // loop 모드에서만 반복 재생
  const needsLoop = playbackMode === "loop";

  // 현재 재생 중인 문장 찾기 (TTS 타이밍 기반)
  const currentTimeSec = frame / FPS;
  const currentSentence = scene.sentences?.find(
    (s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec
  );

  const viralTag = chapterInfo?.viralTag || "";
  // 현재 문장을 자막으로 표시 (있으면 현재 문장, 없으면 전체 설명)
  const subtitle = currentSentence?.text || scene.description || chapterInfo?.script || "";

  // 자막 페이드 인 (문장 시작 시)
  const sentenceStartFrame = currentSentence
    ? currentSentence.startSec * FPS
    : 0;
  const subtitleOpacity = interpolate(
    frame,
    [sentenceStartFrame, sentenceStartFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* 배경 비디오 - TTS 타이밍에 맞춰 재생 */}
      <AbsoluteFill>
        <OffthreadVideo
          src={staticFile(`videos/${scene.videoFile}`)}
          volume={0.4}
          loop={needsLoop}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* 비디오 위 어두운 오버레이 (텍스트 가독성) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      </AbsoluteFill>

      {/* Viral Tag (왼쪽 상단, 형광초록) */}
      {viralTag && (
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 40,
            transform: `translateY(${tagY}px)`,
            opacity,
          }}
        >
          <div
            style={{
              background: "rgba(0, 255, 100, 0.95)",
              padding: "16px 32px",
              borderRadius: 10,
              fontSize: 42,
              fontWeight: 900,
              fontFamily: "'GmarketSans', 'Bebas Neue', 'Impact', sans-serif",
              color: "#000",
              textShadow: "0 1px 2px rgba(255,255,255,0.3)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {viralTag}
          </div>
        </div>
      )}

      {/* 한글 자막 (하단, 흰색 텍스트 + 검은 배경 박스) */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: 380,
            left: 30,
            right: 30,
            textAlign: "center",
            opacity: subtitleOpacity,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontFamily: "'GmarketSans', 'GmarketSansMedium', sans-serif",
              fontWeight: 700,
              color: "#FFFFFF",
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              padding: "16px 28px",
              borderRadius: 8,
              lineHeight: 1.5,
              wordBreak: "keep-all",
              maxWidth: "90%",
            }}
          >
            {subtitle}
          </div>
        </div>
      )}

      {/* 진행 바 (하단) */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 40,
          right: 40,
          height: 6,
          background: "rgba(255,255,255,0.3)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((scene.index + progress) / totalScenes) * 100}%`,
            background: "linear-gradient(90deg, #FF6B6B, #FFE66D)",
            borderRadius: 3,
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {/* Scene 인디케이터 */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 40,
          fontSize: 18,
          color: "rgba(255,255,255,0.7)",
          fontWeight: 500,
        }}
      >
        {scene.index + 1} / {totalScenes}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Scene 정보를 Chapter에 매핑 (index 기반으로 변경)
 */
function getChapterForScene(
  scene: SceneInfo
): (typeof SCRIPT_SHORT)[0] | undefined {
  // 씬 index와 chapter index가 동일
  if (scene.index < SCRIPT_SHORT.length) {
    return SCRIPT_SHORT[scene.index];
  }
  return SCRIPT_SHORT[SCRIPT_SHORT.length - 1];
}

export const StickFigureEconomicsShort: React.FC = () => {
  if (SCENES.length === 0) {
    // Fallback: scenes-short.json이 없으면 placeholder
    return (
      <AbsoluteFill
        style={{
          background: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          color: "white",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>
          scenes-short.json 없음
        </div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>
          python3 src/StickFigureEconomics/generateTTS-timing.py 실행 필요
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* 지마켓산스 폰트 로드 */}
      <style>
        {`
          @font-face {
            font-family: 'GmarketSans';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
            font-weight: 500;
            font-style: normal;
          }
          @font-face {
            font-family: 'GmarketSans';
            src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff') format('woff');
            font-weight: 700;
            font-style: normal;
          }
        `}
      </style>

      {/* 전체 나레이션 오디오 */}
      <AudioWithFallback src="audio/full_narration_short.mp3" />

      {/* Scene 시퀀스 (TTS 타이밍 SSOT 기반) */}
      {SCENES.map((scene, index) => {
        // scenes-short.json에서 프레임 정보 사용 (정확한 타이밍)
        const startFrame = scene.startFrame !== undefined
          ? scene.startFrame
          : SCENES.slice(0, index).reduce(
              (acc, s) => acc + (s.durationFrames || Math.round(s.durationSec * FPS)),
              0
            );
        const durationFrames = scene.durationFrames || Math.round(scene.durationSec * FPS);
        const chapterInfo = getChapterForScene(scene);

        return (
          <Sequence
            key={scene.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <SceneRenderer
              scene={scene}
              chapterInfo={chapterInfo}
              totalScenes={SCENES.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
