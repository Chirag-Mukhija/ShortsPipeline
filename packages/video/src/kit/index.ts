// The kit: every scene template the timeline can use. A template appears here only after its preview passed the motion check.
import type { KitTemplate } from "./contract";
import arrayTrace from "./templates/array-trace";
import characterScene from "./templates/character-scene";
import flowDiagram from "./templates/flow-diagram";
import footageReveal from "./templates/footage-reveal";
import listTick from "./templates/list-tick";
import titleCard from "./templates/title-card";

export type { Cue, KitTemplate, Layout, Media, Mode, SceneProps, Style } from "./contract";
export { STYLES, type StyleName } from "./styles";

export const KIT: KitTemplate[] = [footageReveal as KitTemplate, flowDiagram as KitTemplate, characterScene as KitTemplate, arrayTrace as KitTemplate, listTick as KitTemplate, titleCard as KitTemplate];
