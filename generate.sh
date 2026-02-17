#!/bin/bash
# ======================================
# Stick Figure Economics — 영상 생성 파이프라인
# ======================================
#
# 새로운 주제로 영상을 만드는 방법:
#
# 1. src/JuknaraBriefing/script.ts 수정:
#    - TOPIC, TITLE 변경
#    - SCRIPT 배열에 6개의 Chapter 작성
#      (각 chapter: id, title, script, imagePrompt, duration=250)
#
# 2. src/JuknaraBriefing/generateTTS.py 수정:
#    - FULL_SCRIPT 변수를 script.ts의 나레이션과 동기화
#
# 3. 이 스크립트 실행:
#    bash generate.sh
#
# 4. Remotion Studio에서 확인:
#    npx remotion studio
#
# ======================================

set -e

echo "=========================================="
echo "  Stick Figure Economics — 영상 생성 시작"
echo "=========================================="

cd "$(dirname "$0")"

# Step 1: TTS 오디오 생성
echo ""
echo "[1/3] TTS 나레이션 생성 중..."
python3 src/JuknaraBriefing/generateTTS.py

# Step 2: 이미지 생성
echo ""
echo "[2/3] Stick Figure 이미지 생성 중..."
npx ts-node src/JuknaraBriefing/generateImages.ts

# Step 3: Remotion Studio 실행
echo ""
echo "[3/3] 완료! Remotion Studio를 실행합니다."
echo ""
echo "=========================================="
echo "  브라우저에서 http://localhost:3000 확인"
echo "=========================================="
npx remotion studio
