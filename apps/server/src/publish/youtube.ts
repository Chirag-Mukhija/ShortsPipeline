// YouTube Data API: OAuth consent, refresh-token storage and resumable upload of the finished short.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { env, paths, publicOrigin } from "../config";

const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_FILE = path.join(paths.secrets, "youtube.json");
const REDIRECT_PATH = "/api/youtube/callback";

export function youtubeConfigured(): boolean {
  return Boolean(env.YOUTUBE_CLIENT_ID && env.YOUTUBE_CLIENT_SECRET);
}

export function youtubeConnected(): boolean {
  return youtubeConfigured() && existsSync(TOKEN_FILE);
}

function redirectUri(): string {
  return `${publicOrigin}${REDIRECT_PATH}`;
}

export function youtubeAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.YOUTUBE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token?: string; refresh_token?: string; error_description?: string }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID ?? "",
      client_secret: env.YOUTUBE_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  const json = (await response.json()) as { access_token?: string; refresh_token?: string; error_description?: string };
  if (!response.ok) throw new Error(`Google OAuth failed: ${json.error_description ?? response.status}`);
  return json;
}

export async function completeYoutubeAuth(code: string): Promise<void> {
  const tokens = await tokenRequest({ code, redirect_uri: redirectUri(), grant_type: "authorization_code" });
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token; remove the app's access and try again");
  mkdirSync(paths.secrets, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: tokens.refresh_token }), { mode: 0o600 });
}

async function accessToken(): Promise<string> {
  const stored = JSON.parse(readFileSync(TOKEN_FILE, "utf8")) as { refresh_token: string };
  const tokens = await tokenRequest({ refresh_token: stored.refresh_token, grant_type: "refresh_token" });
  if (!tokens.access_token) throw new Error("Google did not return an access token");
  return tokens.access_token;
}

function clean(text: string): string {
  return text.replace(/[<>]/g, "");
}

// Decision: YouTube counts each tag's length plus separators (and quotes around tags with spaces) toward a 500-character cap.
export function fitTags(tags: string[], budget = 480): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const tag of tags.map(clean).filter(Boolean)) {
    const cost = tag.length + (tag.includes(" ") ? 2 : 0) + (kept.length > 0 ? 1 : 0);
    if (used + cost > budget) break;
    kept.push(tag);
    used += cost;
  }
  return kept;
}

export async function uploadToYoutube(options: {
  file: string;
  title: string;
  description: string;
  tags: string[];
}): Promise<{ videoId: string; url: string; privacy: string }> {
  const token = await accessToken();
  const size = statSync(options.file).size;
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(size),
      "x-upload-content-type": "video/mp4",
    },
    body: JSON.stringify({
      snippet: {
        title: clean(options.title).slice(0, 100),
        description: clean(options.description).slice(0, 5000),
        tags: fitTags(options.tags),
        categoryId: "28",
      },
      status: { privacyStatus: env.YOUTUBE_PRIVACY, selfDeclaredMadeForKids: false },
    }),
  });
  const location = init.headers.get("location");
  if (!init.ok || !location) throw new Error(`YouTube upload init failed (${init.status}): ${await init.text()}`);
  const upload = await fetch(location, {
    method: "PUT",
    headers: { "content-type": "video/mp4", "content-length": String(size) },
    body: readFileSync(options.file),
  });
  const result = (await upload.json()) as { id?: string; status?: { privacyStatus?: string }; error?: { message?: string } };
  if (!upload.ok || !result.id) throw new Error(`YouTube upload failed (${upload.status}): ${result.error?.message ?? "unknown error"}`);
  return {
    videoId: result.id,
    url: `https://youtube.com/shorts/${result.id}`,
    privacy: result.status?.privacyStatus ?? env.YOUTUBE_PRIVACY,
  };
}
