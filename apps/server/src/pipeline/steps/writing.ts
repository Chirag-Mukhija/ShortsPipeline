// Writing steps: pick the angle, draft the script, run the critic pass and storyboard the final script.
import {
  AnglePlanSchema,
  ReviewSchema,
  ScriptSchema,
  StoryboardSchema,
  type Angle,
  type AnglePlan,
  type Review,
  type Script,
  type Storyboard,
} from "@clipforge/schema";
import { checkAngles, checkScript, checkStoryboard, scriptWordCount } from "../../agents/checks";
import { anglePrompt, reviewPrompt, scriptPrompt, storyboardPrompt } from "../../agents/prompts";
import { stockProviders } from "../../assets/stock";
import { updateProject } from "../../db/repo";
import { generateStructured } from "../../llm";
import type { StepContext } from "../context";

export function chosenAngle(plan: AnglePlan): Angle {
  return plan.angles[plan.chosenIndex] ?? plan.angles[0]!;
}

export async function angleStep(ctx: StepContext): Promise<AnglePlan> {
  const plan = await generateStructured({
    ...anglePrompt(ctx.project.topic),
    schema: AnglePlanSchema,
    schemaName: "angle_plan",
    projectId: ctx.project.id,
    validate: checkAngles,
    onWarning: (message) => ctx.log(message, "warn"),
  });
  const angle = chosenAngle(plan);
  ctx.log(`Angle: "${angle.hook}" (${plan.reason})`);
  updateProject(ctx.project.id, { title: angle.title });
  return plan;
}

export async function scriptStep(ctx: StepContext): Promise<Script> {
  const script = await generateStructured({
    ...scriptPrompt(ctx.project.topic, chosenAngle(ctx.need("angle"))),
    schema: ScriptSchema,
    schemaName: "script",
    projectId: ctx.project.id,
    validate: checkScript,
    onWarning: (message) => ctx.log(message, "warn"),
  });
  ctx.log(`Draft: ${script.scenes.length} scenes, ${scriptWordCount(script)} words`);
  return script;
}

export async function reviewStep(ctx: StepContext): Promise<Review> {
  const review = await generateStructured({
    ...reviewPrompt(ctx.project.topic, ctx.need("script")),
    schema: ReviewSchema,
    schemaName: "review",
    projectId: ctx.project.id,
    validate: (result) => checkScript(result.script),
    onWarning: (message) => ctx.log(message, "warn"),
  });
  const s = review.scores;
  ctx.log(`Critic scores: hook ${s.hook}, clarity ${s.clarity}, accuracy ${s.accuracy}, pacing ${s.pacing}, wit ${s.wit}`);
  for (const issue of review.issues.slice(0, 4)) ctx.log(`Fixed: ${issue}`);
  ctx.log(`Final script: ${review.script.scenes.length} scenes, ${scriptWordCount(review.script)} words`);
  updateProject(ctx.project.id, { title: review.script.title });
  return review;
}

export async function storyboardStep(ctx: StepContext): Promise<Storyboard> {
  const script = ctx.need("review").script;
  const stockAvailable = stockProviders().length > 0;
  const board = await generateStructured({
    ...storyboardPrompt(script, stockAvailable),
    schema: StoryboardSchema,
    schemaName: "storyboard",
    projectId: ctx.project.id,
    validate: (result) => checkStoryboard(result, script, stockAvailable),
    onWarning: (message) => ctx.log(message, "warn"),
  });
  ctx.log(`Storyboard: ${board.scenes.map((scene) => scene.template).join(" → ")}`);
  return board;
}
