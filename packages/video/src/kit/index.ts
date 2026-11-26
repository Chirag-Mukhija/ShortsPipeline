// The kit: every scene template the timeline can use. A template appears here only after its preview passed the motion check.
import type { KitTemplate } from "./contract";
import arrayTrace from "./templates/array-trace";
import cardDuel from "./templates/card-duel";
import characterScene from "./templates/character-scene";
import chartBars from "./templates/chart-bars";
import codeWalk from "./templates/code-walk";
import compareSplit from "./templates/compare-split";
import condenseStack from "./templates/condense-stack";
import flowDiagram from "./templates/flow-diagram";
import footageReveal from "./templates/footage-reveal";
import frameBreak from "./templates/frame-break";
import kineticLyrics from "./templates/kinetic-lyrics";
import listTick from "./templates/list-tick";
import parallaxStill from "./templates/parallax-still";
import partsCombine from "./templates/parts-combine";
import phoneTour from "./templates/phone-tour";
import pixelSpell from "./templates/pixel-spell";
import quoteCard from "./templates/quote-card";
import shadowStory from "./templates/shadow-story";
import shapeIntro from "./templates/shape-intro";
import statPunch from "./templates/stat-punch";
import stripWeave from "./templates/strip-weave";
import tangleToLine from "./templates/tangle-to-line";
import tileHop from "./templates/tile-hop";
import timelinePath from "./templates/timeline-path";
import titleCard from "./templates/title-card";
import treeGraph from "./templates/tree-graph";
import uiMorph from "./templates/ui-morph";

export type { Cue, KitTemplate, Layout, Media, Mode, SceneProps, Style } from "./contract";
export { STYLES, type StyleName } from "./styles";

export const KIT: KitTemplate[] = [footageReveal as KitTemplate, flowDiagram as KitTemplate, characterScene as KitTemplate, arrayTrace as KitTemplate, listTick as KitTemplate, titleCard as KitTemplate, statPunch as KitTemplate, codeWalk as KitTemplate, timelinePath as KitTemplate, compareSplit as KitTemplate, frameBreak as KitTemplate, parallaxStill as KitTemplate, treeGraph as KitTemplate, chartBars as KitTemplate, shadowStory as KitTemplate, quoteCard as KitTemplate, uiMorph as KitTemplate, kineticLyrics as KitTemplate, pixelSpell as KitTemplate, shapeIntro as KitTemplate, phoneTour as KitTemplate, cardDuel as KitTemplate, condenseStack as KitTemplate, tangleToLine as KitTemplate, partsCombine as KitTemplate, stripWeave as KitTemplate, tileHop as KitTemplate];

// Lets scripts outside this package (the menu-card generator) turn template schemas into JSON Schema with the same zod.
export { toJSONSchema } from "zod";
