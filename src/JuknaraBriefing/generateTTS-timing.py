#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
적나라브리핑 2.0 — TTS 타이밍 분석기 (SSOT - Single Source of Truth)

Edge TTS의 WordBoundary 이벤트를 사용하여 문장별 정확한 타이밍을 추출합니다.
이 타이밍 데이터는 이미지/영상 편집의 기준이 됩니다.

영상 구조:
- Opening (scene01): 뉴스룸 앵커 등장, 10초 이내
- Body (scene02~N-1): 본문 애니메이션
- Closing (sceneN): 뉴스룸 복귀, 10초 이내

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

VOICE = "ko-KR-SunHiNeural"  # 여성 뉴스 앵커 목소리 (태리)
RATE = "+10%"
VOLUME = "+0%"
VIDEO_DURATION = 5.0  # 원본 비디오 길이 (초)
EXTENDED_VIDEO_DURATION = 10.0  # reverse-loop 비디오 길이 (초)
FPS = 30

BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "../../public/audio/clips-short")
SCENES_FILE = os.path.join(BASE_DIR, "scenes-short.json")
TIMING_FILE = os.path.join(BASE_DIR, "scenes-timing.json")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 씬별 스크립트 — 새 영상 제작 시 여기만 수정
# 구조: [Opening, Body1, Body2, ..., Closing]
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCENE_SCRIPTS = [
    # [0] Opening — 뉴스룸 앵커 등장
    "미국 현지 직통 뉴스, 적나라브리핑입니다. AI 도구 하나가 하루 만에 글로벌 소프트웨어 주식 2,850억 달러를 증발시켰습니다. 이거 남의 나라 얘기가 아닙니다. 바로 보시죠.",
    # [1] Body — AI 에이전트 등장
    "무슨 일이 벌어졌냐면요. Anthropic이 Claude Cowork이라는 AI 에이전트에 법률, 금융, 마케팅 플러그인을 달았어요. 이게 뭐냐면, 기업들이 매달 돈 내고 쓰던 비싼 소프트웨어를 AI 하나가 대체해버릴 수 있다는 얘기거든요. 계약서 검토, 데이터 분석, 보고서 작성까지 전부요.",
    # [2] Body — 시장 폭락
    "시장 반응이 장난이 아니었습니다. S&P 500 소프트웨어 지수가 하루에 6% 폭락했고, 톰슨로이터는 하루 만에 16% 빠졌어요. 세일즈포스는 올해만 26% 하락. 소프트웨어 업종 전체가 고점 대비 시가총액 2조 달러가 날아갔습니다. 근데 진짜 무서운 건요, 엔비디아 젠슨 황이 비논리적 공포라고 진화했는데도 매도세가 멈추질 않았다는 거예요.",
    # [3] Body — 한국 IT 서비스 직격탄
    "이게 한국이랑 무슨 상관이냐고요? 첫째, IT 서비스 기업입니다. 인도 TCS, 인포시스가 같이 폭락했는데, 삼성SDS, LG CNS 같은 한국 IT 서비스도 똑같은 구조거든요. AI가 SI 사업을 먹기 시작하면 직격탄이에요.",
    # [4] Body — 취업시장 + 투자
    "둘째, 취업시장입니다. Anthropic CEO가 직접 1에서 5년 내 화이트칼라 초급 일자리 절반이 사라진다고 경고했어요. 한국 청년들 해외 취업은커녕 국내 사무직도 좁아질 수 있습니다. 셋째, 투자입니다. 나스닥이 흔들리면 코스피 IT주도 같이 끌려 내려가잖아요. 실제로 이번에 아시아 IT주 전부 빠졌습니다.",
    # [5] Body — 결론적 경고
    "솔직히 이게 장난이 아닌 게요. AI가 도구에서 경쟁자로 바뀌는 순간, 돈의 흐름 자체가 뒤집히는 겁니다.",
    # [6] Closing — 뉴스룸 복귀
    "결국 AI 회사들은 소프트웨어를 도와주는 척하다가, 이제 대놓고 밥그릇을 뺏기 시작한 겁니다. 우리가 멍하니 보고만 있으면 안 되겠죠? 여러분은 이 판이 위기입니까, 기회입니까? 미국이 변하면 우리 지갑도 변합니다. 적나라브리핑이었습니다.",
]

SCENE_TITLES = [
    "오프닝",
    "AI 에이전트의 등장",
    "2,850억 달러 폭락",
    "한국 IT 직격탄",
    "취업·투자 충격파",
    "도구에서 경쟁자로",
    "클로징",
]

# 씬 타입 매핑 (첫 번째=opening, 마지막=closing, 나머지=body)
def get_scene_type(index: int, total: int) -> str:
    if index == 0:
        return "opening"
    elif index == total - 1:
        return "closing"
    else:
        return "body"


def get_audio_duration(filepath: str) -> float:
    """오디오 파일의 길이(초)를 반환"""
    try:
        # Try ffprobe first (linux)
        result = subprocess.run(
            ["ffprobe", "-i", filepath, "-show_entries", "format=duration",
             "-v", "quiet", "-of", "csv=p=0"],
            capture_output=True, text=True
        )
        if result.stdout.strip():
            return float(result.stdout.strip())
    except Exception:
        pass
    try:
        # Try afinfo (macOS)
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


def determine_video_settings(audio_duration: float, scene_type: str) -> Dict:
    """
    오디오 길이 + 씬 타입에 따라 비디오 설정 결정

    Opening/Closing: 5초 클립을 frame-stitch로 이어붙여 TTS 길이에 맞춤
                     (마지막 프레임 = 다음 클립 시작 프레임, seamless)
    Body: 5초 → 10초 reverse-loop 확장 후 truncate/loop
    """
    import math

    if scene_type in ("opening", "closing"):
        # Frame-stitch: 5초 단위 클립을 이어붙임
        clips_needed = max(1, math.ceil(audio_duration / VIDEO_DURATION))
        stitched_duration = clips_needed * VIDEO_DURATION
        return {
            "playbackMode": "truncate",
            "videoFolder": "scenes-extended",
            "videoDuration": stitched_duration,
            "needsTruncate": audio_duration < stitched_duration,
            "truncateDuration": audio_duration,
            "clipsNeeded": clips_needed,
            "videoMode": "frame-stitch"
        }
    else:
        # Body: reverse-loop (5초 → 10초)
        if audio_duration <= EXTENDED_VIDEO_DURATION:
            return {
                "playbackMode": "truncate",
                "videoFolder": "scenes-extended",
                "videoDuration": EXTENDED_VIDEO_DURATION,
                "needsTruncate": True,
                "truncateDuration": audio_duration,
                "videoMode": "reverse-loop"
            }
        else:
            return {
                "playbackMode": "loop",
                "videoFolder": "scenes-extended",
                "videoDuration": EXTENDED_VIDEO_DURATION,
                "needsTruncate": False,
                "truncateDuration": audio_duration,
                "videoMode": "reverse-loop"
            }


async def generate_tts_with_timing(scene_id: str, script: str) -> Tuple[float, List[Dict]]:
    """
    TTS 생성하면서 WordBoundary 이벤트로 타이밍 추출
    """
    output_path = os.path.join(OUTPUT_DIR, f"{scene_id}.mp3")

    communicate = edge_tts.Communicate(script, VOICE, rate=RATE, volume=VOLUME)

    word_timings = []
    audio_data = b""

    async for event in communicate.stream():
        if event["type"] == "WordBoundary":
            word_timings.append({
                "text": event["text"],
                "start_ms": event["offset"],
                "duration_ms": event["duration"]
            })
        elif event["type"] == "audio":
            audio_data += event["data"]

    with open(output_path, "wb") as f:
        f.write(audio_data)

    total_duration = get_audio_duration(output_path)

    sentences = split_into_sentences(script)
    sentence_timings = []

    if word_timings:
        current_word_idx = 0

        for sentence in sentences:
            sentence_start = None
            sentence_end = None

            remaining_text = sentence
            while current_word_idx < len(word_timings) and remaining_text:
                word_data = word_timings[current_word_idx]
                word_text = word_data["text"]

                if word_text in remaining_text:
                    if sentence_start is None:
                        sentence_start = word_data["start_ms"] / 10_000_000

                    end_time = (word_data["start_ms"] + word_data["duration_ms"]) / 10_000_000
                    sentence_end = end_time

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
    print("🎙️ 적나라브리핑 2.0 — TTS 타이밍 분석기 (SSOT)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"🗣️ 음성: {VOICE} (속도: {RATE})")
    print("📌 이 타이밍 데이터가 모든 영상 편집의 기준입니다.\n")

    scenes = []
    timing_data = []
    current_time = 0.0
    total_duration = 0.0
    total_scenes = len(SCENE_SCRIPTS)

    for i, (script, title) in enumerate(zip(SCENE_SCRIPTS, SCENE_TITLES)):
        scene_id = f"scene{str(i + 1).zfill(2)}"
        scene_type = get_scene_type(i, total_scenes)
        type_emoji = {"opening": "📺", "body": "🎨", "closing": "📺"}[scene_type]

        print(f"{type_emoji} [{scene_id}] {title} ({scene_type})")
        print(f"   📝 {script[:50]}...")

        duration, sentence_timings = await generate_tts_with_timing(scene_id, script)

        video_settings = determine_video_settings(duration, scene_type)

        scene = {
            "id": scene_id,
            "index": i,
            "title": title,
            "description": script,
            "sceneType": scene_type,
            "startSec": round(current_time, 3),
            "endSec": round(current_time + duration, 3),
            "durationSec": round(duration, 3),
            "startFrame": int(current_time * FPS),
            "endFrame": int((current_time + duration) * FPS),
            "durationFrames": int(duration * FPS),
            "playbackMode": video_settings["playbackMode"],
            "videoFile": f"{video_settings['videoFolder']}/{scene_id}.mp4",
            "videoDuration": video_settings["videoDuration"],
            "needsTruncate": video_settings["needsTruncate"],
            "truncateDuration": video_settings["truncateDuration"],
            "videoMode": video_settings.get("videoMode", "reverse-loop"),
            "clipsNeeded": video_settings.get("clipsNeeded", 1),
            "audioFile": f"clips-short/{scene_id}.mp3",
            "sentences": sentence_timings
        }
        scenes.append(scene)

        for st in sentence_timings:
            timing_data.append({
                "sceneId": scene_id,
                "sceneIndex": i,
                "sceneType": scene_type,
                "text": st["text"],
                "absoluteStartSec": round(current_time + st["startSec"], 3),
                "absoluteEndSec": round(current_time + st["endSec"], 3),
                "relativeStartSec": st["startSec"],
                "relativeEndSec": st["endSec"],
                "durationSec": st["durationSec"]
            })

        video_mode = video_settings.get("videoMode", "reverse-loop")
        if video_mode == "frame-stitch":
            clips = video_settings.get("clipsNeeded", 1)
            mode_emoji = "🔗"
            mode_info = f"frame-stitch ({clips}x5초={clips*5}초)"
        else:
            mode_emoji = {"truncate": "✂️", "loop": "🔄"}[video_settings["playbackMode"]]
            mode_info = f"{video_settings['playbackMode']}"
        truncate_info = f"→ {duration:.1f}초" if video_settings["needsTruncate"] else ""
        print(f"   ⏱️  {duration:.2f}초 | {mode_emoji} {mode_info} {truncate_info}")
        print(f"   📊 {len(sentence_timings)}개 문장 타이밍 추출")

        current_time += duration
        total_duration += duration

    # scenes-short.json 저장
    with open(SCENES_FILE, "w", encoding="utf-8") as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)

    # scenes-timing.json 저장 (SSOT)
    ssot_data = {
        "version": "2.0",
        "project": "적나라브리핑",
        "totalDurationSec": round(total_duration, 3),
        "totalFrames": int(total_duration * FPS),
        "fps": FPS,
        "voice": VOICE,
        "rate": RATE,
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
        stype = scene["sceneType"]
        trunc = f"→ {scene['truncateDuration']:.1f}초" if scene["needsTruncate"] else ""
        print(f"   [{scene['id']}] {stype:8} | {mode:12} | {scene['durationSec']:.1f}초 {trunc}")


if __name__ == "__main__":
    asyncio.run(main())
