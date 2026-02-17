#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TTS 타이밍 분석기 (SSOT - Single Source of Truth)

Edge TTS의 WordBoundary 이벤트를 사용하여 문장별 정확한 타이밍을 추출합니다.
이 타이밍 데이터는 이미지/영상 편집의 기준이 됩니다.

핵심 로직:
1. TTS 생성 시 WordBoundary 이벤트로 각 단어의 시작/끝 시간 추출
2. 문장 단위로 그룹화하여 각 문장의 시작/끝 시간 계산
3. 씬별 타이밍 데이터를 scenes-timing.json에 저장
4. 영상 편집 시 이 타이밍을 기준으로 영상 길이 결정

출력 파일:
- public/audio/clips-short/{scene_id}.mp3 - 씬별 TTS 오디오
- public/audio/full_narration_short.mp3 - 전체 나레이션
- scenes-timing.json - 문장별 타이밍 SSOT 데이터
- scenes-short.json - Remotion용 씬 데이터 (타이밍 포함)
"""

import asyncio
import os
import json
import re
import edge_tts
import subprocess
from typing import List, Dict, Tuple

VOICE = "ko-KR-InJoonNeural"
RATE = "+30%"
VOLUME = "+0%"
VIDEO_DURATION = 5.0  # 원본 비디오 길이 (초)
EXTENDED_VIDEO_DURATION = 10.0  # reverse-loop 비디오 길이 (초)
FPS = 30

BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "../../public/audio/clips-short")
SCENES_FILE = os.path.join(BASE_DIR, "scenes-short.json")
TIMING_FILE = os.path.join(BASE_DIR, "scenes-timing.json")

# script-short.ts에서 가져온 씬별 스크립트
SCENE_SCRIPTS = [
    '중국이 이번 주에 AI 모델 3개를 동시에 쏟아냈습니다. 구글 딥마인드 CEO가 말했죠, "중국은 불과 몇 달 뒤에 있다."',
    "먼저 알리바바입니다. 로봇 두뇌 'RynnBrain'을 공개했는데요, 물건을 알아보고, 집어서, 바구니에 넣습니다.",
    "구글 제미니 로보틱스, 엔비디아 코스모스를 16개의 benchmark에서 다 이겼어요. 게다가 오픈소스로 무료 공개했구요.",
    "다음은 바이트댄스. 영상 생성 AI 'Seedance' 인데, 텍스트·이미지·영상·음성을 동시에 입력하면 2K 영상을 만들어줍니다.",
    '중국에서는 "제2의 딥시크"라는 말까지 나왔어요.',
    "이게 한국에 왜 중요하냐면요, 첫째, 로봇입니다. 현대·삼성이 휴머노이드 로봇에 투자 중인데, 중국이 AI 두뇌를 오픈소스로 풀어버리면 가격 경쟁력에서 밀릴 수 있어요.",
    "둘째, 콘텐츠예요. 한국 광고·영상 업계가 영상 AI 도입을 준비 중인데, Seedance 가 Sora 보다 싸고 빠르면 판이 바뀝니다.",
    "셋째, 반도체입니다. 중국이 미국 칩 제재 속에서도 이런 모델을 내놓는다는 건, SK하이닉스 AI 메모리 수요 구조에도 영향을 줄 수 있거든요.",
    "AI 전쟁, 미국 vs 중국 사이에서 한국은 어디쯤 있을까요?",
]

SCENE_TITLES = [
    "중국 AI 폭격",
    "알리바바 RynnBrain",
    "벤치마크 압승",
    "바이트댄스 Seedance",
    "제2의 딥시크",
    "한국 영향 - 로봇",
    "한국 영향 - 콘텐츠",
    "한국 영향 - 반도체",
    "한국의 위치",
]


def get_audio_duration(filepath: str) -> float:
    """오디오 파일의 길이(초)를 반환"""
    try:
        result = subprocess.run(
            ["afinfo", filepath], capture_output=True, text=True
        )
        for line in result.stdout.split("\n"):
            if "duration" in line.lower():
                parts = line.split(":")
                if len(parts) >= 2:
                    duration_str = parts[1].strip().replace("sec", "").strip()
                    return float(duration_str)
    except Exception as e:
        print(f"⚠️  Duration check failed: {e}")
    return 5.0


def split_into_sentences(text: str) -> List[str]:
    """텍스트를 문장 단위로 분리"""
    # 한국어/영어 문장 끝 패턴
    pattern = r'(?<=[.!?。？！])\s*'
    sentences = re.split(pattern, text)
    return [s.strip() for s in sentences if s.strip()]


def determine_video_settings(audio_duration: float) -> Dict:
    """
    오디오 길이에 따라 비디오 설정 결정

    모든 영상은 먼저 10초 (scenes-extended/)로 확장된 상태.
    TTS 타이밍에 맞춰 필요한 길이로 truncate.

    Returns:
        {
            "playbackMode": "normal" | "reverse-loop" | "loop",
            "videoFolder": "scenes-extended" (항상 10초 영상 사용),
            "videoDuration": 10초 (확장된 영상 길이),
            "needsTruncate": True/False,
            "truncateDuration": TTS 오디오 길이에 맞춘 실제 필요 길이
        }
    """
    # 항상 10초 확장 영상 사용 (scenes-extended/)
    if audio_duration <= EXTENDED_VIDEO_DURATION:
        # 10초 이하: 10초 영상을 TTS 길이에 맞춰 truncate
        return {
            "playbackMode": "truncate",  # 10초 영상을 짧게 자름
            "videoFolder": "scenes-extended",
            "videoDuration": EXTENDED_VIDEO_DURATION,
            "needsTruncate": True,
            "truncateDuration": audio_duration
        }
    else:
        # 10초 초과: 10초 영상 반복 재생
        return {
            "playbackMode": "loop",
            "videoFolder": "scenes-extended",
            "videoDuration": EXTENDED_VIDEO_DURATION,
            "needsTruncate": False,
            "truncateDuration": audio_duration
        }


async def generate_tts_with_timing(scene_id: str, script: str) -> Tuple[float, List[Dict]]:
    """
    TTS 생성하면서 WordBoundary 이벤트로 타이밍 추출

    Returns:
        (총 길이, [{'text': str, 'start': float, 'end': float, 'duration': float}])
    """
    output_path = os.path.join(OUTPUT_DIR, f"{scene_id}.mp3")

    communicate = edge_tts.Communicate(script, VOICE, rate=RATE, volume=VOLUME)

    word_timings = []
    audio_data = b""

    # stream()으로 WordBoundary 이벤트와 오디오 데이터 동시 수집
    async for event in communicate.stream():
        if event["type"] == "WordBoundary":
            word_timings.append({
                "text": event["text"],
                "start_ms": event["offset"],  # 100ns 단위
                "duration_ms": event["duration"]  # 100ns 단위
            })
        elif event["type"] == "audio":
            audio_data += event["data"]

    # 오디오 파일 저장
    with open(output_path, "wb") as f:
        f.write(audio_data)

    # 실제 오디오 길이
    total_duration = get_audio_duration(output_path)

    # 문장별로 그룹화
    sentences = split_into_sentences(script)
    sentence_timings = []

    if word_timings:
        # WordBoundary 데이터가 있으면 문장별 타이밍 계산
        current_word_idx = 0
        current_pos = 0

        for sentence in sentences:
            sentence_start = None
            sentence_end = None
            sentence_words = []

            # 문장에 포함된 단어들 찾기
            remaining_text = sentence
            while current_word_idx < len(word_timings) and remaining_text:
                word_data = word_timings[current_word_idx]
                word_text = word_data["text"]

                if word_text in remaining_text:
                    if sentence_start is None:
                        sentence_start = word_data["start_ms"] / 10_000_000  # 100ns → 초

                    end_time = (word_data["start_ms"] + word_data["duration_ms"]) / 10_000_000
                    sentence_end = end_time
                    sentence_words.append(word_text)

                    # 텍스트에서 해당 단어 이후 부분만 남김
                    idx = remaining_text.find(word_text)
                    if idx >= 0:
                        remaining_text = remaining_text[idx + len(word_text):].strip()

                    current_word_idx += 1
                else:
                    break

            if sentence_start is not None and sentence_end is not None:
                sentence_timings.append({
                    "text": sentence,
                    "startSec": round(sentence_start, 3),
                    "endSec": round(sentence_end, 3),
                    "durationSec": round(sentence_end - sentence_start, 3)
                })

    # WordBoundary가 없거나 불완전하면 균등 분배
    if not sentence_timings and sentences:
        avg_duration = total_duration / len(sentences)
        current_time = 0
        for sentence in sentences:
            sentence_timings.append({
                "text": sentence,
                "startSec": round(current_time, 3),
                "endSec": round(current_time + avg_duration, 3),
                "durationSec": round(avg_duration, 3)
            })
            current_time += avg_duration

    return total_duration, sentence_timings


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("🎙️ TTS 타이밍 분석기 (SSOT)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📌 이 타이밍 데이터가 모든 영상 편집의 기준입니다.\n")

    scenes = []
    timing_data = []
    current_time = 0.0
    total_duration = 0.0

    for i, (script, title) in enumerate(zip(SCENE_SCRIPTS, SCENE_TITLES)):
        scene_id = f"scene{str(i + 1).zfill(2)}"
        print(f"🎬 [{scene_id}] {title}")
        print(f"   📝 {script[:50]}...")

        # TTS 생성 + 타이밍 추출
        duration, sentence_timings = await generate_tts_with_timing(scene_id, script)

        # 비디오 설정 결정
        video_settings = determine_video_settings(duration)

        # 씬 정보 생성
        scene = {
            "id": scene_id,
            "index": i,
            "title": title,
            "description": script,
            "startSec": round(current_time, 3),
            "endSec": round(current_time + duration, 3),
            "durationSec": round(duration, 3),
            "startFrame": int(current_time * FPS),
            "endFrame": int((current_time + duration) * FPS),
            "durationFrames": int(duration * FPS),
            # 비디오 설정
            "playbackMode": video_settings["playbackMode"],
            "videoFile": f"{video_settings['videoFolder']}/{scene_id}.mp4",
            "videoDuration": video_settings["videoDuration"],
            "needsTruncate": video_settings["needsTruncate"],
            "truncateDuration": video_settings["truncateDuration"],
            # 오디오
            "audioFile": f"clips-short/{scene_id}.mp3",
            # 문장별 타이밍 (씬 내 상대 시간)
            "sentences": sentence_timings
        }
        scenes.append(scene)

        # 타이밍 데이터 (전체 영상 기준 절대 시간)
        for st in sentence_timings:
            timing_data.append({
                "sceneId": scene_id,
                "sceneIndex": i,
                "text": st["text"],
                "absoluteStartSec": round(current_time + st["startSec"], 3),
                "absoluteEndSec": round(current_time + st["endSec"], 3),
                "relativeStartSec": st["startSec"],
                "relativeEndSec": st["endSec"],
                "durationSec": st["durationSec"]
            })

        # 상태 출력
        mode_emoji = {"truncate": "✂️", "loop": "🔄"}[video_settings["playbackMode"]]
        truncate_info = f"(10초 → {duration:.1f}초)" if video_settings["needsTruncate"] else ""
        print(f"   ⏱️  {duration:.2f}초 | {mode_emoji} {video_settings['playbackMode']} {truncate_info}")
        print(f"   📊 {len(sentence_timings)}개 문장 타이밍 추출")

        current_time += duration
        total_duration += duration

    # scenes-short.json 저장
    with open(SCENES_FILE, "w", encoding="utf-8") as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)

    # scenes-timing.json 저장 (SSOT)
    ssot_data = {
        "version": "1.0",
        "totalDurationSec": round(total_duration, 3),
        "totalFrames": int(total_duration * FPS),
        "fps": FPS,
        "scenes": scenes,
        "sentenceTimings": timing_data
    }
    with open(TIMING_FILE, "w", encoding="utf-8") as f:
        json.dump(ssot_data, f, ensure_ascii=False, indent=2)

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"✅ 총 {len(scenes)}개 씬 TTS 생성 완료")
    print(f"⏱️  총 길이: {total_duration:.2f}초 ({int(total_duration // 60)}분 {int(total_duration % 60)}초)")
    print(f"🎬 총 프레임: {int(total_duration * FPS)} frames")
    print(f"📄 scenes-short.json 업데이트됨")
    print(f"📄 scenes-timing.json 생성됨 (SSOT)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # 전체 나레이션도 합치기
    print("\n🔗 전체 나레이션 생성 중...")
    full_script = " ".join(SCENE_SCRIPTS)
    full_output = os.path.join(BASE_DIR, "../../public/audio/full_narration_short.mp3")
    communicate = edge_tts.Communicate(full_script, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(full_output)
    full_duration = get_audio_duration(full_output)
    print(f"✅ full_narration_short.mp3 생성 ({full_duration:.2f}초)")

    # Root.tsx 업데이트 안내
    print(f"\n📌 Root.tsx 업데이트 필요:")
    print(f"   durationInFrames={{{{ {int(total_duration * FPS)} }}}}")

    # 비디오 설정 요약
    print(f"\n📊 비디오 설정 요약:")
    for scene in scenes:
        mode = scene["playbackMode"]
        trunc = f"→ {scene['truncateDuration']:.1f}초" if scene["needsTruncate"] else ""
        print(f"   [{scene['id']}] {mode:12} | {scene['durationSec']:.1f}초 {trunc}")


if __name__ == "__main__":
    asyncio.run(main())
