// Finds and downloads portrait-friendly stock footage or photos from Pexels or Pixabay when their free keys are set.
import { writeFileSync } from "node:fs";
import { env } from "../config";

export type StockHit = { url: string; type: "video" | "image"; credit: string; ext: string };

export function stockProviders(): string[] {
  return [env.PEXELS_API_KEY ? "pexels" : null, env.PIXABAY_API_KEY ? "pixabay" : null].filter(
    (name): name is string => name !== null,
  );
}

type PexelsVideo = {
  duration: number;
  user?: { name?: string };
  video_files: { file_type: string; width: number; height: number; link: string }[];
};
type PexelsPhoto = { photographer?: string; src: { portrait?: string; large2x?: string; large?: string } };

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function pickVideoFile(files: PexelsVideo["video_files"]) {
  const mp4 = files.filter((file) => file.file_type === "video/mp4" && file.width <= 1920 && file.height <= 1920);
  const portrait = mp4.filter((file) => file.height >= file.width);
  const pool = portrait.length > 0 ? portrait : mp4;
  return pool.sort((a, b) => b.height - a.height)[0];
}

async function pexels(query: string, kind: "video" | "image"): Promise<StockHit | null> {
  const key = env.PEXELS_API_KEY;
  if (!key) return null;
  const q = encodeURIComponent(query);
  if (kind === "video") {
    const data = await getJson<{ videos?: PexelsVideo[] }>(
      `https://api.pexels.com/videos/search?query=${q}&orientation=portrait&size=medium&per_page=10`,
      { Authorization: key },
    );
    for (const video of data?.videos ?? []) {
      if (video.duration < 4) continue;
      const file = pickVideoFile(video.video_files);
      if (file) return { url: file.link, type: "video", credit: `Video by ${video.user?.name ?? "unknown"} on Pexels`, ext: "mp4" };
    }
    return null;
  }
  const data = await getJson<{ photos?: PexelsPhoto[] }>(
    `https://api.pexels.com/v1/search?query=${q}&orientation=portrait&per_page=10`,
    { Authorization: key },
  );
  const photo = data?.photos?.[0];
  const url = photo?.src.portrait ?? photo?.src.large2x ?? photo?.src.large;
  return photo && url ? { url, type: "image", credit: `Photo by ${photo.photographer ?? "unknown"} on Pexels`, ext: "jpg" } : null;
}

async function pixabay(query: string, kind: "video" | "image"): Promise<StockHit | null> {
  const key = env.PIXABAY_API_KEY;
  if (!key) return null;
  const q = encodeURIComponent(query);
  if (kind === "video") {
    const data = await getJson<{ hits?: { user?: string; duration: number; videos: Record<string, { url: string }> }[] }>(
      `https://pixabay.com/api/videos/?key=${key}&q=${q}&per_page=10&safesearch=true`,
    );
    for (const hit of data?.hits ?? []) {
      if (hit.duration < 4) continue;
      const url = hit.videos.large?.url || hit.videos.medium?.url;
      if (url) return { url, type: "video", credit: `Video by ${hit.user ?? "unknown"} on Pixabay`, ext: "mp4" };
    }
    return null;
  }
  const data = await getJson<{ hits?: { user?: string; largeImageURL?: string }[] }>(
    `https://pixabay.com/api/?key=${key}&q=${q}&image_type=photo&orientation=vertical&per_page=10&safesearch=true`,
  );
  const hit = data?.hits?.find((h) => h.largeImageURL);
  return hit?.largeImageURL
    ? { url: hit.largeImageURL, type: "image", credit: `Image by ${hit.user ?? "unknown"} on Pixabay`, ext: "jpg" }
    : null;
}

export async function findStock(query: string, kind: "video" | "image"): Promise<StockHit | null> {
  const kinds: ("video" | "image")[] = kind === "video" ? ["video", "image"] : ["image", "video"];
  for (const k of kinds) {
    const hit = (await pexels(query, k)) ?? (await pixabay(query, k));
    if (hit) return hit;
  }
  return null;
}

export async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}
