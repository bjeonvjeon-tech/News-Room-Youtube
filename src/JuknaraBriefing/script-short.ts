/**
 * Stick Figure Economics — 숏폼 영상 스크립트
 * 주제: 중국 AI 3종 공개 - 한국 영향
 * 형식: 9:16 (1080x1920)
 *
 * 오디오-비디오 동기화:
 * - 씬 길이는 TTS 오디오 길이 기반으로 동적 결정
 * - 비디오는 5초, 오디오가 더 길면 loop/reverse 적용
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

export const TOPIC = "중국 AI 3종 공개 - 한국 영향";
export const TITLE = "중국 AI 폭격, 한국은 어디쯤?";
export const FPS = 30;
export const TOTAL_DURATION = 0; // TTS 생성 후 동적 계산

// 캐릭터 스타일 (심플한 스틱피겨 + 디테일 배경)
const CHAR = `Simple cute stick-figure character with round head and minimal facial features (dot eyes, simple smile), thin black line body, standing in a HIGHLY DETAILED realistic background.`;

// 배경 스타일 (디테일한 웹툰 스타일)
const STYLE = `Korean pencil-tinted social webtoon style with HIGHLY DETAILED realistic background environment.
Light paper-grain texture, restrained crosshatch shading, clear line-weight hierarchy from heavy silhouettes to mid interior forms to ultra-thin details.
Shading uses clean cel blocks with faint graphite wash at major form turns; highlights stay matte, broad, subdued.
Color policy: low-saturation warm grays and muted earths with strict value grouping, one sparse accent color family.
Lighting: soft diffuse key with gentle fill, no hard rim lights.
Background must include rich architectural details, environmental storytelling elements, realistic perspective and depth.
No text, captions, logos, or watermarks. 9:16 portrait composition.
Consistent character model across all scenes.`;

// 씬별 스크립트 (TTS 생성용)
export const SCENE_SCRIPTS = [
  `중국이 이번 주에 AI 모델 3개를 동시에 쏟아냈습니다. 구글 딥마인드 CEO가 말했죠, "중국은 불과 몇 달 뒤에 있다."`,
  `먼저 알리바바입니다. 로봇 두뇌 'RynnBrain'을 공개했는데요, 물건을 알아보고, 집어서, 바구니에 넣습니다.`,
  `구글 제미니 로보틱스, 엔비디아 코스모스를 16개의 benchmark에서 다 이겼어요. 게다가 오픈소스로 무료 공개했구요.`,
  `다음은 바이트댄스. 영상 생성 AI 'Seedance' 인데, 텍스트·이미지·영상·음성을 동시에 입력하면 2K 영상을 만들어줍니다.`,
  `중국에서는 "제2의 딥시크"라는 말까지 나왔어요.`,
  `이게 한국에 왜 중요하냐면요, 첫째, 로봇입니다. 현대·삼성이 휴머노이드 로봇에 투자 중인데, 중국이 AI 두뇌를 오픈소스로 풀어버리면 가격 경쟁력에서 밀릴 수 있어요.`,
  `둘째, 콘텐츠예요. 한국 광고·영상 업계가 영상 AI 도입을 준비 중인데, Seedance 가 Sora 보다 싸고 빠르면 판이 바뀝니다.`,
  `셋째, 반도체입니다. 중국이 미국 칩 제재 속에서도 이런 모델을 내놓는다는 건, SK하이닉스 AI 메모리 수요 구조에도 영향을 줄 수 있거든요.`,
  `AI 전쟁, 미국 vs 중국 사이에서 한국은 어디쯤 있을까요?`,
];

// 기본 duration (TTS 생성 후 업데이트됨)
const SCENE_DUR = 150; // 5초 기본값

export const SCRIPT_SHORT: ChapterShort[] = [
  {
    id: "ch00",
    title: "중국 AI 폭격",
    script: SCENE_SCRIPTS[0],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure watching multiple AI model announcements from China on giant screens.
Background: Futuristic tech conference setting with three massive holographic displays showing different AI logos. Chinese tech company banners (Alibaba, ByteDance). Google DeepMind CEO quote floating. Dramatic lighting with red and gold accents. Sense of technological shock and competition.`,
    viralTag: "CHINA AI BLITZ",
    viralHook: "중국 AI 3종 동시 공개, 미국 추격",
    duration: SCENE_DUR,
  },
  {
    id: "ch01",
    title: "알리바바 RynnBrain",
    script: SCENE_SCRIPTS[1],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure observing a robot arm picking up objects and placing them in a basket.
Background: Alibaba robotics lab with advanced humanoid robot demonstrating object recognition. Robot hand grasping items precisely. Shopping basket nearby. RynnBrain logo displayed. Futuristic industrial setting with Chinese tech aesthetics.`,
    viralTag: "ROBOT BRAIN",
    viralHook: "알리바바 로봇 두뇌 공개",
    duration: SCENE_DUR,
  },
  {
    id: "ch02",
    title: "벤치마크 압승",
    script: SCENE_SCRIPTS[2],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure looking at benchmark comparison chart showing China beating Google and NVIDIA.
Background: Large scoreboard showing 16 benchmarks with checkmarks for RynnBrain. Google Gemini Robotics and NVIDIA Cosmos logos shown below. Open-source badge prominently displayed. Victory celebration atmosphere with confetti.`,
    viralTag: "16 BENCHMARKS",
    viralHook: "구글·엔비디아 16개 벤치마크 완승",
    duration: SCENE_DUR,
  },
  {
    id: "ch03",
    title: "바이트댄스 Seedance",
    script: SCENE_SCRIPTS[3],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure amazed by video generation from multiple inputs (text, image, video, audio).
Background: ByteDance studio with Seedance AI interface. Four input streams (text, image, video, audio) merging into 2K video output. TikTok parent company aesthetic. High-quality video frames being generated. Creative content production atmosphere.`,
    viralTag: "SEEDANCE",
    viralHook: "바이트댄스 영상 AI, 멀티 입력",
    duration: SCENE_DUR,
  },
  {
    id: "ch04",
    title: "제2의 딥시크",
    script: SCENE_SCRIPTS[4],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure seeing "Second DeepSeek" headlines on Chinese social media.
Background: Chinese social media feeds (Weibo, WeChat style) with viral posts about Seedance. DeepSeek comparison graphics. Trending hashtags in Chinese. Excitement and buzz atmosphere. Tech influencers commenting.`,
    viralTag: "DEEPSEEK 2.0",
    viralHook: "중국 반응: 제2의 딥시크",
    duration: SCENE_DUR,
  },
  {
    id: "ch05",
    title: "한국 영향 - 로봇",
    script: SCENE_SCRIPTS[5],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure worried about Korean robots competing with Chinese open-source AI.
Background: Split screen - Hyundai Boston Dynamics robot and Samsung robot on one side, Chinese open-source logo on other. Price tags showing cost difference. Korean factory setting. Competitive pressure visualization. Won vs Yuan symbols.`,
    viralTag: "ROBOT WAR",
    viralHook: "현대·삼성 로봇, 가격경쟁 위기",
    duration: SCENE_DUR,
  },
  {
    id: "ch06",
    title: "한국 영향 - 콘텐츠",
    script: SCENE_SCRIPTS[6],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure in Korean ad agency comparing Seedance vs Sora pricing.
Background: Korean advertising agency office. Price comparison chart (Seedance cheaper, faster vs Sora). Video editing workstations. K-drama and K-pop content production. Industry disruption visualization. Speed and cost icons.`,
    viralTag: "CONTENT SHIFT",
    viralHook: "Seedance vs Sora, 한국 광고계 판도",
    duration: SCENE_DUR,
  },
  {
    id: "ch07",
    title: "한국 영향 - 반도체",
    script: SCENE_SCRIPTS[7],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure analyzing semiconductor market impact from China AI development.
Background: SK Hynix HBM memory chips visualization. US chip sanctions wall being bypassed. China developing AI despite restrictions. Memory demand structure changing. Korean semiconductor industry concerns. Global supply chain map.`,
    viralTag: "CHIP IMPACT",
    viralHook: "SK하이닉스 AI 메모리, 수요 변화?",
    duration: SCENE_DUR,
  },
  {
    id: "ch08",
    title: "한국의 위치",
    script: SCENE_SCRIPTS[8],
    imagePrompt: `${CHAR} ${STYLE}
Scene: Stick-figure standing between US and China flags, wondering where Korea stands.
Background: World map with US flag on left, China flag on right, Korea in the middle. AI war battlefield visualization. Question marks floating above Korea. Tech company logos (Google, OpenAI vs Alibaba, ByteDance). Strategic crossroads atmosphere. Call to action ending.`,
    viralTag: "WHERE IS KOREA?",
    viralHook: "미중 AI 전쟁, 한국은 어디?",
    duration: SCENE_DUR,
  },
];
