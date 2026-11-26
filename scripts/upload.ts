// Uploads a finished video to the creator's YouTube channel as PRIVATE, with its package (title, description, tags, category) and custom thumbnail, once the creator has approved the package. Making it public stays the creator's own click in YouTube Studio.
// Usage: pnpm upload <videoId>
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { UploadSchema } from "../packages/schema/src/package";
import { setYoutubeThumbnail, uploadToYoutube, youtubeConfigured, youtubeConnected } from "../apps/server/src/publish/youtube";
import { publicOrigin } from "../apps/server/src/config";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const videosRoot = process.env.STUDIO_VIDEOS_DIR ? path.resolve(process.env.STUDIO_VIDEOS_DIR) : path.join(root, "videos");
const id = process.argv[2];
if (!id) {
  console.error("Usage: pnpm upload <videoId>");
  process.exit(2);
}
const dir = path.join(videosRoot, id);
const stop = (message: string) => {
  console.error(message);
  process.exit(1);
};

// Gates, cheapest first: the creator approved the package, it hasn't gone up already, the package passes its checks, YouTube is connected.
const status = readFileSync(path.join(dir, "status.md"), "utf8");
if (!/^- \S+ package(?: \+ upload)?: APPROVED by the creator/m.test(status)) stop("The creator hasn't approved the package yet (status.md needs '- <date> package: APPROVED by the creator').");
const record = path.join(dir, "package/uploaded.json");
if (existsSync(record)) stop(`Already uploaded: ${JSON.parse(readFileSync(record, "utf8")).url}. Delete package/uploaded.json only if that upload was removed from YouTube.`);
try {
  execFileSync(path.join(root, "apps/server/node_modules/.bin/tsx"), [path.join(root, "scripts/package-check.ts"), id], { stdio: "inherit" });
} catch {
  stop("package:check found red issues; fix them first.");
}
if (!youtubeConfigured()) stop("YouTube isn't configured (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET in .env).");
if (!youtubeConnected()) stop(`YouTube isn't connected yet. Start the server (pnpm dev) and open ${publicOrigin}/api/youtube/auth once to give consent.`);

const u = UploadSchema.parse(JSON.parse(readFileSync(path.join(dir, "package/upload.json"), "utf8")));
console.log(`Uploading "${u.title}" as private…`);
const result = await uploadToYoutube({ file: path.join(dir, u.file), title: u.title, description: u.description, tags: u.tags, categoryId: u.categoryId, privacy: "private", short: false });
let thumbnail = "set";
try {
  await setYoutubeThumbnail(result.videoId, path.join(dir, u.thumbnail));
} catch (error) {
  thumbnail = `not set: ${(error as Error).message}`;
}
const at = new Date().toISOString();
writeFileSync(record, JSON.stringify({ ...result, thumbnail, at }, null, 2));
appendFileSync(path.join(dir, "status.md"), `- ${at.slice(0, 10)} package + upload: uploaded PRIVATE to YouTube (${result.url}); thumbnail ${thumbnail}. The creator makes it public.\n`);
console.log(`Uploaded privately: ${result.url} (thumbnail ${thumbnail}). Make it public yourself in YouTube Studio when you're ready.`);
