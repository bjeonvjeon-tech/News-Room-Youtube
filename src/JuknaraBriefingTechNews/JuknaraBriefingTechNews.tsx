import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { useEffect, useState } from "react";
import { SCRIPT } from "./script";
import { ChapterScene } from "./ChapterScene";

/**
 * 클립 비디오 매핑 정보
 *
 * clips.json이 존재하면 각 클립(8초 단위)에 대응하는 비디오를 배경으로 사용.
 * 없으면 기존 이미지 기반 렌더링으로 fallback.
 *
 * 구조:
 *   - 오디오: full_narration.mp3 (전체 하나)
 *   - 비주얼: clips.json 기반 → videos/clips/clip001.mp4, clip002.mp4, ...
 *   - 오버레이: ChapterScene (viralTag, viralHook, progress bar)
 */

// clips.json을 빌드타임에 읽기 위한 타입
interface ClipInfo {
  id: string;
  index: number;
  file: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  durationFrames: number;
}

// clips.json을 정적으로 import (빌드타임)
let CLIPS: ClipInfo[] = [];
try {
  CLIPS = require("./clips.json");
} catch {
  // clips.json 없으면 빈 배열 → 이미지 fallback 모드
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
 * 클립별 비디오 파일 경로를 챕터에 매핑
 *
 * 로직: 각 챕터의 프레임 범위 내에 속하는 클립들을 찾아서
 * 가장 중앙에 있는 클립의 비디오를 해당 챕터 배경으로 사용
 */
function getClipVideoForChapter(
  chapterStartFrame: number,
  chapterEndFrame: number
): string | undefined {
  if (CLIPS.length === 0) return undefined;

  const chapterStartSec = chapterStartFrame / 30;
  const chapterEndSec = chapterEndFrame / 30;
  const chapterMidSec = (chapterStartSec + chapterEndSec) / 2;

  // 챕터 중앙 시점에 해당하는 클립 찾기
  const matchingClip = CLIPS.find(
    (clip) => chapterMidSec >= clip.startSec && chapterMidSec < clip.endSec
  );

  if (!matchingClip) return undefined;

  return `videos/clips/${matchingClip.id}.mp4`;
}

export const JuknaraBriefingTechNews: React.FC = () => {
  // 챕터별 시작 프레임 계산
  let accumulatedFrames = 0;

  return (
    <AbsoluteFill>
      {/* Single narration audio for the entire video */}
      <AudioWithFallback src="audio/full_narration.mp3" />

      {/* Chapter scenes as visual sequences */}
      <Series>
        {SCRIPT.map((chapter, index) => {
          const chapterStart = accumulatedFrames;
          const chapterEnd = accumulatedFrames + chapter.duration;
          accumulatedFrames += chapter.duration;

          const clipVideo = getClipVideoForChapter(chapterStart, chapterEnd);

          return (
            <Series.Sequence key={chapter.id} durationInFrames={chapter.duration}>
              <ChapterScene
                chapter={chapter}
                chapterIndex={index}
                totalChapters={SCRIPT.length}
                clipVideoFile={clipVideo}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
