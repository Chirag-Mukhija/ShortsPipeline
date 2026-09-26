// Output steps: assemble the timeline, render the MP4, write titles and hashtags, and publish or export the short.
import { copyFileSync, linkSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  MetadataSchema,
  type Metadata,
  type PublishArtifact,
  type RenderArtifact,
  type Timeline,
} from "@clipforge/schema";
import { metadataPrompt } from "../../agents/prompts";
import { absFromData, env, paths, relFromData } from "../../config";
import { updateProject } from "../../db/repo";
import { generateStructured } from "../../llm";
import { normalizeLoudness, probeDurationMs } from "../../media/ffmpeg";
import { uploadToYoutube, youtubeConfigured, youtubeConnected } from "../../publish/youtube";
import { renderShort } from "../../render/remotion";
import type { StepContext } from "../context";
import { buildTimeline } from "../timeline";

export async function timelineStep(ctx: StepContext): Promise<Timeline> {
  const timeline = buildTimeline({
    script: ctx.need("review").script,
    storyboard: ctx.need("storyboard"),
    voice: ctx.need("voice"),
    assets: ctx.need("assets"),
    sfxVolume: env.SFX_VOLUME,
    onWarning: (message) => ctx.log(message, "warn"),
  });
  ctx.log(`Timeline: ${(timeline.durationInFrames / timeline.fps).toFixed(1)}s, ${timeline.captions.length} caption pages, ${timeline.sfx.length} sound effects`);
  if (timeline.durationInFrames / timeline.fps > 90) ctx.log("Longer than 90 seconds; consider a tighter script", "warn");
  return timeline;
}

export async function renderStep(ctx: StepContext): Promise<RenderArtifact> {
  const timeline = ctx.need("timeline");
  const raw = ctx.file("renders", "raw.mp4");
  const final = ctx.file("renders", "final.mp4");
  const poster = ctx.file("renders", "poster.jpg");
  await renderShort({ timeline, videoFile: raw, posterFile: poster, onProgress: (fraction, message) => ctx.progress(fraction, message) });
  ctx.progress(0.96, "Normalizing loudness for Shorts and Reels");
  await normalizeLoudness(raw, final);
  rmSync(raw, { force: true });
  const durationSec = (await probeDurationMs(final)) / 1000;
  const sizeBytes = statSync(final).size;
  ctx.log(`Rendered ${durationSec.toFixed(1)}s video, ${(sizeBytes / 1_000_000).toFixed(1)} MB`);
  return { video: relFromData(final), poster: relFromData(poster), durationSec, sizeBytes, renderedAt: new Date().toISOString() };
}

function cleanTag(tag: string): string {
  return tag.replace(/^#+/, "").replace(/\s+/g, "").toLowerCase();
}

export async function metadataStep(ctx: StepContext): Promise<Metadata> {
  const script = ctx.need("review").script;
  const metadata = await generateStructured({
    ...metadataPrompt(ctx.project.topic, script),
    schema: MetadataSchema,
    schemaName: "metadata",
    projectId: ctx.project.id,
    validate: (result) => result.titles.filter((title) => title.length > 70).map((title) => `Title too long (${title.length} chars): ${title}`),
    onWarning: (message) => ctx.log(message, "warn"),
  });
  const cleaned: Metadata = {
    ...metadata,
    hashtags: metadata.hashtags.map(cleanTag).filter(Boolean),
    instagramHashtags: metadata.instagramHashtags.map(cleanTag).filter(Boolean),
    tags: metadata.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
  };
  const title = cleaned.titles[0];
  if (title) updateProject(ctx.project.id, { title });
  ctx.log(`Title: ${title ?? "(none)"}`);
  return cleaned;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function linkOrCopy(source: string, target: string): void {
  rmSync(target, { force: true });
  try {
    linkSync(source, target);
  } catch {
    copyFileSync(source, target);
  }
}

export function youtubeDescription(metadata: Metadata, credits: string[]): string {
  const hashtags = metadata.hashtags.map((tag) => `#${tag}`).join(" ");
  const creditBlock = credits.length > 0 ? `\n\nFootage: ${credits.join("; ")}` : "";
  return `${metadata.description}\n\n${hashtags}${creditBlock}`;
}

export async function publishStep(ctx: StepContext): Promise<PublishArtifact> {
  const render = ctx.need("render");
  const metadata = ctx.need("metadata");
  const assets = ctx.need("assets");
  const title = metadata.titles[0] ?? ctx.project.title ?? ctx.project.topic;
  const credits = Object.values(assets.media)
    .map((asset) => asset?.credit)
    .filter((credit): credit is string => Boolean(credit));
  const description = youtubeDescription(metadata, credits);
  const date = new Date().toISOString().slice(0, 10);
  const exportDir = path.join(paths.exports, `${date}-${slugify(title)}-${ctx.project.id}`);
  mkdirSync(paths.exports, { recursive: true });
  for (const previous of readdirSync(paths.exports)) {
    const stale = path.join(paths.exports, previous);
    if (previous.endsWith(`-${ctx.project.id}`) && stale !== exportDir) rmSync(stale, { recursive: true, force: true });
  }
  mkdirSync(exportDir, { recursive: true });
  linkOrCopy(absFromData(render.video), path.join(exportDir, "short.mp4"));
  linkOrCopy(absFromData(render.poster), path.join(exportDir, "poster.jpg"));
  writeFileSync(
    path.join(exportDir, "youtube.txt"),
    `TITLE\n${title}\n\nOTHER TITLE OPTIONS\n${metadata.titles.slice(1).join("\n")}\n\nDESCRIPTION\n${description}\n\nTAGS\n${metadata.tags.join(", ")}\n`,
  );
  writeFileSync(
    path.join(exportDir, "instagram.txt"),
    `${metadata.instagramCaption}\n\n${metadata.instagramHashtags.map((tag) => `#${tag}`).join(" ")}\n`,
  );
  const notes: string[] = [`Export ready: ${exportDir}`];
  let youtube: PublishArtifact["youtube"] = null;
  if (youtubeConnected()) {
    ctx.progress(0.3, "Uploading to YouTube");
    youtube = await uploadToYoutube({ file: absFromData(render.video), title, description, tags: metadata.tags });
    notes.push(`Uploaded to YouTube as ${youtube.privacy}: ${youtube.url}`);
  } else if (youtubeConfigured()) {
    notes.push("YouTube is configured but not connected yet: open the studio and click Connect YouTube.");
  } else {
    notes.push("YouTube upload is off (no YOUTUBE_CLIENT_ID in .env). Upload short.mp4 with youtube.txt.");
  }
  notes.push("Instagram auto-publish is off. Post short.mp4 with the caption in instagram.txt.");
  for (const note of notes) ctx.log(note);
  return { youtube, exportDir: relFromData(exportDir), notes };
}
