// Preview playback for the record page: decodes takes once (the noise-cleaned copy when cleanup is on) and plays the edited timeline straight from them, with each take's level matched and tiny fades at every cut.
import { envelope, type Segment, type Take } from "@clipforge/schema";

const FADE = 0.006;

export class Player {
  private context: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  // Which file each take plays from: its own name, or a cleaned copy such as take-….clean-ffmpeg-gentle.
  private files = new Map<string, string>();
  readonly envelopes = new Map<string, Float32Array>();
  private sources: AudioBufferSourceNode[] = [];
  private raf = 0;
  playing = false;

  constructor(private readonly videoId: string) {}

  // Decision: the audio context is made on first use and remade after close(), because React's dev mode mounts,
  // unmounts and remounts every component once; decoded buffers aren't tied to a context, so they survive.
  private get ctx(): AudioContext {
    if (!this.context || this.context.state === "closed") this.context = new AudioContext();
    return this.context;
  }

  setFiles(files: Map<string, string>): void {
    this.files = files;
  }

  load(take: string): Promise<AudioBuffer> {
    const file = this.files.get(take) ?? take;
    let buffer = this.buffers.get(file);
    if (!buffer) {
      buffer = fetch(`/videofiles/${this.videoId}/record/takes/${file}.wav`)
        .then((response) => {
          if (!response.ok) throw new Error(`Couldn't load ${take}`);
          return response.arrayBuffer();
        })
        .then((bytes) => this.ctx.decodeAudioData(bytes))
        .then((decoded) => {
          this.envelopes.set(take, envelope(decoded.getChannelData(0), decoded.sampleRate));
          return decoded;
        });
      buffer.catch(() => this.buffers.delete(file));
      this.buffers.set(file, buffer);
    }
    return buffer;
  }

  async play(segments: Segment[], starts: number[], takes: Map<string, Take>, from: number, onTick: (t: number) => void, onEnd: () => void): Promise<void> {
    this.stop();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const used = [...new Set(segments.map((s) => s.take))];
    const decoded = new Map(await Promise.all(used.map(async (take) => [take, await this.load(take)] as const)));
    const t0 = this.ctx.currentTime + 0.08;
    let total = 0;
    segments.forEach((segment, k) => {
      const at = starts[k]!;
      const dur = segment.end - segment.start;
      total = at + dur;
      if (at + dur <= from) return;
      const skip = Math.max(0, from - at);
      const source = this.ctx.createBufferSource();
      source.buffer = decoded.get(segment.take)!;
      const gain = this.ctx.createGain();
      const level = 10 ** ((takes.get(segment.take)?.gainDb ?? 0) / 20);
      const when = t0 + Math.max(0, at - from);
      const length = dur - skip;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(level, when + FADE);
      gain.gain.setValueAtTime(level, when + Math.max(FADE, length - FADE));
      gain.gain.linearRampToValueAtTime(0, when + length);
      source.connect(gain).connect(this.ctx.destination);
      source.start(when, segment.start + skip, length);
      this.sources.push(source);
    });
    this.playing = true;
    const tick = () => {
      const t = from + (this.ctx.currentTime - t0);
      if (t >= total) {
        this.stop();
        onEnd();
        return;
      }
      onTick(Math.max(from, t));
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // already ended
      }
      source.disconnect();
    });
    this.sources = [];
    this.playing = false;
  }

  close(): void {
    this.stop();
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") void context.close();
  }
}
