// The motion library: theme-free core plus one folder per visual theme, each with a catalog of demoed entries.
import type { LibraryTheme } from "./core/catalog";
import { core } from "./core/core-catalog";
import { handDrawn } from "./themes/hand-drawn/catalog";
import kineticTypeFilm from "./themes/kinetic-type-film/catalog";
import neoBrutalismPop from "./themes/neo-brutalism-pop/catalog";
import bentoDarkProductUi from "./themes/bento-dark-product-ui/catalog";
import codeExplainerTerminal from "./themes/code-explainer-terminal/catalog";
import lyricVisualiser from "./themes/lyric-visualiser-music-only/catalog";
import dataStoryCharts from "./themes/data-story-charts/catalog";
import isometricExplainer from "./themes/isometric-explainer/catalog";
import flatVectorExplainer from "./themes/flat-vector-explainer/catalog";
import editorialCollage from "./themes/editorial-collage-documentary/catalog";
import paperCutout from "./themes/paper-cutout-stopmotion/catalog";
import mathDarkBoard from "./themes/math-explainer-dark-board/catalog";
import retroWebY2k from "./themes/retro-web-y2k-desktop/catalog";
import holographicHud from "./themes/holographic-hud/catalog";
import frostedGlass from "./themes/frosted-glass-ui-cards/catalog";
import scatterAssemble from "./themes/scatter-assemble-type/catalog";
import uiWalkthrough from "./themes/ui-walkthrough-demo/catalog";
import zoomThroughWorlds from "./themes/zoom-through-worlds/catalog";
import audioReactive from "./themes/audio-reactive-visualiser/catalog";
import risograph from "./themes/risograph-print-texture/catalog";
import agentCockpit from "./themes/ai-agent-flow-cockpit/catalog";
import tickerType from "./themes/highlight-block-ticker-type/catalog";
import liquidGlass from "./themes/liquid-glass-lens/catalog";
import variableFont from "./themes/variable-font-breathing-type/catalog";
import verticalSlat from "./themes/vertical-slat-duotone-folk/catalog";
import proceduralShaders from "./themes/procedural-pattern-shaders/catalog";
import splitFlap from "./themes/split-flap-departure-board/catalog";
import asciiDither from "./themes/ascii-dither-text-image/catalog";
import claymorphism from "./themes/claymorphism-3d/catalog";
import explodedGadget from "./themes/exploded-gadget-poster/catalog";
import pixelArcade from "./themes/pixel-arcade-8bit/catalog";
import spotlightNoir from "./themes/spotlight-noir-reveal/catalog";
import japaneseMinimal from "./themes/japanese-minimal-ma/catalog";

export type { LibraryEntry, LibraryKind, LibraryTheme } from "./core/catalog";

// Add a new theme here once its folder has a catalog and its preview sheet has been reviewed.
export const THEMES: LibraryTheme[] = [core, handDrawn, kineticTypeFilm, neoBrutalismPop, bentoDarkProductUi, codeExplainerTerminal, lyricVisualiser, dataStoryCharts, isometricExplainer, flatVectorExplainer, editorialCollage, paperCutout, mathDarkBoard, retroWebY2k, holographicHud, frostedGlass, scatterAssemble, uiWalkthrough, zoomThroughWorlds, audioReactive, risograph, agentCockpit, tickerType, liquidGlass, variableFont, verticalSlat, proceduralShaders, splitFlap, asciiDither, claymorphism, explodedGadget, pixelArcade, spotlightNoir, japaneseMinimal];
