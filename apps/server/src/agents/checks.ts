// Semantic checks on LLM output that a JSON schema cannot express: length, ids, template rules and cue anchors.
import {
  ICON_NAMES,
  normalizeToken,
  splitWords,
  type AnglePlan,
  type Script,
  type Storyboard,
} from "@clipforge/schema";
import { WORDS_MAX, WORDS_MIN } from "./prompts";

const ICONS = new Set<string>(ICON_NAMES);

export function scriptWordCount(script: Script): number {
  return script.scenes.reduce((sum, scene) => sum + splitWords(scene.narration).length, 0);
}

export function checkAngles(plan: AnglePlan): string[] {
  return plan.chosenIndex < plan.angles.length ? [] : ["chosenIndex must point at one of the angles"];
}

export function checkScript(script: Script): string[] {
  const problems: string[] = [];
  const words = scriptWordCount(script);
  if (words < WORDS_MIN - 10 || words > WORDS_MAX + 10) {
    problems.push(`Total narration is ${words} words; it must be ${WORDS_MIN}-${WORDS_MAX}.`);
  }
  script.scenes.forEach((scene, i) => {
    if (scene.id !== `s${i + 1}`) problems.push(`Scene ${i + 1} has id "${scene.id}"; ids must be s1, s2, ... in order.`);
    const count = splitWords(scene.narration).length;
    if (i === 0 && count > 16) problems.push(`The hook (s1) has ${count} words; keep it at most 14.`);
    if (count > 34) problems.push(`Scene ${scene.id} has ${count} words; keep each scene at most 30.`);
    if (/[#*_`\[\]{}]|\p{Extended_Pictographic}/u.test(scene.narration)) {
      problems.push(`Scene ${scene.id} narration contains symbols, markdown or emoji; write plain spoken English.`);
    }
    if (/\d+\s?(gb|mb|kb|tb|ghz|%)\b/i.test(scene.narration) || /\d%/.test(scene.narration)) {
      problems.push(`Scene ${scene.id} uses unit symbols; write units the way they are spoken.`);
    }
  });
  return problems;
}

function iconProblem(sceneId: string, icon: string | undefined): string | null {
  if (!icon) return null;
  const trimmed = icon.trim();
  if (trimmed.startsWith("lucide:") && !ICONS.has(trimmed.slice(7))) {
    return `Scene ${sceneId} uses unknown icon "${trimmed}"; pick from the allowed list or use an emoji.`;
  }
  return null;
}

export function checkStoryboard(board: Storyboard, script: Script, stockAvailable: boolean): string[] {
  const problems: string[] = [];
  const expected = script.scenes.map((scene) => scene.id);
  const actual = board.scenes.map((scene) => scene.id);
  if (expected.join(",") !== actual.join(",")) {
    problems.push(`Scene ids must be exactly [${expected.join(", ")}] in order; got [${actual.join(", ")}].`);
  }
  board.scenes.forEach((scene, i) => {
    if (i === 0 && scene.template !== "HookSlam") problems.push("Scene s1 must use HookSlam.");
    if (i > 0 && scene.template === "HookSlam") problems.push(`Scene ${scene.id} uses HookSlam; only s1 may.`);
    if (!stockAvailable && scene.template === "Media") problems.push(`Scene ${scene.id} uses Media but stock footage is unavailable.`);
    const narration = script.scenes.find((s) => s.id === scene.id)?.narration ?? "";
    const tokens = new Set(splitWords(narration).map(normalizeToken));
    for (const cue of scene.cues) {
      const first = normalizeToken(splitWords(cue.word)[0] ?? "");
      if (first && !tokens.has(first) && ![...tokens].some((t) => t.startsWith(first) || (first.startsWith(t) && t.length >= 3))) {
        problems.push(`Scene ${scene.id} cue word "${cue.word}" is not in its narration.`);
      }
    }
    const icons: (string | undefined)[] = [];
    switch (scene.template) {
      case "Diagram": {
        const ids = new Set(scene.props.nodes.map((node) => node.id.toLowerCase()));
        for (const edge of scene.props.edges) {
          if (!ids.has(edge.from.toLowerCase()) || !ids.has(edge.to.toLowerCase())) {
            problems.push(`Scene ${scene.id} has an edge ${edge.from}->${edge.to} to a node that does not exist.`);
          }
        }
        const cells = new Set<string>();
        for (const node of scene.props.nodes) {
          const cell = `${node.col},${node.row}`;
          if (cells.has(cell)) problems.push(`Scene ${scene.id} has two nodes in col ${node.col}, row ${node.row}.`);
          cells.add(cell);
          icons.push(node.icon);
        }
        break;
      }
      case "CodeBlock": {
        const lines = scene.props.code.split("\n");
        if (lines.length > 14) problems.push(`Scene ${scene.id} code has ${lines.length} lines; max 12.`);
        const long = lines.find((line) => line.length > 40);
        if (long) problems.push(`Scene ${scene.id} code line is too long (${long.length} chars); max 34.`);
        break;
      }
      case "Compare":
        icons.push(scene.props.left.icon, scene.props.right.icon);
        break;
      case "ListReveal":
        icons.push(...scene.props.items.map((item) => item.icon));
        break;
      default:
        icons.push("icon" in scene.props ? scene.props.icon : undefined);
    }
    for (const icon of icons) {
      const problem = iconProblem(scene.id, icon);
      if (problem) problems.push(problem);
    }
  });
  return problems;
}
