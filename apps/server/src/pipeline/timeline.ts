// Pure timeline assembly: merges script, storyboard, voice timings and assets into frame-accurate scenes, captions and SFX.
import {
  VIDEO_DEFAULTS,
  buildCaptionPages,
  estimateWordTimings,
  resolveCues,
  splitWords,
  type AssetsArtifact,
  type DiagramProps,
  type Script,
  type SfxName,
  type Storyboard,
  type StoryboardScene,
  type TimedCue,
  type TimedWord,
  type Timeline,
  type TimelineScene,
  type VoiceArtifact,
} from "@clipforge/schema";

const TAIL_MS = 260;
const LAST_HOLD_MS = 700;
const MIN_SCENE_MS = 1200;
const POP_SPACING_FRAMES = 8;

type SfxCue = Timeline["sfx"][number];
type ResolvedScene = TimelineScene extends infer T ? (T extends TimelineScene ? Pick<T, "template" | "props"> : never) : never;

export function sanitizeDiagram(props: DiagramProps): DiagramProps {
  const seen = new Set<string>();
  const cells = new Set<string>();
  const nodes: DiagramProps["nodes"] = [];
  for (const node of props.nodes) {
    const id = node.id.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    let col = Math.min(2, Math.max(0, Math.round(node.col)));
    let row = Math.min(4, Math.max(0, Math.round(node.row)));
    if (cells.has(`${col},${row}`)) {
      let best: [number, number] | null = null;
      let bestDistance = Infinity;
      for (let r = 0; r <= 4; r++) {
        for (let c = 0; c <= 2; c++) {
          if (cells.has(`${c},${r}`)) continue;
          const distance = Math.abs(r - row) * 2 + Math.abs(c - col);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = [c, r];
          }
        }
      }
      if (!best) continue;
      [col, row] = best;
    }
    cells.add(`${col},${row}`);
    nodes.push({ ...node, id, col, row });
  }
  const edges = props.edges.filter((edge) => {
    const from = edge.from.toLowerCase();
    const to = edge.to.toLowerCase();
    return from !== to && seen.has(from) && seen.has(to);
  });
  return { ...props, nodes, edges: edges.map((edge) => ({ ...edge, from: edge.from.toLowerCase(), to: edge.to.toLowerCase() })) };
}

function fallbackScene(id: string, narration: string): StoryboardScene {
  return {
    id,
    template: "KineticText",
    props: { text: splitWords(narration).slice(0, 7).join(" "), highlight: [] },
    cues: [],
  };
}

function resolveProps(scene: StoryboardScene, assets: AssetsArtifact): ResolvedScene {
  switch (scene.template) {
    case "CodeBlock": {
      const code = assets.code[scene.id];
      return { template: "CodeBlock", props: { ...scene.props, tokens: code?.tokens ?? [], background: code?.background ?? "" } };
    }
    case "Media":
      return { template: "Media", props: { ...scene.props, asset: assets.media[scene.id] ?? null } };
    case "Diagram":
      return { template: "Diagram", props: sanitizeDiagram(scene.props) };
    default:
      return { template: scene.template, props: scene.props } as ResolvedScene;
  }
}

function sceneSfx(
  resolved: ResolvedScene,
  from: number,
  cues: TimedCue[],
  index: number,
  volume: number,
): SfxCue[] {
  const effects: SfxCue[] = [];
  const add = (frame: number, name: SfxName, level: number) => effects.push({ frame, name, volume: volume * level });
  if (index > 0) add(from, "whoosh", 0.55);
  if (resolved.template === "HookSlam") add(from + (resolved.props.icon || resolved.props.kicker ? 8 : 2) + 3, "slam", 1);
  if (resolved.template === "StatCounter") add(from + 40, "ding", 0.6);
  for (const cue of cues) {
    if (cue.action === "reveal" || cue.action === "packet") add(from + cue.frame + 2, "pop", 0.5);
    if (cue.action === "shake") add(from + cue.frame, "slam", 0.6);
  }
  return effects;
}

function thinPops(effects: SfxCue[]): SfxCue[] {
  const sorted = [...effects].sort((a, b) => a.frame - b.frame);
  let lastPop = -Infinity;
  return sorted.filter((effect) => {
    if (effect.name !== "pop") return true;
    if (effect.frame - lastPop < POP_SPACING_FRAMES) return false;
    lastPop = effect.frame;
    return true;
  });
}

export function buildTimeline(input: {
  script: Script;
  storyboard: Storyboard;
  voice: VoiceArtifact | null;
  assets: AssetsArtifact;
  sfxVolume: number;
  onWarning?: (message: string) => void;
}): Timeline {
  const { fps } = VIDEO_DEFAULTS;
  const scenes: TimelineScene[] = [];
  const allWords: TimedWord[] = [];
  const effects: SfxCue[] = [];
  let from = 0;
  input.script.scenes.forEach((scriptScene, index) => {
    const boardScene =
      input.storyboard.scenes.find((scene) => scene.id === scriptScene.id) ?? fallbackScene(scriptScene.id, scriptScene.narration);
    const spoken = input.voice?.scenes.find((scene) => scene.id === scriptScene.id);
    const isLast = index === input.script.scenes.length - 1;
    const estimatedMs = splitWords(scriptScene.narration).length * 360 + 300;
    const speechMs = spoken ? Math.min(spoken.durationMs, spoken.speechEndMs + TAIL_MS) : estimatedMs;
    const durationMs = Math.max(MIN_SCENE_MS, speechMs) + (isLast ? LAST_HOLD_MS : 0);
    const durationInFrames = Math.ceil((durationMs / 1000) * fps);
    const words = spoken?.words ?? estimateWordTimings(scriptScene.narration, speechMs);
    const { cues, unresolved } = resolveCues(boardScene.cues, words, fps, durationInFrames);
    if (unresolved.length > 0) {
      input.onWarning?.(`${scriptScene.id}: cue words never spoken (${unresolved.join(", ")}); spread evenly instead`);
    }
    const resolved = resolveProps(boardScene, input.assets);
    scenes.push({
      ...resolved,
      id: scriptScene.id,
      from,
      durationInFrames,
      narration: scriptScene.narration,
      audio: spoken ? { src: `${spoken.file}?v=${Math.round(spoken.durationMs)}`, durationMs: spoken.durationMs } : null,
      words,
      cues,
    } as TimelineScene);
    const offsetMs = (from / fps) * 1000;
    allWords.push(...words.map((word) => ({ text: word.text, startMs: word.startMs + offsetMs, endMs: word.endMs + offsetMs })));
    effects.push(...sceneSfx(resolved, from, cues, index, input.sfxVolume));
    from += durationInFrames;
  });
  return {
    version: 1,
    ...VIDEO_DEFAULTS,
    durationInFrames: from,
    title: input.script.title,
    scenes,
    captions: buildCaptionPages(allWords),
    sfx: thinPops(effects),
    music: input.assets.music,
  };
}
