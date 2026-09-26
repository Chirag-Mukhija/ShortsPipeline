// Storyboard schema: one template choice, props and word-anchored cues per script scene.
import { z } from "zod";
import {
  CodeBlockPropsSchema,
  ComparePropsSchema,
  DiagramPropsSchema,
  HookSlamPropsSchema,
  KineticTextPropsSchema,
  ListRevealPropsSchema,
  MediaPropsSchema,
  StatCounterPropsSchema,
} from "./templates";

export const CUE_ACTIONS = ["reveal", "highlight", "packet", "pulse", "shake", "zoom"] as const;
export type CueAction = (typeof CUE_ACTIONS)[number];

export const CueSchema = z.object({
  word: z
    .string()
    .describe("A word (or 2-3 word phrase) copied exactly from THIS scene's narration; the action fires as it is spoken."),
  action: z.enum(CUE_ACTIONS),
  target: z
    .string()
    .optional()
    .describe("What the action applies to, e.g. node:cpu, edge:cpu-ram, line:3, item:2, left, right, verdict."),
});
export type Cue = z.infer<typeof CueSchema>;

const sceneBase = {
  id: z.string().describe("Must match the script scene id exactly."),
  cues: z.array(CueSchema).max(6),
};

export const StoryboardSceneSchema = z.discriminatedUnion("template", [
  z.object({ ...sceneBase, template: z.literal("HookSlam"), props: HookSlamPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("KineticText"), props: KineticTextPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("Diagram"), props: DiagramPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("CodeBlock"), props: CodeBlockPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("Compare"), props: ComparePropsSchema }),
  z.object({ ...sceneBase, template: z.literal("ListReveal"), props: ListRevealPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("StatCounter"), props: StatCounterPropsSchema }),
  z.object({ ...sceneBase, template: z.literal("Media"), props: MediaPropsSchema }),
]);
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;

export const StoryboardSchema = z.object({
  scenes: z.array(StoryboardSceneSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;
