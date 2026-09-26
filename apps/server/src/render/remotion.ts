// Bundles the video package (re-bundling when its sources change) and renders a timeline to MP4 plus a poster still.
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Timeline } from "@clipforge/schema";
import { COMPOSITION_ID } from "@clipforge/video/constants";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { FILES_PREFIX, ROOT_DIR, env, internalOrigin, paths } from "../config";

const WATCHED = [paths.videoSrc, path.join(ROOT_DIR, "packages", "schema", "src")];

let cache: { stamp: string; serveUrl: string } | null = null;
let pending: Promise<string> | null = null;

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

async function getServeUrl(onProgress: (fraction: number) => void): Promise<string> {
  const stamp = String(Math.max(...WATCHED.map(newestMtime)));
  if (cache?.stamp === stamp) return cache.serveUrl;
  pending ??= bundle({
    entryPoint: paths.videoEntry,
    rootDir: path.dirname(paths.videoSrc),
    outDir: path.join(paths.cache, "bundle"),
    onProgress: (progress) => onProgress(progress > 1 ? progress / 100 : progress),
  })
    .then((serveUrl) => {
      cache = { stamp, serveUrl };
      return serveUrl;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export async function renderShort(options: {
  timeline: Timeline;
  videoFile: string;
  posterFile: string;
  onProgress: (fraction: number, message: string) => void;
}): Promise<void> {
  options.onProgress(0.01, "Preparing headless browser");
  await ensureBrowser();
  const serveUrl = await getServeUrl((p) => options.onProgress(0.02 + p * 0.08, "Bundling templates"));
  const inputProps = { timeline: options.timeline, assetBase: `${internalOrigin}${FILES_PREFIX}` };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_ID, inputProps, logLevel: "warn" });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 20,
    outputLocation: options.videoFile,
    inputProps,
    concurrency: env.RENDER_CONCURRENCY ?? null,
    logLevel: "warn",
    onProgress: ({ progress }) =>
      options.onProgress(0.1 + progress * 0.84, `Rendering frames ${Math.round(progress * 100)}%`),
  });
  await renderStill({
    composition,
    serveUrl,
    output: options.posterFile,
    frame: Math.min(composition.durationInFrames - 1, 40),
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 85,
    scale: 0.5,
    logLevel: "warn",
  });
}
