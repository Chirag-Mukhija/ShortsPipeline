// LLM-facing schemas for the writing steps: angle choice, script, critic review and publish metadata.
import { z } from "zod";

export const AngleSchema = z.object({
  hook: z
    .string()
    .describe("First spoken line. Max 14 words. Creates curiosity, surprise or a contradiction within 3 seconds."),
  title: z.string().describe("Working title, max 55 characters, honest (no clickbait lies)."),
  promise: z.string().describe("The one thing the viewer will genuinely understand by the end."),
  analogy: z
    .string()
    .describe("A concrete everyday analogy that makes the core idea click. Indian daily-life references are welcome."),
});
export type Angle = z.infer<typeof AngleSchema>;

export const AnglePlanSchema = z.object({
  angles: z.array(AngleSchema).min(3).max(5),
  chosenIndex: z.number().int().min(0).describe("Index into angles of the strongest option."),
  reason: z.string().describe("One sentence on why the chosen angle will hold attention best."),
});
export type AnglePlan = z.infer<typeof AnglePlanSchema>;

export const ScriptSceneSchema = z.object({
  id: z.string().describe("Sequential id: s1, s2, s3 ..."),
  narration: z
    .string()
    .describe(
      "Exactly what the voice says in this scene. 1-2 short sentences, max 30 words. Plain spoken English: no emojis, no markdown, no stage directions.",
    ),
  visual: z.string().describe("One line describing what the viewer should see while this is said."),
});
export type ScriptScene = z.infer<typeof ScriptSceneSchema>;

export const ScriptSchema = z.object({
  title: z.string().describe("Working title, max 55 characters."),
  scenes: z.array(ScriptSceneSchema).min(4).max(10),
});
export type Script = z.infer<typeof ScriptSchema>;

const Score = z.number().min(1).max(10);

export const ReviewSchema = z.object({
  scores: z.object({
    hook: Score,
    clarity: Score,
    accuracy: Score,
    pacing: Score,
    wit: Score,
  }),
  issues: z.array(z.string()).describe("Concrete problems in the draft, most important first. Empty if none."),
  script: ScriptSchema.describe("The improved final script. Keep what works and fix every listed issue."),
});
export type Review = z.infer<typeof ReviewSchema>;

export const MetadataSchema = z.object({
  titles: z.array(z.string()).min(3).max(5).describe("Title options, max 60 characters each, strongest first."),
  description: z
    .string()
    .describe("YouTube description: 2-3 short lines expanding the hook, then a follow call to action. No hashtags."),
  hashtags: z.array(z.string()).min(3).max(5).describe("YouTube hashtags without the # symbol, most relevant first."),
  tags: z.array(z.string()).max(15).describe("YouTube search tags, lowercase, mix of broad and specific."),
  instagramCaption: z
    .string()
    .describe("Instagram caption: hook line, 1-2 lines of value, then a call to action. No hashtags."),
  instagramHashtags: z.array(z.string()).min(3).max(5).describe("Instagram hashtags without the # symbol."),
});
export type Metadata = z.infer<typeof MetadataSchema>;
