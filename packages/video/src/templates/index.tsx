// Maps a timeline scene to its template component.
import type { TimelineScene } from "@clipforge/schema";
import type { FC } from "react";
import { CodeBlock } from "./CodeBlock";
import { Compare } from "./Compare";
import { Diagram } from "./Diagram";
import { HookSlam } from "./HookSlam";
import { KineticText } from "./KineticText";
import { ListReveal } from "./ListReveal";
import { Media } from "./Media";
import { StatCounter } from "./StatCounter";

export const SceneBody: FC<{ scene: TimelineScene; assetBase: string }> = ({ scene, assetBase }) => {
  const shared = { cues: scene.cues, durationInFrames: scene.durationInFrames, assetBase };
  switch (scene.template) {
    case "HookSlam":
      return <HookSlam props={scene.props} {...shared} />;
    case "KineticText":
      return <KineticText props={scene.props} {...shared} />;
    case "Diagram":
      return <Diagram props={scene.props} {...shared} />;
    case "CodeBlock":
      return <CodeBlock props={scene.props} {...shared} />;
    case "Compare":
      return <Compare props={scene.props} {...shared} />;
    case "ListReveal":
      return <ListReveal props={scene.props} {...shared} />;
    case "StatCounter":
      return <StatCounter props={scene.props} {...shared} />;
    case "Media":
      return <Media props={scene.props} {...shared} />;
  }
};
