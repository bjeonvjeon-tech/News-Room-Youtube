#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎬 Cyberpunk Tech News — 숏폼 영상 제작 (9:16, 60초)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# ⚠️ 고정 포맷:
#   - 해상도: 1080x1920 (9:16 세로)
#   - FPS: 30
#   - 최대 길이: 60초
#   - 오디오: public/audio/full_narration_short.mp3
#   - 이미지: public/images-short/
#   - 클립 비디오: public/videos/clips-short/
#   - 출력: out/CyberpunkTechNewsShort.mp4
#
# 사용법:
#   ./produce-cyberpunk-short.sh              (전체 파이프라인)
#   ./produce-cyberpunk-short.sh --render-only (렌더만)
#
# 사전 준비:
#   1. script-short.ts 에 챕터 작성 완료
#   2. generateTTS-short.py 에 대본 붙여넣기 완료
#
# 파이프라인 (7단계):
#   1. Edge TTS → full_narration_short.mp3
#   2. afinfo → 실제 길이 측정 → script-short.ts + Root.tsx 프레임 보정
#   3. Gemini → 9:16 이미지 생성
#   4. ffmpeg → 오디오 8초 클립 분할 (clips-short.json)
#   5. Gemini → 클립별 비디오 프롬프트 생성 (videoPrompts-short.json)
#   6. Veo 3.1 → 클립 비디오 생성 (9:16, 8초)
#   7. Remotion → MP4 렌더링 (1080x1920)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

cd "$(dirname "$0")"
SRC="src/CyberpunkTechNews"
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
if [ "$1" = "--render-only" ]; then
  RENDER_ONLY=true
fi

# ━━━ Step 1~6: TTS + 프레임보정 + 이미지 + 클립 분할 + 프롬프트 + Veo ━━━
if [ "$RENDER_ONLY" = false ]; then

  # ── Step 1: TTS 생성 ──
  log "Step 1/7: TTS 나레이션 생성 (Edge TTS)"
  python3 "$SRC/generateTTS-short.py"
  ok "TTS 생성 완료"

  # ── Step 2: 오디오 길이 측정 → 프레임 보정 ──
  log "Step 2/7: 오디오 길이 측정 + 프레임 보정"
  AUDIO_FILE="$PUBLIC/audio/full_narration_short.mp3"

  if [ ! -f "$AUDIO_FILE" ]; then
    err "오디오 파일이 없습니다: $AUDIO_FILE"
  fi

  DURATION_SEC=$(afinfo "$AUDIO_FILE" 2>/dev/null | grep "estimated duration" | awk '{print $3}')
  if [ -z "$DURATION_SEC" ]; then
    DURATION_SEC=$(ffprobe -i "$AUDIO_FILE" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null || echo "")
  fi
  if [ -z "$DURATION_SEC" ]; then
    err "오디오 길이를 측정할 수 없습니다"
  fi

  DURATION_INT=$(echo "$DURATION_SEC" | awk '{printf "%d", $1}')
  TOTAL_FRAMES=$((DURATION_INT * 30))

  echo "  오디오 길이: ${DURATION_SEC}초 → ${TOTAL_FRAMES} frames"

  # 챕터 수 계산
  CHAPTER_COUNT=$(grep -c '"ch[0-9]' "$SRC/script-short.ts" || echo "4")
  SCENE_DUR=$((TOTAL_FRAMES / CHAPTER_COUNT))

  echo "  챕터 수: ${CHAPTER_COUNT}, 씬당: ${SCENE_DUR} frames"

  # script-short.ts 프레임 보정
  if grep -q "__TOTAL_DURATION__" "$SRC/script-short.ts"; then
    sed -i '' "s/__TOTAL_DURATION__/${TOTAL_FRAMES}/g" "$SRC/script-short.ts"
    sed -i '' "s/__SCENE_DUR__/${SCENE_DUR}/g" "$SRC/script-short.ts"
  else
    sed -i '' "s/TOTAL_DURATION = [0-9]*/TOTAL_DURATION = ${TOTAL_FRAMES}/" "$SRC/script-short.ts"
    sed -i '' "s/const SCENE_DUR = [0-9]*/const SCENE_DUR = ${SCENE_DUR}/" "$SRC/script-short.ts"
  fi

  # Root.tsx 숏폼 프레임 업데이트 (CyberpunkTechNewsShort의 durationInFrames)
  sed -i '' "/CyberpunkTechNewsShort/,/\/>/{s/durationInFrames={[0-9]*}/durationInFrames={${TOTAL_FRAMES}}/;}" "src/Root.tsx"

  ok "프레임 보정 완료: ${TOTAL_FRAMES} frames (${DURATION_INT}초)"

  # ── Step 3: 이미지 생성 (9:16) ──
  log "Step 3/7: 이미지 생성 (Gemini, 9:16)"
  npx ts-node "$SRC/generateImages-short.ts"
  ok "이미지 생성 완료"

  # ── Step 4: 오디오 클립 분할 ──
  log "Step 4/7: 오디오 8초 클립 분할 (ffmpeg)"
  npx ts-node "$SRC/splitAudio-short.ts"
  ok "오디오 클립 분할 완료"

  # ── Step 5: 클립별 비디오 프롬프트 생성 ──
  log "Step 5/7: 클립별 비디오 프롬프트 생성 (Gemini)"
  npx ts-node "$SRC/generateVideoPrompts-short.ts"
  ok "비디오 프롬프트 생성 완료"

  # ── Step 6: 클립 비디오 생성 (Veo 3.1, 9:16) ──
  log "Step 6/7: 클립 비디오 생성 (Veo 3.1, 9:16)"
  npx ts-node "$SRC/generateVideos-short.ts"
  ok "클립 비디오 생성 완료"

fi

# ━━━ Step 7: 영상 렌더링 ━━━
log "Step 7/7: 영상 렌더링 (Remotion, 1080x1920)"

# Remotion Studio가 떠있으면 죽이기
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

OUTPUT_FILE="out/CyberpunkTechNewsShort.mp4"
mkdir -p out

npx remotion render CyberpunkTechNewsShort "$OUTPUT_FILE" \
  --codec h264 \
  --concurrency 50%

ok "렌더링 완료!"

# ── 적나라브리핑 폴더로 복사 ──
DEST_DIR="$HOME/Documents/적나라브리핑"
if [ -d "$DEST_DIR" ]; then
  DEST_FILE="$DEST_DIR/cyberpunk-technews-short.mp4"
  cp "$OUTPUT_FILE" "$DEST_FILE"
  ok "적나라브리핑 폴더로 복사 완료: $DEST_FILE"
fi

# 결과 요약
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎬 Cyberpunk Tech News 숏폼 제작 완료! (9:16)${NC}"
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
