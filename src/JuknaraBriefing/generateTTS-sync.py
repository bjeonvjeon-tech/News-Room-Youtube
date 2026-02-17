#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edge TTS 나레이션 오디오 생성기 (씬별 동기화 버전)

각 씬별로 TTS를 생성하고, 씬 타이밍을 오디오 길이에 맞춰 자동 계산
→ scenes-short.json 업데이트 (playbackMode 포함)

playbackMode 결정 로직:
- 오디오 <= 5초: "normal" (비디오 그대로 재생)
- 5초 < 오디오 <= 10초: "loop" (비디오 반복)
- 오디오 > 10초: "loop" (비디오 계속 반복)
"""

import asyncio
import os
import json
import edge_tts
import subprocess

VOICE = "ko-KR-InJoonNeural"
RATE = "+30%"
VOLUME = "+0%"
VIDEO_DURATION = 5.0  # Wan I2V 비디오 길이 (초)

BASE_DIR = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(BASE_DIR, "../../public/audio/clips-short")
SCENES_FILE = os.path.join(BASE_DIR, "scenes-short.json")

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


def determine_playback_mode(audio_duration: float) -> str:
    """
    오디오 길이에 따라 playbackMode 결정

    Returns:
        playbackMode
        - normal: 5초 이하, 비디오 그대로 재생
        - loop: 5초 초과, 비디오 반복 재생

    Note:
        reverse-loop는 FFmpeg 사전 처리가 필요하므로,
        현재는 loop로 대체합니다.
        FFmpeg 설치 후 createReverseLoop.sh를 실행하면
        scenes-extended/에 10초 영상이 생성됩니다.
    """
    if audio_duration <= VIDEO_DURATION:
        return "normal"  # 비디오 그대로
    else:
        return "loop"  # 비디오 반복


async def generate_scene_tts(scene_id: str, script: str) -> float:
    """단일 씬의 TTS 생성하고 길이 반환"""
    output_path = os.path.join(OUTPUT_DIR, f"{scene_id}.mp3")

    communicate = edge_tts.Communicate(script, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(output_path)

    duration = get_audio_duration(output_path)
    return duration


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("🎙️ 씬별 TTS 생성 + 타이밍 동기화")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    scenes = []
    current_time = 0.0
    total_duration = 0.0

    for i, (script, title) in enumerate(zip(SCENE_SCRIPTS, SCENE_TITLES)):
        scene_id = f"scene{str(i + 1).zfill(2)}"
        print(f"🎬 [{scene_id}] {title}")
        print(f"   📝 {script[:50]}...")

        # TTS 생성
        duration = await generate_scene_tts(scene_id, script)
        playback_mode = determine_playback_mode(duration)

        # 씬 정보 생성
        scene = {
            "id": scene_id,
            "index": i,
            "title": title,
            "description": script,
            "startSec": round(current_time, 2),
            "endSec": round(current_time + duration, 2),
            "durationSec": round(duration, 2),
            "videoDurationSec": VIDEO_DURATION,
            "playbackMode": playback_mode,
            "flowPrompt": f"Scene for: {title}",
            "videoFile": f"scenes/{scene_id}.mp4",
            "audioFile": f"clips-short/{scene_id}.mp3",
        }
        scenes.append(scene)

        mode_emoji = "🔄" if playback_mode == "loop" else "▶️"
        print(f"   ⏱️  {duration:.2f}초 | {mode_emoji} {playback_mode}")

        current_time += duration
        total_duration += duration

    # scenes-short.json 저장
    with open(SCENES_FILE, "w", encoding="utf-8") as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"✅ 총 {len(scenes)}개 씬 TTS 생성 완료")
    print(f"⏱️  총 길이: {total_duration:.2f}초 ({int(total_duration // 60)}분 {int(total_duration % 60)}초)")
    print(f"🎬 총 프레임: {int(total_duration * 30)} frames")
    print(f"📄 scenes-short.json 업데이트됨")
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
    print(f"   durationInFrames={{{{ {int(total_duration * 30)} }}}}")


if __name__ == "__main__":
    asyncio.run(main())
