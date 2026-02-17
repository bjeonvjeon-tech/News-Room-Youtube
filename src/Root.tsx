import { Composition } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { JuknaraBriefing } from "./JuknaraBriefing/JuknaraBriefing";
import { JuknaraBriefingShort } from "./JuknaraBriefing/JuknaraBriefingShort";
import { JuknaraBriefingTechNews } from "./JuknaraBriefingTechNews/JuknaraBriefingTechNews";
import { JuknaraBriefingTechNewsShort } from "./JuknaraBriefingTechNews/JuknaraBriefingTechNewsShort";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JuknaraBriefing"
        component={JuknaraBriefing}
        durationInFrames={1680}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 숏폼 9:16 — TTS 오디오 길이 기반 */}
      <Composition
        id="JuknaraBriefingShort"
        component={JuknaraBriefingShort}
        durationInFrames={2241}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* TechNews — 롱폼 16:9 */}
      <Composition
        id="JuknaraBriefingTechNews"
        component={JuknaraBriefingTechNews}
        durationInFrames={2100}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* TechNews — 숏폼 9:16 */}
      <Composition
        id="JuknaraBriefingTechNewsShort"
        component={JuknaraBriefingTechNewsShort}
        durationInFrames={1680}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={33720}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={33720}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />
    </>
  );
};
