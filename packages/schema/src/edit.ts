// The edit stage's shared shapes: edit.json (beats, mix, music, footage), rough-cut notes, render jobs and the Edit page's state.

export type EditBeatStatus = "planned" | "building" | "ready" | "approved";

export type EditBeat = {
  id: string;
  // Relative to videos/NNN/edit/, e.g. scenes/beat-01.tsx.
  scene: string;
  // Video seconds (narration time).
  start: number;
  end: number;
  label?: string;
  status?: EditBeatStatus;
};

// Levels in dB. voiceDb and musicDb are gains (0 = as recorded / as the file is); duckDb is how far the music dips while the creator speaks.
export type EditMix = { voiceDb: number; musicDb: number; duckDb: number; musicOn: boolean; musicStart: number; fadeIn: number; fadeOut: number };
// Tracks are loudness-levelled first, so these defaults sit the music clearly under the voice for any song.
export const DEFAULT_MIX: EditMix = { voiceDb: 0, musicDb: -6, duckDb: 8, musicOn: true, musicStart: 0, fadeIn: 2, fadeOut: 3 };

// A track from the music library (data/library/music/), kept with its credit line.
export type EditMusic = { trackId: string; title: string; credit: string };

export type EditRect = { x: number; y: number; w: number; h: number };

// Something the beats need from the creator (a screen recording, a photo), and how to use it once it's uploaded.
export type EditFootage = {
  id: string;
  beat?: string;
  need: string;
  seconds?: number;
  // Relative to the video folder, e.g. media/clip-01.mov.
  file?: string;
  in?: number;
  out?: number;
  speed?: number;
  // Fractions of the frame (0–1).
  crop?: EditRect;
  blur?: EditRect[];
};

// The storyboard: one shot per idea, written before any graphics so the creator can watch it as an animatic and change it cheaply.
export const SHOT_SIZES = ["wide", "medium", "mcu", "cu", "ecu"] as const;
export type ShotSize = (typeof SHOT_SIZES)[number];
export const SHOT_MOVES = ["hold", "push", "pull", "glide", "whip", "cut"] as const;
export type ShotMove = (typeof SHOT_MOVES)[number];
export type EditShot = {
  id: string;
  beat: string;
  // Video seconds when the shot starts; it runs until the next shot in its beat (or the beat's end).
  at: number;
  // The noun on screen and what it does, e.g. "the chain" / "draws on link by link".
  subject: string;
  action: string;
  size: ShotSize;
  move: ShotMove;
  // On-screen words, at most 8.
  text?: string;
  transitionOut?: string;
};

export type EditSpec = {
  fps: number;
  width: number;
  height: number;
  duration: number;
  narration: string;
  theme?: string;
  beats: EditBeat[];
  music: EditMusic | null;
  mix: EditMix;
  footage?: EditFootage[];
  shots?: EditShot[];
  // draft until the creator approves the animatic; designers only build beats after that.
  storyboard?: "draft" | "approved";
};

// scope "video" notes are standing direction for the whole video (colours, pacing, background): every beat, built or not, follows them.
export type EditNote = { id: string; at: number; text: string; beat?: string; scope?: "moment" | "video"; status: "open" | "done"; createdAt: string };

export type RenderKind = "preview" | "final" | "stills" | "animatic";
export type RenderJob = { id: string; kind: RenderKind; beat?: string; status: "running" | "done" | "failed"; startedAt: string; finishedAt?: string; log: string[] };

export type EditBeatInfo = EditBeat & { takes: string[]; stills: string[]; thumb: string };

export type EditState = {
  spec: EditSpec | null;
  beats: EditBeatInfo[];
  notes: EditNote[];
  job: RenderJob | null;
  renders: { preview?: { url: string; updatedAt: string }; final?: { url: string; updatedAt: string }; animatic?: { url: string; updatedAt: string } };
  // Narration loudness, ~10 peaks per second (0–1), for the timeline waveform.
  waveform: number[];
  // Spoken words with times, for the timeline and for pinning notes.
  words: { text: string; start: number; end: number; beat: number }[];
  tracks: { id: string; title: string; artist: string; mood: string[]; url: string }[];
};
