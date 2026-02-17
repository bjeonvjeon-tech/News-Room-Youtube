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
import type { ChapterShort } from "./script-short";

interface ChapterSceneShortProps {
  chapter: ChapterShort;
  chapterIndex: number;
  totalChapters: number;
  clipVideoFile?: string; // e.g. "videos/clips-short/clip001.mp4"
}

export const ChapterSceneShort: React.FC<ChapterSceneShortProps> = ({
  chapter,
  chapterIndex,
  totalChapters,
  clipVideoFile,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const tag = chapter.viralTag || `${chapterIndex + 1} / ${totalChapters}`;
  const hook = chapter.viralHook || chapter.title;

  // Entry animation
  const enterSpring = spring({ frame, fps, config: { damping: 12 } });
  const fadeIn = interpolate(enterSpring, [0, 1], [0, 1]);
  const titleY = interpolate(enterSpring, [0, 1], [60, 0]);

  // Ken Burns effect (image fallback only)
  const imgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });
  const imgTranslateY = interpolate(frame, [0, durationInFrames], [0, -30], {
    extrapolateRight: "clamp",
  });

  // Fade in
  const enterFade = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const exitFade = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneOpacity = enterFade * exitFade;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity: sceneOpacity }}>
      {/* Full-screen background: clip video or image fallback */}
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
        {clipVideoFile ? (
          <OffthreadVideo
            src={staticFile(clipVideoFile)}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Img
            src={staticFile(`images-short/${chapter.id}.jpg`)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imgScale}) translateY(${imgTranslateY}px)`,
            }}
          />
        )}
      </div>

      {/* Top gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 400,
          background: "linear-gradient(rgba(0,0,0,0.85), transparent)",
        }}
      />
      {/* Bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 300,
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
        }}
      />

      {/* Viral tag + hook */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 40,
          right: 40,
          opacity: fadeIn,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#EEFF00",
            padding: "12px 28px",
            borderRadius: 24,
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            marginBottom: 20,
            backdropFilter: "blur(6px)",
            border: "2px solid rgba(238,255,0,0.4)",
          }}
        >
          {tag}
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#EEFF00",
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.3,
            textShadow:
              "3px 3px 0px rgba(0,0,0,1), 6px 6px 12px rgba(0,0,0,0.8), 0 0 30px rgba(238,255,0,0.3)",
            letterSpacing: "-1px",
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
