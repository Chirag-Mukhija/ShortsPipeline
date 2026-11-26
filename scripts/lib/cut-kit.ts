// What the Cut checker needs to know about the real kit (modes, layouts, lengths, media slots, props validation), shared by cut:check and cut:render.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CutContext, CutTemplateInfo, NarrationWord } from "../../packages/schema/src/cut";
import { KIT, STYLES } from "../../packages/video/src/kit/index";
import { beatsInVideo, trackFile, tracks } from "./music";

// Scene files are named relative to the plan's folder (videos/NNN/edit/).
export function cutContext(planFile: string): CutContext {
  const base = path.dirname(path.resolve(planFile));
  const templates = new Map<string, CutTemplateInfo>(
    KIT.map((t) => [
      t.id,
      {
        mode: t.mode,
        layouts: t.layouts,
        seconds: t.seconds,
        mediaSlots: t.mediaSlots,
        validate: (props: unknown) => {
          const r = t.schema.safeParse(props);
          return r.success ? [] : r.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "props"}: ${i.message}`);
        },
      },
    ]),
  );
  const plan = JSON.parse(readFileSync(planFile, "utf8")) as { audio?: string; duration?: number; music?: { trackId?: string }; mix?: { musicStart?: number } };
  const narration = path.join(base, "../record/narration.json");
  const words = plan.audio !== "music" && existsSync(narration) ? (JSON.parse(readFileSync(narration, "utf8")).words as NarrationWord[]) : undefined;
  const track = plan.audio === "music" ? plan.music?.trackId : undefined;
  const grid = track && trackFile(track) ? beatsInVideo(track, plan.mix?.musicStart ?? 0, plan.duration ?? 0) : null;
  return {
    templates,
    sceneExists: (scene) => existsSync(path.join(base, scene)),
    words,
    // Beats that wander aren't worth holding a cut to.
    beats: grid && grid.confidence >= 0.8 ? grid.beats : undefined,
    styles: STYLES,
    creditOf: (id) => (trackFile(id) ? (tracks().find((t) => t.id === id)?.attribution ?? "") : null),
  };
}
