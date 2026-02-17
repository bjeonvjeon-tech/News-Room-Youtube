#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Edge TTS 나레이션 오디오 생성기 (숏폼용)
목표: 40~50초
주제: 빅테크 AI 투자 650조 원 — 버블인가 기회인가
"""

import asyncio
import os
import edge_tts

VOICE = "ko-KR-InJoonNeural"
RATE = "+30%"
VOLUME = "+0%"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "../../public/audio")
OUTPUT_FILE = "full_narration_short.mp3"

# 압축된 스크립트 (50초 목표)
FULL_SCRIPT = """650조 원. 올해 빅테크 4곳이 AI에 쏟아붓겠다는 돈입니다.
아마존 200조, 구글 185조, 마이크로소프트 105조, 메타 135조. 전년 대비 60% 폭증이에요.
블룸버그는 이 세기에 유례없는 투자라고 했습니다. 이 돈은 거의 전부 데이터센터와 AI 칩에 들어갑니다.
한국에 왜 중요하냐고요?
첫째, 반도체입니다. AI 서버에는 HBM 메모리가 필수인데, 삼성과 SK하이닉스가 전 세계 공급을 쥐고 있습니다.
둘째, 장비입니다. 데이터센터 건설 붐은 한국 전력장비, 냉각장비 수출로 직결됩니다.
셋째, 주가입니다. 빅테크가 돈을 쓸수록 삼성전자와 SK하이닉스도 동반 상승합니다.
그런데 투자자들은 오히려 불안합니다. 이번 주 빅테크 시총 9천억 달러가 증발했거든요.
AI 투자 광풍, 버블일까요 기회일까요?"""


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
