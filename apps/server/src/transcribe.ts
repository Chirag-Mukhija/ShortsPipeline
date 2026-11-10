// CLI: transcribes a recording offline with local Whisper and writes <name>.txt (plain text) and <name>.srt (timed captions).
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { toSrt, transcribeRecording } from "./tts/whisperAlign";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
const file = positionals[0];
if (!file) {
  console.error("usage: pnpm transcribe <audio or video file> [--out <folder>]");
  process.exit(1);
}

// Decision: pnpm runs package scripts from apps/server, so relative paths resolve against INIT_CWD, the folder the command was typed in.
const from = process.env.INIT_CWD ?? process.cwd();
const input = path.resolve(from, file);
const outDir = values.out ? path.resolve(from, values.out) : path.dirname(input);
const base = path.join(outDir, path.parse(input).name);

console.log(`transcribing ${input} (first run builds Whisper, a few minutes)…`);
const transcript = await transcribeRecording(input);
await writeFile(`${base}.txt`, `${transcript.text}\n`);
await writeFile(`${base}.srt`, toSrt(transcript.segments));
console.log(`${transcript.segments.length} segments, ${transcript.words.length} words → ${base}.txt, ${base}.srt`);
