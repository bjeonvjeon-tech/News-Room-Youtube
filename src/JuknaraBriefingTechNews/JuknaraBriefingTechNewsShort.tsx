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
 * Cyberpunk Tech News — 숏폼 Clip 기반 비디오 컴포넌트
 *
 * clips-short.json의 클립 비디오를 오디오 타이밍에 맞춰 배치.
 *
 * 구조:
 *   - 오디오: full_narration_short.mp3 (전체 하나)
 *   - 비주얼: clips-short.json 기반 → videos/clips-short/clip001.mp4 ~ clip008.mp4
 *   - 오버레이: viralTag, 자막 (script), progress bar (사이버펑크 스타일)
 */

// clips-short.json 타입
interface ClipInfo {
  id: string;
  index: number;
  file: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  durationFrames: number;
}

// clips-short.json을 정적으로 import (빌드타임)
let CLIPS: ClipInfo[] = [];
try {
  CLIPS = require("./clips-short.json");
} catch {
  // clips-short.json 없으면 빈 배열
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
 * 각 Clip에 대한 비디오 + 오버레이 렌더링
 */
const ClipRenderer: React.FC<{
  clip: ClipInfo;
  chapterInfo: (typeof SCRIPT_SHORT)[0] | undefined;
  totalClips: number;
}> = ({ clip, chapterInfo, totalClips }) => {
  const frame = useCurrentFrame();
  const durationFrames = clip.durationFrames;

  // 애니메이션 진행률
  const progress = frame / durationFrames;

  // 페이드 인/아웃
  const opacity = interpolate(
    frame,
    [0, 15, durationFrames - 15, durationFrames],
    [0, 1, 1, 0.8],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // viral tag 애니메이션
  const tagY = interpolate(frame, [0, 20], [-50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  // 자막 애니메이션
  const subtitleOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const viralTag = chapterInfo?.viralTag || "";
  const subtitle = chapterInfo?.script || "";

  return (
    <AbsoluteFill>
      {/* 배경 비디오 (볼륨 20%) */}
      <AbsoluteFill>
        <OffthreadVideo
          src={staticFile(`videos/clips-short/${clip.id}.mp4`)}
          volume={0.2}
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

      {/* Viral Tag (왼쪽 상단, 네온 시안, 사이버펑크) */}
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
              background: "rgba(0, 255, 255, 0.9)",
              padding: "16px 32px",
              borderRadius: 4,
              fontSize: 42,
              fontWeight: 900,
              color: "#0a0a1a",
              textShadow: "0 0 10px rgba(0,255,255,0.5)",
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
              border: "2px solid rgba(255,0,255,0.5)",
            }}
          >
            {viralTag}
          </div>
        </div>
      )}

      {/* 한글 자막 (하단, 지마켓산스) */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: 180,
            left: 30,
            right: 30,
            textAlign: "center",
            opacity: subtitleOpacity,
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontFamily: "'GmarketSans', 'GmarketSansMedium', sans-serif",
              fontWeight: 500,
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)",
              lineHeight: 1.5,
              padding: "0 10px",
              wordBreak: "keep-all",
            }}
          >
            {subtitle}
          </div>
        </div>
      )}

      {/* 진행 바 (하단, 핑크→시안 그라데이션) */}
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
            width: `${((clip.index + progress) / totalClips) * 100}%`,
            background: "linear-gradient(90deg, #ff00ff, #00ffff)",
            borderRadius: 3,
            transition: "width 0.1s linear",
          }}
        />
      </div>

      {/* Clip 인디케이터 */}
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
        {clip.index + 1} / {totalClips}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Clip 정보를 Chapter에 매핑
 * (clip.startSec 기준으로 해당 시점의 chapter 찾기)
 */
function getChapterForClip(
  clip: ClipInfo
): (typeof SCRIPT_SHORT)[0] | undefined {
  const clipMidSec = (clip.startSec + clip.endSec) / 2;
  let accumulatedSec = 0;

  for (const chapter of SCRIPT_SHORT) {
    const chapterDurationSec = chapter.duration / FPS;
    if (
      clipMidSec >= accumulatedSec &&
      clipMidSec < accumulatedSec + chapterDurationSec
    ) {
      return chapter;
    }
    accumulatedSec += chapterDurationSec;
  }

  return SCRIPT_SHORT[SCRIPT_SHORT.length - 1];
}

export const JuknaraBriefingTechNewsShort: React.FC = () => {
  if (CLIPS.length === 0) {
    // Fallback: clips-short.json이 없으면 placeholder
    return (
      <AbsoluteFill
        style={{
          background: "#0a0a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          color: "#00ffcc",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>
          clips-short.json 없음
        </div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>
          ./produce-cyberpunk-short.sh 실행 필요
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

      {/* Clip 시퀀스 */}
      {CLIPS.map((clip) => {
        const startFrame = Math.round(clip.startSec * FPS);
        const durationFrames = clip.durationFrames;
        const chapterInfo = getChapterForClip(clip);

        return (
          <Sequence
            key={clip.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <ClipRenderer
              clip={clip}
              chapterInfo={chapterInfo}
              totalClips={CLIPS.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
