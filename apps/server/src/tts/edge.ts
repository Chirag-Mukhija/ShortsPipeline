// Free Microsoft Edge neural voices (en-IN Prabhat and Neerja by default) with word boundaries; no API key needed.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type { SpeechBoundary, SpeechResult, TtsProvider } from "./types";

type BoundaryEvent = { Type: string; Data: { Offset: number; Duration: number; text: { Text: string } } };

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function collect(stream: NodeJS.ReadableStream | null | undefined, sink: (chunk: Buffer) => void): Promise<void> {
  if (!stream) return Promise.resolve();
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => sink(chunk));
    stream.on("close", () => resolve());
    stream.on("end", () => resolve());
    stream.on("error", reject);
  });
}

export class EdgeTts implements TtsProvider {
  readonly id = "edge";

  constructor(
    readonly voice: string,
    private readonly rate: string,
  ) {}

  async synthesize(text: string): Promise<SpeechResult> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(this.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, { wordBoundaryEnabled: true });
      const { audioStream, metadataStream } = tts.toStream(escapeXml(text), { rate: this.rate });
      const audio: Buffer[] = [];
      const boundaries: SpeechBoundary[] = [];
      const done = Promise.all([
        collect(audioStream, (chunk) => audio.push(chunk)),
        collect(metadataStream, (chunk) => {
          const parsed = JSON.parse(chunk.toString()) as { Metadata?: BoundaryEvent[] };
          for (const event of parsed.Metadata ?? []) {
            if (event.Type !== "WordBoundary") continue;
            const startMs = event.Data.Offset / 10_000;
            boundaries.push({ text: event.Data.text.Text, startMs, endMs: startMs + event.Data.Duration / 10_000 });
          }
        }),
      ]);
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Edge TTS timed out")), 60_000);
      });
      await Promise.race([done, timeout]).finally(() => clearTimeout(timer));
      const buffer = Buffer.concat(audio);
      if (buffer.length < 1000) throw new Error("Edge TTS returned no audio");
      return { audio: buffer, boundaries };
    } finally {
      tts.close();
    }
  }
}
