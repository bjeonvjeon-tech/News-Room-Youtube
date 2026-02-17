#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎬 적나라브리핑 2.0 — 숏폼 영상 제작 (9:16)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# 영상 구조:
#   - Opening (Hook): 뉴스룸 앵커 등장, 10초 이내
#   - Body (Visual Insight): 본문 애니메이션 (4가지 서브 스타일)
#   - Closing (Impact): 뉴스룸 복귀, 10초 이내
#
# ⚠️ 고정 포맷:
#   - 해상도: 1080x1920 (9:16 세로)
#   - FPS: 30
#   - TTS 음성: ko-KR-SunHiNeural (태리)
#   - 출력: out/JuknaraBriefingShort.mp4
#
# 사용법:
#   ./produce-short.sh              (전체 파이프라인)
#   ./produce-short.sh --render-only (렌더만)
#
# 사전 준비:
#   1. script-short.ts 에 챕터 작성 완료
#   2. generateTTS-timing.py 에 대본 붙여넣기 완료
#
# 파이프라인 (7단계):
#   1. Edge TTS (SSOT 타이밍) → clips-short/ + scenes-short.json
#   2. 오디오 길이 측정 → script-short.ts + Root.tsx 프레임 보정
#   3. Gemini → 9:16 씬 이미지 생성
#   4. Wan 2.5 I2V → 비디오 생성
#      - Opening/Closing: frame-stitch (5초 클립 이어붙이기, seamless)
#      - Body: 단일 5초 클립
#   5. ffmpeg → Body만 10초 reverse-loop 확장
#   6. (선택) Kling lipsync → Opening/Closing 입싱크
#   7. Remotion → MP4 렌더링 (1080x1920)
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
if [ "$1" = "--render-only" ]; then
  RENDER_ONLY=true
fi

# ━━━ Step 1~6: TTS + 이미지 + 비디오 생성 ━━━
if [ "$RENDER_ONLY" = false ]; then

  # ── Step 1: TTS 생성 (SSOT 타이밍 포함) ──
  log "Step 1/7: TTS 나레이션 + 타이밍 추출 (Edge TTS, SSOT)"
  python3 "$SRC/generateTTS-timing.py"
  ok "TTS + 타이밍 SSOT 생성 완료"

  # ── Step 2: 오디오 길이 측정 → 프레임 보정 ──
  log "Step 2/7: 오디오 길이 측정 + 프레임 보정"
  AUDIO_FILE="$PUBLIC/audio/full_narration_short.mp3"

  if [ ! -f "$AUDIO_FILE" ]; then
    err "오디오 파일이 없습니다: $AUDIO_FILE"
  fi

  # Try ffprobe first (linux), then afinfo (macOS)
  DURATION_SEC=$(ffprobe -i "$AUDIO_FILE" -show_entries format=duration -v quiet -of csv="p=0" 2>/dev/null || echo "")
  if [ -z "$DURATION_SEC" ]; then
    DURATION_SEC=$(afinfo "$AUDIO_FILE" 2>/dev/null | grep "estimated duration" | awk '{print $3}')
  fi
  if [ -z "$DURATION_SEC" ]; then
    err "오디오 길이를 측정할 수 없습니다"
  fi

  DURATION_INT=$(echo "$DURATION_SEC" | awk '{printf "%d", $1}')
  TOTAL_FRAMES=$((DURATION_INT * 30))

  echo "  오디오 길이: ${DURATION_SEC}초 → ${TOTAL_FRAMES} frames"

  # script-short.ts 프레임 보정
  if grep -q "__TOTAL_DURATION__" "$SRC/script-short.ts"; then
    sed -i "s/__TOTAL_DURATION__/${TOTAL_FRAMES}/g" "$SRC/script-short.ts"
  else
    sed -i "s/TOTAL_DURATION = [0-9]*/TOTAL_DURATION = ${TOTAL_FRAMES}/" "$SRC/script-short.ts"
  fi

  # Root.tsx 숏폼 프레임 업데이트 (JuknaraBriefingShort의 durationInFrames)
  sed -i "/JuknaraBriefingShort/,/\/>/{s/durationInFrames={[0-9]*}/durationInFrames={${TOTAL_FRAMES}}/;}" "src/Root.tsx"

  ok "프레임 보정 완료: ${TOTAL_FRAMES} frames (${DURATION_INT}초)"

  # ── Step 3: 씬 이미지 생성 (Gemini, I2V용) ──
  log "Step 3/7: 씬 이미지 생성 (Gemini 3 Pro, 9:16)"
  npx ts-node "$SRC/generateSceneImages.ts"
  ok "씬 이미지 생성 완료"

  # ── Step 4: I2V 비디오 생성 (Wan 2.5) ──
  log "Step 4/7: I2V 비디오 생성 (Wan 2.5)"
  echo "  🔗 Opening/Closing: frame-stitch (5초 클립 이어붙이기)"
  echo "  🎨 Body: 단일 5초 클립"
  npx ts-node "$SRC/generateVideos-i2v.ts"
  ok "I2V 비디오 생성 완료"

  # ── Step 5: Body 씬 reverse-loop 확장 ──
  log "Step 5/7: Body 씬 reverse-loop 확장 (5초 → 10초)"
  echo "  ⏭️  Opening/Closing은 Step 4에서 frame-stitch로 이미 처리됨"
  npx ts-node "$SRC/createReverseLoop.ts" 2>/dev/null || bash "$SRC/createReverseLoop.sh" 2>/dev/null || echo "  ⚠️ reverse-loop 스킵 (수동 처리 필요)"
  ok "Body reverse-loop 확장 완료"

  # ── Step 6: (선택) Kling lipsync (Opening/Closing) ──
  log "Step 6/7: Kling lipsync (선택사항)"
  echo "  ⚠️ Opening/Closing lipsync는 수동으로 Kling에서 처리하세요"
  echo "  📁 입력: public/videos/scenes-extended/scene01.mp4 (오프닝)"
  echo "  📁 입력: public/videos/scenes-extended/sceneN.mp4 (클로징)"
  echo "  🎙️ 오디오: public/audio/clips-short/scene01.mp3, sceneN.mp3"

fi

# ━━━ Step 7: 영상 렌더링 ━━━
log "Step 7/7: 영상 렌더링 (Remotion, 1080x1920)"

# Remotion Studio가 떠있으면 죽이기
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

OUTPUT_FILE="out/JuknaraBriefingShort.mp4"
mkdir -p out

npx remotion render JuknaraBriefingShort "$OUTPUT_FILE" \
  --codec h264 \
  --concurrency 50%

ok "렌더링 완료!"

# 결과 요약
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎬 적나라브리핑 숏폼 영상 제작 완료! (9:16)${NC}"
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
