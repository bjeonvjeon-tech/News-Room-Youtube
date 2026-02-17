/**
 * 적나라브리핑 2.0 — 숏폼 영상 스크립트
 * 형식: 9:16 (1080x1920)
 *
 * 영상 구조 (3파트):
 * - Opening (Hook): 뉴스룸 앵커 등장, 10초 이내
 * - Body (Visual Insight): 본문 애니메이션 영상
 * - Closing (Impact): 뉴스룸 복귀, 10초 이내
 *
 * 오디오-비디오 동기화:
 * - 씬 길이는 TTS 오디오 길이 기반으로 동적 결정
 * - 비디오는 5초, 오디오가 더 길면 loop/reverse 적용
 */

/**
 * 본문(Body) 비주얼 서브 스타일 타입
 * 뉴스 성격에 따라 4가지 중 하나를 선택
 */
export type BodySubStyle =
  | "neon_future"      // TYPE A: 테크 & 미래 혁신
  | "heavy_titans"     // TYPE B: 경제 & 금융 위기
  | "grand_chessboard" // TYPE C: 정치 & 국제 정세
  | "pop_art_mirror";  // TYPE D: 사회 & 트렌드/문화

export interface ChapterShort {
  id: string;
  title: string;
  script: string;
  imagePrompt: string;
  viralTag: string;
  viralHook: string;
  duration: number;
  /** 씬 타입: opening(뉴스룸), body(본문 애니메이션), closing(뉴스룸) */
  sceneType: "opening" | "body" | "closing";
  /** 본문 씬의 비주얼 서브 스타일 (body 타입에서만 사용) */
  bodySubStyle?: BodySubStyle;
}

export const TOPIC = "";
export const TITLE = "";
export const FPS = 30;
export const TOTAL_DURATION = 0; // TTS 생성 후 동적 계산

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 마스터 스타일 프롬프트 (적나라브리핑 2.0)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 캐릭터 스타일: K-아나운서 '태리 (Taeri)'
 * - 신뢰감을 주는 네이비/그레이 수트
 * - 풍부한 감정 표현
 * - 한국형 신화 웹툰 스타일
 */
const CHAR = `Young Korean female news anchor 'Taeri' in her late 20s, sharp intelligent eyes, sleek black hair styled professionally, wearing a fitted navy blue blazer over a crisp white blouse, confident and expressive demeanor. She conveys trust and authority while remaining approachable and dynamic.`;

/**
 * 배경 스타일: 한국형 신화 웹툰(만화) 스타일
 * Cinematic digital ink lineart
 */
const STYLE = `Korean mythical webtoon (manhwa) style — Cinematic digital ink lineart.
Lineart: Clean sharp contours, disciplined line-weight hierarchy with bold outer silhouettes, medium interior forms, ultra-thin facial lines. Restrained micro-hatching only for material texture.
Facial style: Slightly enlarged head ratio with natural stylization, medium-large eyes with simplified eyelids, minimal nose bridge and shadow, small restrained mouth. Consistent facial feature spacing across all angles.
Shading: Filmic cel-to-painterly hybrid shading. Clearly defined shadow shapes with soft gradient rolloff on major planes. Matte highlights, subtle rim separation, restrained bounce light (no gloss).
Color: Rich luminous colors with confident saturation and clean value grouping. Background and non-essential elements harmoniously subdued for readability. 1-2 vivid accent colors on protagonist and key props, bright and clean but never neon.
Lighting: Soft directional lighting with gentle falloff. Practical-inspired bounce light.
Camera: Dynamic poses with matched eye-lines. NO photorealistic rendering, NO direct eye contact with viewer (no camera gaze), NO centered portrait framing, NO static hero poster poses.
Consistent character model sheet across all scenes. No on-screen text, captions, logos, or watermarks (except news lower-thirds).
9:16 portrait composition.`;

/**
 * 뉴스룸 배경: 글로벌 하이브리드 뉴스룸
 * Fox News/CNBC 스타일 앵커룸 스튜디오
 */
const NEWSROOM = `NYC-based Fox News/CNBC-style anchor studio newsroom. Giant LED wall screens showing live NASDAQ index, Bitcoin price charts, US map with data overlays. In one corner, a clock displaying Seoul time with a 'SEOUL' placard. Professional broadcast lighting, sleek modern desk, dark navy and metallic gold color scheme. Multiple camera angles available.`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 씬별 스크립트 (TTS 생성용) — 새 영상 제작 시 여기만 수정
export const SCENE_SCRIPTS: string[] = [
  // [0] Opening — 뉴스룸 앵커 등장, 10초 이내
  "",
  // [1~N] Body — 본문 내용
  "",
  // [마지막] Closing — 뉴스룸 복귀, 10초 이내
  "",
];

// 기본 duration (TTS 생성 후 업데이트됨)
const SCENE_DUR = 150; // 5초 기본값

export const SCRIPT_SHORT: ChapterShort[] = [
  // ━━━ Opening (The Hook) ━━━
  {
    id: "ch00",
    title: "오프닝",
    script: SCENE_SCRIPTS[0],
    sceneType: "opening",
    imagePrompt: `${CHAR} ${STYLE}
Scene: ${NEWSROOM} Taeri stands behind the anchor desk, looking directly ahead with a confident expression. A red 'BREAKING NEWS' ticker bar blinks at the bottom. 'LIVE - NEW YORK' text overlay. Camera dynamically zooms in from a wide newsroom shot to a medium close-up of Taeri. News fanfare atmosphere with dramatic lighting.`,
    viralTag: "BREAKING",
    viralHook: "",
    duration: SCENE_DUR,
  },
  // ━━━ Body (Visual Insight) — 새 영상 제작 시 여기에 씬 추가 ━━━
  // 예시:
  // {
  //   id: "ch01",
  //   title: "본문 씬 제목",
  //   script: SCENE_SCRIPTS[1],
  //   sceneType: "body",
  //   imagePrompt: `${CHAR} ${STYLE}
  //   Scene: 본문 씬 설명...`,
  //   viralTag: "TAG",
  //   viralHook: "바이럴 훅",
  //   duration: SCENE_DUR,
  // },

  // ━━━ Closing (The Impact) ━━━
  {
    id: "ch_closing",
    title: "클로징",
    script: SCENE_SCRIPTS[SCENE_SCRIPTS.length - 1],
    sceneType: "closing",
    imagePrompt: `${CHAR} ${STYLE}
Scene: ${NEWSROOM} Taeri leans forward on the desk with arms folded, speaking in a serious yet friendly tone directly to the viewer's direction (not camera). A '한국인 체크리스트' summary graphic appears as a lower-third overlay with 3 bullet points. Warm intimate lighting, close-up framing.`,
    viralTag: "CHECK",
    viralHook: "",
    duration: SCENE_DUR,
  },
];

// 스타일 상수 내보내기 (다른 스크립트에서 참조용)
export { CHAR, STYLE, NEWSROOM };
