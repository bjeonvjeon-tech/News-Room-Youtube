#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎬 Stick Figure Economics — 원커맨드 롱폼 영상 제작
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# 사용법:
#   ./produce.sh --file input.txt      (완성된 스크립트 파일)
#   ./produce.sh --render-only         (스크립트/TTS/이미지 건너뛰고 렌더만)
#
# 파이프라인 (이미지 전용 5단계):
#   1. 원본 스크립트 파싱 → script.ts + generateTTS.py (Gemini: viralTag/imageScene만)
#   2. Edge TTS → full_narration.mp3
#   3. afinfo → 실제 길이 측정 → script.ts + Root.tsx 프레임 보정
#   4. NanoBanana Pro (Gemini 3 Pro Image) → 이미지 생성
#   5. Remotion → MP4 렌더링
#
# Veo 비디오 파이프라인 (8단계 — 별도 옵션):
#   위 1~4 + 오디오 클립 분할 + 비디오 프롬프트 + Veo 3.1 + Remotion
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

cd "$(dirname "$0")"
SRC="src/JuknaraBriefing"
PUBLIC="public"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}━━━ $1 ━━━${NC}"; }
ok()  { echo -e "${GREEN}✅ $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── 인자 파싱 ──
RENDER_ONLY=false
INPUT=""

if [ "$1" = "--render-only" ]; then
  RENDER_ONLY=true
elif [ "$1" = "--file" ] && [ -n "$2" ]; then
  INPUT="--file $2"
else
  echo -e "${YELLOW}사용법:${NC}"
  echo "  ./produce.sh --file input.txt     (완성된 스크립트 파일)"
  echo "  ./produce.sh --render-only        (렌더만)"
  exit 1
fi

# ━━━ Step 1: AI 스크립트 생성 ━━━
if [ "$RENDER_ONLY" = false ]; then
  log "Step 1/5: 스크립트 파싱 + 메타데이터 생성 (Gemini Flash)"
  npx ts-node "$SRC/generateScript.ts" $INPUT
  ok "script.ts + generateTTS.py 생성 완료"

  # ━━━ Step 2: TTS 생성 ━━━
  log "Step 2/5: TTS 나레이션 생성 (Edge TTS)"
  python3 "$SRC/generateTTS.py"
  ok "TTS 생성 완료"

  # ━━━ Step 3: 실제 오디오 길이 측정 → 프레임 보정 ━━━
  log "Step 3/5: 오디오 길이 측정 + 프레임 보정"
  AUDIO_FILE="$PUBLIC/audio/full_narration.mp3"

  if [ ! -f "$AUDIO_FILE" ]; then
    err "오디오 파일이 없습니다: $AUDIO_FILE"
  fi

  # afinfo로 실제 길이 측정
  DURATION_SEC=$(afinfo "$AUDIO_FILE" 2>/dev/null | grep "estimated duration" | awk '{print $3}')

  if [ -z "$DURATION_SEC" ]; then
    # fallback: ffprobe
    DURATION_SEC=$(ffprobe -i "$AUDIO_FILE" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null || echo "")
  fi

  if [ -z "$DURATION_SEC" ]; then
    err "오디오 길이를 측정할 수 없습니다"
  fi

  # 소수점 버림 후 프레임 계산
  DURATION_INT=$(echo "$DURATION_SEC" | awk '{printf "%d", $1}')
  TOTAL_FRAMES=$((DURATION_INT * 30))

  echo "  오디오 길이: ${DURATION_SEC}초 → ${TOTAL_FRAMES} frames"

  # script.ts의 챕터 수 계산
  CHAPTER_COUNT=$(grep -c '"ch[0-9]' "$SRC/script.ts" || echo "17")
  SCENE_DUR=$((TOTAL_FRAMES / CHAPTER_COUNT))

  echo "  챕터 수: ${CHAPTER_COUNT}, 씬당: ${SCENE_DUR} frames"

  # script.ts에서 플레이스홀더 또는 기존 값 교체
  if grep -q "__TOTAL_DURATION__" "$SRC/script.ts"; then
    sed -i '' "s/__TOTAL_DURATION__/${TOTAL_FRAMES}/g" "$SRC/script.ts"
    sed -i '' "s/__SCENE_DUR__/${SCENE_DUR}/g" "$SRC/script.ts"
  else
    # 기존 값 교체 (TOTAL_DURATION = 숫자)
    sed -i '' "s/TOTAL_DURATION = [0-9]*/TOTAL_DURATION = ${TOTAL_FRAMES}/" "$SRC/script.ts"
    sed -i '' "s/const SCENE_DUR = [0-9]*/const SCENE_DUR = ${SCENE_DUR}/" "$SRC/script.ts"
  fi

  # Root.tsx 프레임 업데이트
  sed -i '' "s/durationInFrames={[0-9]*}/durationInFrames={${TOTAL_FRAMES}}/" "src/Root.tsx"

  ok "프레임 보정 완료: ${TOTAL_FRAMES} frames (${DURATION_INT}초)"

  # ━━━ Step 4: 이미지 생성 (NanoBanana Pro) ━━━
  log "Step 4/5: 이미지 생성 (NanoBanana Pro / Gemini 3 Pro Image)"

  npx ts-node "$SRC/generateImages.ts"
  ok "이미지 생성 완료"
fi

# ━━━ Step 5: 영상 렌더링 ━━━
log "Step 5/5: 영상 렌더링 (Remotion)"

# Remotion Studio가 떠있으면 죽이기
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

OUTPUT_FILE="out/JuknaraBriefing.mp4"
mkdir -p out

npx remotion render JuknaraBriefing "$OUTPUT_FILE" \
  --codec h264 \
  --concurrency 50%

ok "렌더링 완료!"

# 결과 요약
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎬 영상 제작 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  📁 파일: ${YELLOW}$(pwd)/$OUTPUT_FILE${NC}"

if [ -f "$OUTPUT_FILE" ]; then
  SIZE=$(du -h "$OUTPUT_FILE" | awk '{print $1}')
  echo -e "  📦 크기: ${YELLOW}${SIZE}${NC}"
fi

echo ""
echo -e "  💡 Studio에서 미리보기: ${CYAN}npx remotion studio${NC}"
echo -e "  💡 파일 열기: ${CYAN}open $OUTPUT_FILE${NC}"
echo ""
