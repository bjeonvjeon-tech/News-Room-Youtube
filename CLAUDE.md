# Stick Figure Economics - 숏폼 영상 제작 파이프라인

## 프로젝트 개요
경제 뉴스를 스틱피겨 캐릭터로 설명하는 9:16 숏폼 영상 제작 파이프라인

## 핵심 파일 구조
```
src/StickFigureEconomics/
├── script-short.ts          # 스크립트 + 캐릭터/스타일 정의 (CHAR, STYLE 변수)
├── generateTTS-short.py     # TTS 생성 (Edge TTS)
├── scenes-short.json        # 씬 타이밍 + 프롬프트
├── generateSceneImages.ts   # Gemini 3 Pro 이미지 생성
├── generateVideos-i2v.ts    # Wan 2.5 I2V 비디오 생성
└── StickFigureEconomicsShort.tsx  # Remotion 렌더링 컴포넌트
```

## 실행 순서
```bash
# 1. TTS 생성 (generateTTS-short.py의 FULL_SCRIPT 수정 후)
python3 src/StickFigureEconomics/generateTTS-short.py

# 2. 이미지 생성 (Gemini, 무료)
npx ts-node src/StickFigureEconomics/generateSceneImages.ts

# 3. I2V 비디오 생성 (Wan 2.5, $2.00)
npx ts-node src/StickFigureEconomics/generateVideos-i2v.ts

# 4. 최종 렌더링
npx remotion render StickFigureEconomicsShort out/[filename].mp4
```

## 제작 규칙
- **스크립트 길이**: 40-50초 (10개 씬 × 4-5초)
- **해상도**: 1080×1920 (9:16 숏폼)
- **TTS**: Edge TTS, ko-KR-InJoonNeural, rate +30%
- **배경 비디오 볼륨**: 0.2 (20%)
- **자막 폰트**: 지마켓산스
- **Viral Tag**: 왼쪽 상단, 형광초록, 영어 대문자

## 현재 캐릭터 & 스타일 (script-short.ts)

### CHAR (캐릭터)
```typescript
const CHAR = `Simple cute stick-figure character with round head and minimal facial features (dot eyes, simple smile), thin black line body, standing in a HIGHLY DETAILED realistic background.`;
```

### STYLE (배경 스타일)
```typescript
const STYLE = `Korean pencil-tinted social webtoon style with HIGHLY DETAILED realistic background environment.
Light paper-grain texture, restrained crosshatch shading, clear line-weight hierarchy from heavy silhouettes to mid interior forms to ultra-thin details.
Shading uses clean cel blocks with faint graphite wash at major form turns; highlights stay matte, broad, subdued.
Color policy: low-saturation warm grays and muted earths with strict value grouping, one sparse accent color family.
Lighting: soft diffuse key with gentle fill, no hard rim lights.
Background must include rich architectural details, environmental storytelling elements, realistic perspective and depth.
No text, captions, logos, or watermarks. 9:16 portrait composition.
Consistent character model across all scenes.`;
```

## API 키
- **Gemini**: generateSceneImages.ts 내 하드코딩
- **fal.ai (Wan I2V)**: generateVideos-i2v.ts 내 하드코딩

## 비용
- TTS: 무료 (Edge TTS)
- 이미지: 무료 (Gemini 3 Pro)
- 비디오: $2.00 (Wan 2.5 I2V, 10개 × $0.20)
- **총 비용: $2.00/영상**

## 새 영상 제작 시
1. `generateTTS-short.py`의 `FULL_SCRIPT` 수정
2. `script-short.ts`의 `SCRIPT_SHORT` 배열 수정 (10개 씬)
3. `scenes-short.json` 업데이트
4. `Root.tsx`의 `durationInFrames` 조정 (초 × 30)
5. 파이프라인 실행

## 새 스크립트 제공 시 Claude에게 요청
"새 스크립트로 숏폼 만들어줘: [스크립트 내용]"
