# 적나라브리핑 2.0 — 숏폼 영상 제작 파이프라인

## 프로젝트 개요
미국 현지 뉴스를 한국인 K-아나운서 '태리(Taeri)'가 전달하는 뉴스 브리핑 숏폼 영상 제작 파이프라인.
한국형 신화 웹툰(만화) 스타일의 시네마틱 디지털 잉크 선화.

## 영상 구조 (3파트)
1. **Opening (The Hook)** — 10초 이내: 뉴스룸 앵커 등장, BREAKING NEWS 바
2. **Body (Visual Insight)** — 본문: 전체화면 애니메이션 (4가지 서브 스타일)
3. **Closing (The Impact)** — 10초 이내: 뉴스룸 복귀, 체크리스트 자막

## 핵심 파일 구조
```
src/JuknaraBriefing/
├── script-short.ts              # 스크립트 + 캐릭터/스타일 정의 (CHAR, STYLE, NEWSROOM)
├── generateTTS-timing.py        # TTS 생성 + SSOT 타이밍 추출 (Edge TTS, SunHi)
├── scenes-short.json            # 씬 타이밍 + 프롬프트 (SSOT)
├── generateScenePrompts-short.ts # 씬 프롬프트 생성 (Gemini + 4가지 서브 스타일)
├── generateSceneImages.ts       # Gemini 3 Pro 이미지 생성 (I2V용)
├── generateVideos-i2v.ts        # Wan 2.5 I2V 비디오 생성
├── createReverseLoop.ts/.sh     # 5초 → 10초 확장
├── JuknaraBriefingShort.tsx     # Remotion 렌더링 컴포넌트 (뉴스룸 UI)
└── ChapterSceneShort.tsx        # 개별 씬 컴포넌트
```

## 실행 순서
```bash
# 전체 파이프라인 (한 번에)
./produce-short.sh

# 또는 단계별:

# 1. TTS + 타이밍 SSOT 생성
python3 src/JuknaraBriefing/generateTTS-timing.py

# 2. 씬 이미지 생성 (Gemini, 무료)
npx ts-node src/JuknaraBriefing/generateSceneImages.ts

# 3. I2V 비디오 생성 (Wan 2.5, $2.00)
npx ts-node src/JuknaraBriefing/generateVideos-i2v.ts

# 4. 10초 reverse-loop 확장
npx ts-node src/JuknaraBriefing/createReverseLoop.ts

# 5. (선택) Kling lipsync — Opening/Closing

# 6. 최종 렌더링
npx remotion render JuknaraBriefingShort out/JuknaraBriefingShort.mp4
```

## 마스터 스타일
- **캐릭터**: K-아나운서 '태리' — 20대 후반 여성, 네이비 블레이저, 전문적 스타일
- **배경 스타일**: 한국형 신화 웹툰 / 시네마틱 디지털 잉크 선화
- **뉴스룸**: NYC Fox News/CNBC 스타일 앵커룸, LED 월, NASDAQ/비트코인 시세

## 본문 비주얼 서브 스타일 (4종)
| 타입 | 이름 | 적용 대상 | 핵심 컬러 |
|------|------|-----------|-----------|
| A | Neon Future | 테크, AI, 코인 | 네온 블루/라임/마젠타 |
| B | Heavy Titans | 경제 위기, 금리, 폭락 | 핏빛 레드, 녹슨 오렌지 |
| C | Grand Chessboard | 정치, 외교, 무역전쟁 | 딥 그린, 버건디, 골드 |
| D | Pop Art Mirror | 사회 트렌드, 문화 | 팝 컬러(옐로우, 핑크) |

## 제작 규칙
- **TTS 음성**: Edge TTS, `ko-KR-SunHiNeural` (여성 앵커), rate +20%
- **해상도**: 1080×1920 (9:16 숏폼)
- **자막 폰트**: 지마켓산스
- **Viral Tag**: Body 씬 좌측 상단 (빨간색 배경, 흰색 영어 대문자)
- **뉴스 UI**: Opening/Closing에 LIVE 뱃지 + BREAKING NEWS 티커 바

## API 키
- **Gemini**: generateSceneImages.ts, generateScenePrompts-short.ts 내 하드코딩
- **fal.ai (Wan I2V)**: generateVideos-i2v.ts 내 하드코딩

## 비용
- TTS: 무료 (Edge TTS)
- 이미지: 무료 (Gemini 3 Pro)
- 비디오: ~$2.00 (Wan 2.5 I2V, 씬 수 × $0.20)
- **총 비용: ~$2.00/영상**

## 새 영상 제작 시
1. `script-short.ts`의 `SCENE_SCRIPTS` 배열 수정 (Opening/Body들/Closing)
2. `script-short.ts`의 `SCRIPT_SHORT` 배열 수정 (sceneType, bodySubStyle 지정)
3. `generateTTS-timing.py`의 `SCENE_SCRIPTS`, `SCENE_TITLES` 복사
4. `Root.tsx`의 `durationInFrames` 조정 (TTS 생성 후 자동)
5. `./produce-short.sh` 실행

## 새 스크립트 제공 시 Claude에게 요청
"새 스크립트로 적나라브리핑 숏폼 만들어줘: [스크립트 내용]"
