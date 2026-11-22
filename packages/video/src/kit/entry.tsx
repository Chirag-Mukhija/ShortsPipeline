// Kit gallery: one composition per template (kit--<id>) playing its example in a chosen style preset, plus kit--<id>--split at panel size (1000×1080) for templates that sit beside face cam.
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { FPS, H, W } from "../library/core/video";
import { KIT } from "./index";
import { STYLES, type StyleName } from "./styles";

type DemoProps = { style: StyleName };
const PANEL_W = 1000;

const Root = () => (
  <>
    {KIT.flatMap((tpl) => {
      const make = (w: number) => {
        const Demo = ({ style }: DemoProps) => (
          <AbsoluteFill>
            <tpl.Component props={tpl.schema.parse(tpl.example)} style={STYLES[style] ?? STYLES.studio} width={w} height={H} duration={tpl.seconds.demo} media={tpl.exampleMedia} cues={tpl.exampleCues} />
          </AbsoluteFill>
        );
        return Demo;
      };
      const comps = [<Composition key={tpl.id} id={`kit--${tpl.id}`} component={make(W)} defaultProps={{ style: "studio" as StyleName }} durationInFrames={Math.round(tpl.seconds.demo * FPS)} fps={FPS} width={W} height={H} />];
      if (tpl.layouts.includes("split")) {
        comps.push(<Composition key={`${tpl.id}--split`} id={`kit--${tpl.id}--split`} component={make(PANEL_W)} defaultProps={{ style: "studio" as StyleName }} durationInFrames={Math.round(tpl.seconds.demo * FPS)} fps={FPS} width={PANEL_W} height={H} />);
      }
      return comps;
    })}
  </>
);

registerRoot(Root);
