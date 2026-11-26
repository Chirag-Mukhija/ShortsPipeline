// Lists the music library, or prints one track's beats in video time so a music-only cut can be planned on them.
// Usage: pnpm music:beats            (the tracks, with mood and tempo)
//        pnpm music:beats <trackId> [--start 12.5] [--seconds 120]
import { beatsInVideo, beatsOf, tracks } from "./lib/music";

const id = process.argv[2];
const opt = (name: string, dflt: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
};
if (!id || id.startsWith("--")) {
  for (const t of tracks()) if (t.file) console.log(`${t.id.padEnd(34)} ${String(t.bpm ?? "?").padStart(4)} bpm  ${String(Math.round(t.duration ?? 0)).padStart(4)} s  ${t.license ?? ""}  ${(t.mood ?? []).join(", ")}`);
} else {
  const start = opt("start", 0);
  const seconds = opt("seconds", 120);
  const grid = beatsInVideo(id, start, seconds);
  if (!grid || !beatsOf(id)) {
    console.error(`No track "${id}" with a file in the music library.`);
    process.exit(1);
  }
  console.log(`${id}: ${grid.bpm} bpm, steady beats ${grid.confidence}${grid.confidence < 0.8 ? " (wandering: this track has no clear pulse to cut on, so prefer another or cut on phrases)" : ""}. Video time 0 is ${start} s into the track.`);
  console.log(`credit (copy word for word): ${JSON.stringify(tracks().find((t) => t.id === id)?.attribution ?? "")}`);
  console.log(`bars (first beat of each): ${grid.downbeats.join(" ")}`);
  console.log(`beats: ${grid.beats.join(" ")}`);
}
