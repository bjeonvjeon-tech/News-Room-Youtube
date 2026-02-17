# 숏폼 영상 템플릿 - 새 프로젝트 생성 가이드

## 새 캐릭터/스타일로 프로젝트 만들기

### Step 1: 새 폴더 생성
```bash
cd "/Users/bjeonvjeon/Remotion Video Folder/my-video/src"
cp -r JuknaraBriefing NewProjectName
```

### Step 2: 캐릭터 & 스타일 수정
`NewProjectName/script-short.ts`에서 CHAR와 STYLE 변수 수정:

```typescript
// 예시: 귀여운 동물 캐릭터 + 파스텔 배경
const CHAR = `Cute chibi animal character with big round eyes, soft fur texture, expressive face, small body proportions.`;

const STYLE = `Soft pastel illustration style with dreamy atmosphere.
Gentle gradient backgrounds, fluffy cloud textures, warm pink and blue tones.
Kawaii aesthetic with sparkles and soft highlights.
Rounded shapes, no sharp edges. Cozy, comforting mood.
No text or watermarks. 9:16 portrait composition.`;
```

### Step 3: Root.tsx에 새 Composition 추가
```typescript
import { NewProjectShort } from "./NewProjectName/NewProjectShort";

<Composition
  id="NewProjectShort"
  component={NewProjectShort}
  durationInFrames={1500}  // 50초
  fps={30}
  width={1080}
  height={1920}
/>
```

### Step 4: 렌더링
```bash
npx remotion render NewProjectShort out/new-video.mp4
```

---

## 캐릭터/스타일 예시 모음

### 1. 경제 뉴스 - 스틱피겨 (현재)
```typescript
const CHAR = `Simple cute stick-figure character with round head and minimal facial features (dot eyes, simple smile), thin black line body, standing in a HIGHLY DETAILED realistic background.`;

const STYLE = `Korean pencil-tinted social webtoon style with HIGHLY DETAILED realistic background environment...`;
```

### 2. 테크 뉴스 - 사이버펑크
```typescript
const CHAR = `Futuristic humanoid robot character with glowing LED eyes, metallic chrome body, holographic display elements floating around.`;

const STYLE = `Cyberpunk neon aesthetic with dark backgrounds.
Vibrant neon pink, cyan, and purple color scheme.
High contrast lighting with glowing edges.
Circuit board patterns, holographic UI elements.
Rain-slicked streets, towering skyscrapers with digital billboards.
Blade Runner inspired atmosphere. 9:16 portrait composition.`;
```

### 3. 라이프스타일 - 미니멀 일러스트
```typescript
const CHAR = `Simple geometric human figure with circular head, minimal features, solid color fills, no outlines.`;

const STYLE = `Modern minimalist flat illustration style.
Limited color palette (3-4 colors max).
Large negative space, clean compositions.
Subtle drop shadows, no gradients.
Scandinavian design aesthetic.
Magazine editorial feel. 9:16 portrait composition.`;
```

### 4. 역사/교육 - 빈티지 일러스트
```typescript
const CHAR = `Victorian-era styled character with period-appropriate clothing, detailed line work, crosshatch shading.`;

const STYLE = `Vintage engraving illustration style.
Sepia and brown tones with aged paper texture.
Detailed crosshatch and stipple shading.
Ornate borders and decorative elements.
Historical document aesthetic.
Educational diagram feel. 9:16 portrait composition.`;
```

### 5. 키즈 콘텐츠 - 카툰
```typescript
const CHAR = `Friendly cartoon child character with oversized head, big sparkling eyes, colorful outfit, exaggerated expressions.`;

const STYLE = `Bright and cheerful children's book illustration style.
Bold primary colors, thick black outlines.
Simple shapes, playful compositions.
Whimsical backgrounds with fun details.
Educational and engaging mood.
Safe and friendly atmosphere. 9:16 portrait composition.`;
```

---

## 새 세션에서 Claude에게 요청하는 방법

```
새로운 숏폼 프로젝트를 만들고 싶어.

프로젝트 위치: /Users/bjeonvjeon/Remotion Video Folder/my-video/
참고 템플릿: SHORTFORM_TEMPLATE.md

캐릭터 스타일: [원하는 캐릭터 설명]
배경 스타일: [원하는 배경 스타일 설명]
주제: [콘텐츠 주제]

스크립트:
[스크립트 내용]
```

---

## 파이프라인 커스터마이징 옵션

| 항목 | 파일 | 수정 내용 |
|------|------|----------|
| 캐릭터 스타일 | script-short.ts | `CHAR` 변수 |
| 배경 스타일 | script-short.ts | `STYLE` 변수 |
| TTS 목소리 | generateTTS-short.py | `VOICE` 변수 |
| TTS 속도 | generateTTS-short.py | `RATE` 변수 |
| 영상 길이 | Root.tsx | `durationInFrames` |
| 배경 볼륨 | *Short.tsx | `volume={0.2}` |
| 자막 폰트 | *Short.tsx | `fontFamily` 스타일 |
| Viral Tag 색상 | *Short.tsx | `background` 스타일 |
| 이미지 모델 | generateSceneImages.ts | API URL |
| 비디오 모델 | generateVideos-i2v.ts | `MODEL` 변수 |
