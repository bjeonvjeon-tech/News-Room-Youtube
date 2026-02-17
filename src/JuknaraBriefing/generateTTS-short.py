#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edge TTS 나레이션 오디오 생성기 (숏폼용)
목표: 50~60초
주제: 발렌타인데이 큐피드 세금 - 한국 영향
"""

import asyncio
import os
import edge_tts

VOICE = "ko-KR-InJoonNeural"
RATE = "+30%"
VOLUME = "+0%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/audio")
OUTPUT_FILE = "full_narration_short.mp3"

# 원본 스크립트
FULL_SCRIPT = """오늘 발렌타인데인데요, 미국에서 장미 한 다발이 93달러입니다. 작년보다 또 올랐어요.
이유가 뭐냐면, 관세입니다. 미국 절화의 80%가 콜롬비아, 에콰도르 수입인데 관세가 다 붙었거든요. 초콜릿도 마찬가지예요. 소비자 가격이 전년 대비 14.4% 폭등했습니다. 금값은요? 온스당 5,000달러를 넘겼어요. 주얼리 관세까지 5%에서 25%로 뛰면서, 올해 발렌타인데이에 추가된 관세 비용만 25억 달러. 이름까지 붙었습니다. "큐피드 세금."
근데 이게 한국이랑 상관없는 얘기가 아닌 거예요.
첫째, 초콜릿입니다. 한국도 카카오 100% 수입국이에요. 코코아 가격 폭등이 그대로 전달됩니다.
둘째, 금값이에요. 금 온스당 5,000달러면 한국 주얼리 시장도 원가가 폭등하는 구조입니다.
셋째, 화이트데이예요. 한 달 뒤 3월 14일, 한국이 세계 최대 화이트데이 소비국인 거 아시죠? 올해는 역대급으로 비쌀 겁니다.
사랑에도 관세가 붙는 시대, 여러분은 어떻게 준비하고 계신가요?"""


async def generate_tts():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    print(f"🎙️ Generating TTS -> {OUTPUT_FILE}")
    print(f"📝 Script:\n{FULL_SCRIPT}\n")
    communicate = edge_tts.Communicate(FULL_SCRIPT, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(output_path)
    print(f"✅ Saved: {output_path}")

    # 길이 확인
    try:
        import subprocess
        result = subprocess.run(["afinfo", output_path], capture_output=True, text=True)
        for line in result.stdout.split("\n"):
            if "duration" in line.lower():
                print(f"⏱️  {line.strip()}")
    except:
        pass


if __name__ == "__main__":
    asyncio.run(generate_tts())
