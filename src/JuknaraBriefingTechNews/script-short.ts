/**
 * Cyberpunk Tech News — 숏폼 영상 스크립트
 * 주제: 빅테크 AI 투자 650조 원 — 버블인가 기회인가
 * 형식: 9:16 (1080x1920), ~50초
 */

export interface ChapterShort {
  id: string;
  title: string;
  script: string;
  imagePrompt: string;
  viralTag: string;
  viralHook: string;
  duration: number;
}

export const TOPIC = "빅테크 AI 투자 650조 원 — 버블인가 기회인가";
export const TITLE = "빅테크 4곳이 AI에 650조 원 쏟아붓는다";
export const FPS = 30;
export const TOTAL_DURATION = 1680; // 50초

// 캐릭터 스타일 (사이버펑크 로봇)
const CHAR = `Futuristic humanoid robot character with glowing LED eyes, metallic chrome body, holographic display elements floating around.`;

// 배경 스타일 (사이버펑크 네온)
const STYLE = `Cyberpunk neon aesthetic with dark backgrounds.
Vibrant neon pink, cyan, and purple color scheme.
High contrast lighting with glowing edges.
Circuit board patterns, holographic UI elements.
Rain-slicked streets, towering skyscrapers with digital billboards.
Blade Runner inspired atmosphere.
No text, captions, logos, or watermarks. 9:16 portrait composition.
Consistent character model across all scenes.`;

const SCENE_DUR = 186; // ~5초 (10개 씬)

export const SCRIPT_SHORT: ChapterShort[] = [
  {
    id: "ch00",
    title: "650조 투자",
    script: `650조 원. 올해 빅테크 4곳이 AI에 쏟아붓겠다는 돈입니다.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: A futuristic robot standing before a massive holographic display showing "650 TRILLION WON" in glowing neon numbers.
Background: Dark cyberpunk cityscape with towering skyscrapers covered in digital billboards. Neon rain falling. Giant holographic money counter spinning upward. Data streams flowing through the air like rivers of light. Multiple floating screens showing logos of big tech companies. Electric blue and hot pink reflections on wet streets below.`,
    viralTag: "650 TRILLION",
    viralHook: "빅테크 AI 투자 650조",
    duration: SCENE_DUR,
  },
  {
    id: "ch01",
    title: "빅테크 금액",
    script: `아마존 200조, 구글 185조, 마이크로소프트 105조, 메타 135조. 전년 대비 60% 폭증이에요.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot standing in a futuristic command center surrounded by four massive holographic pillars of light, each representing a tech giant.
Background: Four towering neon pillars of different heights — tallest cyan (Amazon 200T), magenta (Google 185T), purple (Meta 135T), blue (Microsoft 105T). Each pillar pulses with energy. Holographic bar charts comparing year-over-year growth with "+60%" floating in neon red. Circuit board floor with glowing pathways. Dark atmosphere with dramatic uplighting.`,
    viralTag: "+60% SURGE",
    viralHook: "전년 대비 60% 폭증",
    duration: SCENE_DUR,
  },
  {
    id: "ch02",
    title: "유례없는 투자",
    script: `블룸버그는 이 세기에 유례없는 투자라고 했습니다. 이 돈은 거의 전부 데이터센터와 AI 칩에 들어갑니다.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot walking through an enormous futuristic data center stretching endlessly into the distance.
Background: Massive cyberpunk data center interior — rows upon rows of glowing server racks extending to infinity. Cooling systems with neon blue mist. Fiber optic cables like luminous veins running across ceiling. AI chip manufacturing robots working in the background. Holographic newspaper headline "UNPRECEDENTED INVESTMENT" floating in the air. Purple and cyan ambient lighting. Industrial scale emphasized.`,
    viralTag: "UNPRECEDENTED",
    viralHook: "이 세기에 유례없는 투자",
    duration: SCENE_DUR,
  },
  {
    id: "ch03",
    title: "한국에 중요한 이유",
    script: `한국에 왜 중요하냐고요?`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot looking at a holographic map of South Korea glowing with connection lines to global tech hubs.
Background: Dark futuristic war room with a massive 3D holographic globe. South Korea highlighted in bright neon cyan with pulsing connection lines reaching out to Silicon Valley, Tokyo, and European cities. Data streams flowing between nodes. Multiple floating screens showing Korean flag and tech industry data. Question mark formed by neon light particles hovering above. Dramatic spotlight on Korea.`,
    viralTag: "WHY KOREA?",
    viralHook: "한국에 중요한 이유",
    duration: SCENE_DUR,
  },
  {
    id: "ch04",
    title: "반도체 핵심",
    script: `첫째, 반도체입니다. AI 서버에는 HBM 메모리가 필수인데, 삼성과 SK하이닉스가 전 세계 공급을 쥐고 있습니다.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot holding a glowing HBM memory chip that emanates powerful neon light, standing in a semiconductor fab.
Background: Futuristic semiconductor cleanroom with cyberpunk aesthetics — robotic arms assembling tiny glowing chips. Holographic cross-section of HBM memory stack floating nearby. Samsung and SK Hynix style manufacturing lines with neon blue lighting. Wafer discs spinning with rainbow reflections. Supply chain visualization showing dominance arrows from Korea. Ultra-high-tech atmosphere with particle effects.`,
    viralTag: "HBM DOMINANCE",
    viralHook: "삼성·SK 전 세계 공급 장악",
    duration: SCENE_DUR,
  },
  {
    id: "ch05",
    title: "장비 수출",
    script: `둘째, 장비입니다. 데이터센터 건설 붐은 한국 전력장비, 냉각장비 수출로 직결됩니다.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot inspecting massive futuristic cooling and power equipment being loaded onto cargo transport.
Background: Cyberpunk industrial port at night — giant cooling towers with neon blue coolant flowing through transparent tubes. Power transformers crackling with electric arcs. Korean-made equipment crates with holographic labels being loaded by robotic cranes onto futuristic cargo ships. Export arrows glowing in neon green pointing outward. Industrial steam and neon fog. Sparks flying from welding robots.`,
    viralTag: "EXPORT BOOM",
    viralHook: "전력·냉각장비 수출 직결",
    duration: SCENE_DUR,
  },
  {
    id: "ch06",
    title: "주가 상승",
    script: `셋째, 주가입니다. 빅테크가 돈을 쓸수록 삼성전자와 SK하이닉스도 동반 상승합니다.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot standing on a futuristic trading floor watching holographic stock charts rising dramatically.
Background: Cyberpunk stock exchange — massive holographic stock tickers floating in 3D space. Samsung and SK Hynix charts in bright neon green shooting upward with trailing light particles. Correlation lines connecting Big Tech spending to Korean stock prices. Other robot traders reacting with excitement. Neon confetti particles. Multiple floating screens showing real-time data. Electric atmosphere with cyan and magenta lighting.`,
    viralTag: "STOCKS SURGE",
    viralHook: "삼성·SK 동반 상승",
    duration: SCENE_DUR,
  },
  {
    id: "ch07",
    title: "투자자 불안",
    script: `그런데 투자자들은 오히려 불안합니다. 이번 주 빅테크 시총 9천억 달러가 증발했거든요.`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot standing before a massive holographic display showing market crash with red warning alerts everywhere.
Background: Dark cyberpunk trading floor in crisis mode — red emergency lights flashing. Giant holographic number "$900B" dissolving into digital fragments. Stock charts plummeting with red neon trails. Warning sirens with rotating red lights. Panicked robot traders. Screens showing "MARKET WIPEOUT" in glitching text. Smoke and sparks from overloaded systems. Dramatic red and orange neon atmosphere replacing usual cyan.`,
    viralTag: "$900B WIPEOUT",
    viralHook: "시총 9천억 달러 증발",
    duration: SCENE_DUR,
  },
  {
    id: "ch08",
    title: "버블 vs 기회",
    script: `AI 투자 광풍, 버블일까요 기회일까요?`,
    imagePrompt: `${CHAR} ${STYLE}
Scene: Robot standing at a dramatic crossroads — one path glows in dangerous red (bubble), the other in hopeful cyan (opportunity).
Background: Cyberpunk intersection in a dark cityscape. Left path: collapsing digital buildings, glitching holograms, red neon "BUBBLE" warning signs, dotcom-era crash imagery reimagined in neon. Right path: flourishing futuristic city, green growth indicators, ascending data streams, bright hopeful cyan lighting. Robot at the center contemplating. Rain falling. Dramatic split-screen lighting — red vs cyan. Question mark formed by lightning in the sky.`,
    viralTag: "BUBBLE OR BOOM?",
    viralHook: "버블인가 기회인가",
    duration: SCENE_DUR,
  },
];
