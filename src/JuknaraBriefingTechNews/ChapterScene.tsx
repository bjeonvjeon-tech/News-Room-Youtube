import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Chapter } from "./script";

interface ChapterSceneProps {
  chapter: Chapter;
  chapterIndex: number;
  totalChapters: number;
  /** 이 씬에 대응하는 클립 비디오 파일 경로 (없으면 이미지 fallback) */
  clipVideoFile?: string;
}

export const ChapterScene: React.FC<ChapterSceneProps> = ({
  chapter,
  chapterIndex,
  totalChapters,
  clipVideoFile,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // script.ts에서 동적으로 읽음 (viralTag/viralHook 없으면 fallback)
  const tag = (chapter as any).viralTag || `${chapterIndex + 1} / ${totalChapters}`;
  const hook = (chapter as any).viralHook || chapter.title;

  // Entry animation for title
  const enterSpring = spring({ frame, fps, config: { damping: 12 } });
  const fadeIn = interpolate(enterSpring, [0, 1], [0, 1]);
  const titleY = interpolate(enterSpring, [0, 1], [60, 0]);

  // Ken Burns effect on image (only used for image fallback)
  const imgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const imgTranslateY = interpolate(frame, [0, durationInFrames], [0, -30], {
    extrapolateRight: "clamp",
  });

  // Fade in at start
  const enterFade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out at end
  const exitFade = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Combined opacity: fade in then fade out
  const sceneOpacity = enterFade * exitFade;

  // 비디오 파일 존재 여부 확인
  const hasVideo = !!clipVideoFile;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity: sceneOpacity }}>
      {/* Background: Video (priority) or Image (fallback) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        {hasVideo ? (
          <OffthreadVideo
            src={staticFile(clipVideoFile!)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            muted
          />
        ) : (
          <Img
            src={staticFile(`images/${chapter.id}.jpg`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imgScale}) translateY(${imgTranslateY}px)`,
            }}
          />
        )}
      </div>

      {/* Dark gradient overlays for text readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 350,
          background: "linear-gradient(rgba(0,0,0,0.8), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
        }}
      />

      {/* Viral tag (top-left) + Hook title */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 50,
          right: 50,
          opacity: fadeIn,
          transform: `translateY(${titleY}px)`,
        }}
      >
        {/* Tag badge */}
        <div
          style={{
            display: "inline-block",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#EEFF00",
            padding: "10px 24px",
            borderRadius: 20,
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            marginBottom: 16,
            backdropFilter: "blur(6px)",
            border: "2px solid rgba(238,255,0,0.4)",
          }}
        >
          {tag}
        </div>

        {/* Main hook text */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#EEFF00",
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.25,
            textShadow:
              "3px 3px 0px rgba(0,0,0,1), 6px 6px 12px rgba(0,0,0,0.8), 0 0 30px rgba(238,255,0,0.3)",
            letterSpacing: "-1px",
            maxWidth: "80%",
          }}
        >
          {hook}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(frame / durationInFrames) * 100}%`,
            backgroundColor: "#EEFF00",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
