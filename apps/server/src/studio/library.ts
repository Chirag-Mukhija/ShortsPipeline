// Reads the motion and music libraries for the website: the theme catalog written by scripts/library-catalog.ts, preview stills, and the music tracks.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execOrThrow } from "../lib/exec";
import path from "node:path";
import type { LibraryCatalog, LibraryThemeInfo, MusicTrack } from "@clipforge/schema";
import { DATA_DIR, FILES_PREFIX } from "../config";

type RawTheme = Omit<LibraryThemeInfo, "entries"> & { entries: Omit<LibraryThemeInfo["entries"][number], "preview" | "mid">[] };

const readJson = <T>(file: string, fallback: T): T => {
  try {
    return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function readLibrary(): LibraryCatalog {
  const raw = readJson<{ themes: RawTheme[] }>(path.join(DATA_DIR, "library", "catalog.json"), { themes: [] });
  const still = (slug: string, file: string) =>
    existsSync(path.join(DATA_DIR, "library", "previews", slug, file)) ? `${FILES_PREFIX}/library/previews/${slug}/${encodeURIComponent(file)}` : "";
  const themes = raw.themes.map((theme) => ({
    ...theme,
    entries: theme.entries.map((e) => ({ ...e, preview: still(theme.slug, `${e.id}.png`), mid: still(theme.slug, `${e.id}.mid.png`) })),
  }));
  // Decision: tracks the creator has downloaded (data/library/music/tracks.json) come first; research candidates fill in after, never twice.
  const ready = readJson<MusicTrack[]>(path.join(DATA_DIR, "library", "music", "tracks.json"), []);
  const candidates = readJson<MusicTrack[]>(path.join(DATA_DIR, "music", "candidates.json"), []);
  const seen = new Set(ready.map((t) => t.id));
  const music = [...ready.map((t) => ({ ...t, status: "ready" as const })), ...candidates.filter((t) => !seen.has(t.id)).map((t) => ({ ...t, status: "candidate" as const }))];
  return { themes, music, musicSources: existsSync(path.join(DATA_DIR, "music", "SOURCES.md")) };
}

// Adds a track from the creator's computer to data/library/music/, levelled to the studio's loudness once so every song sits the same under the voice. The creator handles licensing.
export async function addMusicTrack(meta: { id: string; title: string; artist: string; license: string; attribution: string; source: string; url: string; mood: string }, original: string, bytes: Buffer): Promise<void> {
  const dir = path.join(DATA_DIR, "library", "music");
  mkdirSync(dir, { recursive: true });
  const id = meta.id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 60);
  const ext = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp3";
  const raw = path.join(dir, `${id}.upload${ext}`);
  writeFileSync(raw, bytes);
  await execOrThrow("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ar", "48000", "-b:a", "192k", path.join(dir, `${id}.mp3`)]);
  rmSync(raw, { force: true });
  const tracks = readJson<MusicTrack[]>(path.join(dir, "tracks.json"), []).filter((t) => t.id !== id);
  tracks.push({ id, title: meta.title, artist: meta.artist, source: meta.source, url: meta.url, license: meta.license, attribution: meta.attribution, mood: meta.mood.split(",").map((m) => m.trim()).filter(Boolean), bpm: null, duration: null, status: "ready", file: `${id}.mp3` });
  writeFileSync(path.join(dir, "tracks.json"), `${JSON.stringify(tracks, null, 2)}\n`);
}
