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

export const TOPIC = "AI가 소프트웨어 주식 $285B 증발시킨 날";
export const TITLE = "AI 도구 하나가 2,850억 달러를 하루 만에 증발시켰다";
export const FPS = 30;
export const TOTAL_DURATION = 0; // TTS 생성 후 동적 계산

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 마스터 스타일 프롬프트 (적나라브리핑 2.0)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 마스터 캐릭터: K-아나운서 '태리 (Taeri)'
 * - 긴 생머리 블랙 헤어
 * - 핑크(로즈) 블레이저 + 화이트 블라우스
 * - 한국형 신화 웹툰 스타일
 * ⚠️ Opening/Closing에만 등장. Body 씬에는 등장하지 않음.
 */
const CHAR = `Young Korean female news anchor 'Taeri' in her late 20s, sharp intelligent eyes, long straight black hair past shoulders, wearing a fitted pink (rose) blazer over a crisp white blouse, confident and approachable demeanor. She conveys trust and authority while remaining dynamic and expressive.`;

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
// ⚠️ 챕터 이름([오프닝], [본문] 등)은 TTS에 포함하지 않음!
export const SCENE_SCRIPTS: string[] = [
  // [0] Opening — 뉴스룸 앵커 등장
  "미국 현지 직통 뉴스, 적나라브리핑입니다. AI 도구 하나가 글로벌 소프트웨어 주식 2,850억 달러를 하루 만에 증발시켰습니다. 바로 보시죠.",
  // [1] Body — AI 에이전트 등장
  "무슨 일이 벌어졌냐면요. Anthropic이 Claude Cowork이라는 AI 에이전트에 법률, 금융, 마케팅 플러그인을 달았어요. 이게 뭐냐면, 기업들이 쓰던 비싼 소프트웨어를 AI가 대체할 수 있다는 얘기거든요. 계약서 검토, 데이터 분석, 보고서 작성까지 AI가 다 해버리는 거예요.",
  // [2] Body — 시장 폭락
  "시장 반응이 장난이 아니었습니다. S&P 500 소프트웨어 지수가 하루에 6% 폭락했고, 톰슨로이터는 하루 만에 16% 빠졌어요. 세일즈포스는 올해만 26% 하락. 소프트웨어 업종 전체가 고점 대비 시가총액 2조 달러가 날아갔습니다. 근데 진짜 무서운 건요, 엔비디아 젠슨 황이 비논리적 공포라고 했지만 매도세가 멈추질 않았다는 거예요.",
  // [3] Body — 한국 IT 서비스 직격탄
  "이게 한국이랑 무슨 상관이냐고요? 첫째, IT 서비스 기업입니다. 인도의 TCS, 인포시스가 같이 폭락했는데, 삼성SDS, LG CNS 같은 한국 IT 서비스도 같은 구조거든요. AI가 SI 사업을 먹기 시작하면 직격탄이에요.",
  // [4] Body — 취업시장 + 투자
  "둘째, 취업시장입니다. Anthropic CEO가 1에서 5년 내 화이트칼라 초급 일자리 절반이 사라진다고 경고했어요. 한국 청년들 해외 취업은커녕 국내 사무직도 좁아질 수 있습니다. 셋째, 투자입니다. 나스닥이 흔들리면 코스피 IT주도 같이 끌려 내려가잖아요. 실제로 이번 매도세에 아시아 IT주까지 전부 빠졌습니다.",
  // [5] Body — 결론적 경고
  "솔직히 좀 무섭죠. AI가 도구에서 경쟁자로 바뀌는 순간, 돈의 흐름 자체가 바뀌는 거예요.",
  // [6] Closing — 뉴스룸 복귀
  "AI가 소프트웨어를 돕는 시대에서, 소프트웨어를 잡아먹는 시대로 넘어가고 있습니다. 여러분은 이게 위기라고 보시나요, 기회라고 보시나요? 미국이 변하면 우리 지갑도 변합니다. 적나라브리핑이었습니다.",
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
Scene: ${NEWSROOM} Taeri stands behind the anchor desk with a serious, urgent expression. LED screens behind her display plummeting software stock charts with red downward arrows and "$285B" figures. Camera dynamically zooms in from a wide newsroom shot to a medium close-up of Taeri. Dramatic red-tinted broadcast lighting emphasizes urgency.`,
    viralTag: "BREAKING",
    viralHook: "AI 하나가 2,850억 달러 증발시켰다",
    duration: SCENE_DUR,
  },

  // ━━━ Body (Visual Insight) ━━━
  // ⚠️ Body 씬: CHAR 미사용, STYLE만 사용 (태리 등장 안 함)

  // [1] AI 에이전트 등장 — neon_future
  {
    id: "ch01",
    title: "AI 에이전트의 등장",
    script: SCENE_SCRIPTS[1],
    sceneType: "body",
    bodySubStyle: "neon_future",
    imagePrompt: `${STYLE}
Scene: A massive holographic AI interface floating in a futuristic dark server room. Glowing electric-blue plugin modules labeled with icons for law (scales), finance (charts), and marketing (megaphone) orbit around a brilliant central AI core. Traditional software icons — contracts, spreadsheets, folders — dissolve into digital particles as the AI absorbs them. Data streams converge from all directions. Overwhelming scale, neon blue and magenta accents against deep purple background.`,
    viralTag: "AI AGENT",
    viralHook: "AI가 소프트웨어를 대체하기 시작했다",
    duration: SCENE_DUR,
  },

  // [2] 시장 폭락 — heavy_titans
  {
    id: "ch02",
    title: "2,850억 달러 폭락",
    script: SCENE_SCRIPTS[2],
    sceneType: "body",
    bodySubStyle: "heavy_titans",
    imagePrompt: `${STYLE}
Scene: A colossal titan made of crumbling stock tickers and red market data crashes through Wall Street skyscrapers. Massive blood-red downward arrows rain from a dark stormy sky. Giant glowing numbers "-6%", "-16%", "-26%" carved into falling concrete debris. At the base of the destruction, a tiny silhouette figure gestures helplessly upward. Heavy desaturated tones with blood-red and rusted orange. Low angle shot looking up at the catastrophic market collapse. Crushing, oppressive atmosphere.`,
    viralTag: "$285B CRASH",
    viralHook: "소프트웨어 시총 2조 달러 증발",
    duration: SCENE_DUR,
  },

  // [3] 한국 IT 서비스 직격탄 — grand_chessboard
  {
    id: "ch03",
    title: "한국 IT 직격탄",
    script: SCENE_SCRIPTS[3],
    sceneType: "body",
    bodySubStyle: "grand_chessboard",
    imagePrompt: `${STYLE}
Scene: A grand strategic chessboard spanning from Silicon Valley on one side to Seoul on the other. Glowing AI chess pieces (sleek, futuristic, advancing aggressively) push against traditional IT service company pieces shaped like office towers with Korean and Indian flags. A giant invisible hand moves an AI piece forward, toppling the IT service towers in a domino effect. Korean flag and Indian flag on opposite corners, both threatened. Deep green and burgundy tones with gold accents. High-angle top-down strategic view with dramatic theatrical spotlight.`,
    viralTag: "KOREA",
    viralHook: "삼성SDS, LG CNS도 같은 구조",
    duration: SCENE_DUR,
  },

  // [4] 취업시장 + 투자 — pop_art_mirror
  {
    id: "ch04",
    title: "취업·투자 충격파",
    script: SCENE_SCRIPTS[4],
    sceneType: "body",
    bodySubStyle: "pop_art_mirror",
    imagePrompt: `${STYLE}
Scene: A pop-art style split composition. Left half: a young Korean office worker at a desk being consumed by a glowing AI interface — laptop screen morphing into an abstract AI face, desk items dissolving. Right half: NASDAQ and KOSPI stock charts connected by a taut glowing thread, both plummeting simultaneously in sync. Smartphone frames nested within the composition showing headlines. Punchy pink and yellow pop colors on the worker side, dry pale tones on the investment side. Collage-like composition mixing multiple elements. Distorted mirror reflections of anxious faces in background.`,
    viralTag: "JOBS",
    viralHook: "화이트칼라 일자리 절반이 사라진다",
    duration: SCENE_DUR,
  },

  // [5] AI = 경쟁자 — heavy_titans
  {
    id: "ch05",
    title: "도구에서 경쟁자로",
    script: SCENE_SCRIPTS[5],
    sceneType: "body",
    bodySubStyle: "heavy_titans",
    imagePrompt: `${STYLE}
Scene: A dark, ominous landscape where a towering abstract AI entity — faceless, geometric, emanating cold light — casts an enormous shadow over a field of traditional business tools (briefcase, calculator, pen, laptop). Everything the shadow touches transforms from solid physical objects into dissolving digital particles. Money flow arrows in the sky abruptly reverse direction, from flowing toward businesses to flowing toward the AI entity. Deep gray and blood-red palette. Low angle looking up at the overwhelming AI presence. Heavy, oppressive noir atmosphere with minimal light.`,
    viralTag: "WARNING",
    viralHook: "돈의 흐름 자체가 바뀐다",
    duration: SCENE_DUR,
  },

  // ━━━ Closing (The Impact) ━━━
  {
    id: "ch_closing",
    title: "클로징",
    script: SCENE_SCRIPTS[SCENE_SCRIPTS.length - 1],
    sceneType: "closing",
    imagePrompt: `${CHAR} ${STYLE}
Scene: ${NEWSROOM} Taeri leans forward at the anchor desk with a contemplative yet determined expression, arms folded on the desk. LED screens behind her show a dramatic split view: one side displaying AI growth charts soaring upward in green, the other showing traditional software stocks declining in red. Warm intimate lighting, close-up framing. Taeri looks slightly to the side, posing a question to the audience.`,
    viralTag: "CHECK",
    viralHook: "위기인가, 기회인가?",
    duration: SCENE_DUR,
  },
];

// 스타일 상수 내보내기 (다른 스크립트에서 참조용)
export { CHAR, STYLE, NEWSROOM };
