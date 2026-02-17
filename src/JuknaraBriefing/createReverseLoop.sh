#!/bin/bash
# FFmpeg Reverse Loop 생성기 (Body 씬 전용)
# Body 씬: 5초 영상 → 10초 (원본 + 역재생)
# Opening/Closing: 스킵 (frame-stitch 방식으로 이미 처리됨)
#
# 사용법:
#   ./createReverseLoop.sh                    # Body 씬만 처리
#   ./createReverseLoop.sh scene03            # 특정 씬만 처리

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/../../public/videos/scenes"
OUTPUT_DIR="$SCRIPT_DIR/../../public/videos/scenes-extended"

# FFmpeg 경로 설정 (로컬 설치 우선)
FFMPEG="/Users/bjeonvjeon/bin/ffmpeg"
FFPROBE="/Users/bjeonvjeon/bin/ffprobe"
if [ ! -f "$FFMPEG" ]; then
  FFMPEG="ffmpeg"
  FFPROBE="ffprobe"
fi

# 출력 폴더 생성
mkdir -p "$OUTPUT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 FFmpeg Reverse Loop 생성기"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 입력: $INPUT_DIR"
echo "📂 출력: $OUTPUT_DIR"
echo "🔧 FFmpeg: $FFMPEG"
echo ""

# scenes-short.json에서 Opening/Closing 씬 ID 추출 (frame-stitch이므로 스킵 대상)
SCENES_JSON="$SCRIPT_DIR/scenes-short.json"
SKIP_SCENES=()
if [ -f "$SCENES_JSON" ] && command -v python3 &> /dev/null; then
  while IFS= read -r sid; do
    SKIP_SCENES+=("$sid")
  done < <(python3 -c "
import json
with open('$SCENES_JSON') as f:
    scenes = json.load(f)
for s in scenes:
    if s.get('sceneType') in ('opening', 'closing'):
        print(s['id'])
")
fi

if [ ${#SKIP_SCENES[@]} -gt 0 ]; then
  echo "⏭️  Opening/Closing 스킵 (frame-stitch): ${SKIP_SCENES[*]}"
  echo ""
fi

# 특정 씬만 처리하는 경우
if [ -n "$1" ]; then
  SCENES=("$1")
else
  # Body 씬 파일 목록 (Opening/Closing 제외)
  SCENES=()
  for file in "$INPUT_DIR"/*.mp4; do
    if [ -f "$file" ]; then
      basename=$(basename "$file" .mp4)
      # Opening/Closing 스킵
      SKIP=false
      for skip_id in "${SKIP_SCENES[@]}"; do
        if [ "$basename" = "$skip_id" ]; then
          SKIP=true
          break
        fi
      done
      if [ "$SKIP" = false ]; then
        SCENES+=("$basename")
      fi
    fi
  done
fi

TOTAL=${#SCENES[@]}
CURRENT=0
SUCCESS=0
SKIP=0
FAIL=0

for scene in "${SCENES[@]}"; do
  CURRENT=$((CURRENT + 1))
  INPUT_FILE="$INPUT_DIR/${scene}.mp4"
  OUTPUT_FILE="$OUTPUT_DIR/${scene}.mp4"

  echo "[$CURRENT/$TOTAL] 🎬 $scene"

  # 입력 파일 확인
  if [ ! -f "$INPUT_FILE" ]; then
    echo "   ⚠️  입력 파일 없음 - 스킵"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 이미 존재하면 스킵
  if [ -f "$OUTPUT_FILE" ]; then
    echo "   ⏭️  이미 존재 - 스킵"
    SKIP=$((SKIP + 1))
    continue
  fi

  # FFmpeg로 reverse loop 생성
  echo "   🔄 Reverse loop 생성 중..."

  # 임시 파일
  TEMP_REVERSED="$OUTPUT_DIR/${scene}_reversed.mp4"
  TEMP_LIST="$OUTPUT_DIR/${scene}_list.txt"

  # 1. 역재생 영상 생성 (오디오 포함)
  "$FFMPEG" -y -i "$INPUT_FILE" -vf reverse -af areverse "$TEMP_REVERSED" -loglevel warning

  # 2. concat 목록 생성
  echo "file '${INPUT_FILE}'" > "$TEMP_LIST"
  echo "file '${TEMP_REVERSED}'" >> "$TEMP_LIST"

  # 3. 합치기
  "$FFMPEG" -y -f concat -safe 0 -i "$TEMP_LIST" -c copy "$OUTPUT_FILE" -loglevel warning

  # 4. 임시 파일 삭제
  rm -f "$TEMP_REVERSED" "$TEMP_LIST"

  # 결과 확인
  if [ -f "$OUTPUT_FILE" ]; then
    DURATION=$("$FFPROBE" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null | cut -d. -f1)
    echo "   ✅ 생성 완료 (${DURATION}초)"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "   ❌ 생성 실패"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 결과"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 성공: $SUCCESS"
echo "⏭️  스킵: $SKIP"
echo "❌ 실패: $FAIL"
echo ""
echo "📁 출력 폴더: $OUTPUT_DIR"
