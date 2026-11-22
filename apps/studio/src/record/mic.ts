// Microphone for the record page: device choice, a live level meter, a glitch watch, hearing yourself in earphones, raw PCM streamed to the server as a take, and a rolling 16 kHz window for the live teleprompter.
import { ClickDetector } from "@clipforge/schema";
import { studio } from "../api";

// Decision: an AudioWorklet taps raw samples (no browser compression), batched to 2048 so the main thread gets ~23 messages a second.
const WORKLET = `class Tap extends AudioWorkletProcessor{constructor(){super();this.buf=new Float32Array(2048);this.n=0}process(inputs){const ch=inputs[0]&&inputs[0][0];if(ch){for(let i=0;i<ch.length;i++){this.buf[this.n++]=ch[i];if(this.n===this.buf.length){this.port.postMessage(this.buf.slice(0));this.n=0}}}return true}}registerProcessor('tap',Tap)`;

export type Level = { rms: number; peak: number; clippedAt: number; voiceAt: number };

const LIVE_SECONDS = 5;
const LIVE_RATE = 16000;
const VOICE_RMS = 0.01;
// Same rule as the takes' glitch marks: three clicks close together is the mic glitching, one is just a plosive.
const GLITCH_CLICKS = 3;
const GLITCH_WINDOW_MS = 1500;

export async function listMics(): Promise<MediaDeviceInfo[]> {
  return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId !== "");
}

export class Mic {
  readonly level: Level = { rms: 0, peak: 0, clippedAt: 0, voiceAt: 0 };
  private take: TakeWriter | null = null;
  private live = new Float32Array(LIVE_SECONDS * LIVE_RATE);
  private liveFill = 0;
  private resampleAt = 0;
  private clicks = new ClickDetector();
  private clickTimes: number[] = [];
  glitchAt = 0;
  takeGlitches = 0;

  private constructor(
    readonly ctx: AudioContext,
    private readonly stream: MediaStream,
    private readonly nodes: AudioNode[],
    private readonly monitorGain: GainNode,
    readonly label: string,
  ) {}

  static async open(deviceId: string | null): Promise<Mic> {
    // Decision: the browser's echo cancelling, noise suppression and auto gain are off, so the recording is the mic as it is.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    const ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const source = ctx.createMediaStreamSource(stream);
    const tap = new AudioWorkletNode(ctx, "tap");
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(tap).connect(mute).connect(ctx.destination);
    // Hearing yourself goes straight from the mic to the output, so it only adds the system's own audio latency.
    const monitor = ctx.createGain();
    monitor.gain.value = 0;
    source.connect(monitor).connect(ctx.destination);
    const mic = new Mic(ctx, stream, [source, tap, mute, monitor], monitor, stream.getAudioTracks()[0]?.label ?? "Microphone");
    tap.port.onmessage = (event: MessageEvent<Float32Array>) => mic.onSamples(event.data);
    return mic;
  }

  get monitoring(): boolean {
    return this.monitorGain.gain.value > 0;
  }

  async setMonitor(on: boolean): Promise<void> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.monitorGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  // True while the mic is crackling or dropping out right now.
  glitching(): boolean {
    return performance.now() - this.glitchAt < 600;
  }

  get rate(): number {
    return this.ctx.sampleRate;
  }

  get deviceId(): string | null {
    return this.stream.getAudioTracks()[0]?.getSettings().deviceId ?? null;
  }

  // The live mic track, recorded into the face cam file as a reference for syncing it to the voice take.
  get track(): MediaStreamTrack | null {
    return this.stream.getAudioTracks()[0] ?? null;
  }

  private onSamples(chunk: Float32Array): void {
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < chunk.length; i++) {
      const v = Math.abs(chunk[i]!);
      sum += v * v;
      if (v > peak) peak = v;
    }
    const rms = Math.sqrt(sum / chunk.length);
    const now = performance.now();
    this.level.rms = rms;
    this.level.peak = Math.max(peak, this.level.peak * 0.92);
    if (peak >= 0.985) this.level.clippedAt = now;
    if (rms > VOICE_RMS) this.level.voiceAt = now;
    const found = this.clicks.push(chunk).length;
    if (found > 0) {
      for (let k = 0; k < found; k++) this.clickTimes.push(now);
      while (this.clickTimes.length && now - this.clickTimes[0]! > GLITCH_WINDOW_MS) this.clickTimes.shift();
      if (this.clickTimes.length >= GLITCH_CLICKS) {
        if (this.take && !this.glitching()) this.takeGlitches++;
        this.glitchAt = now;
      }
    }
    if (this.take) {
      this.take.push(chunk);
      this.pushLive(chunk);
    }
  }

  // Box-filter resample to 16 kHz: crude, but Whisper only needs it to tell where the reader is.
  private pushLive(chunk: Float32Array): void {
    const step = this.rate / LIVE_RATE;
    const values: number[] = [];
    let at = this.resampleAt;
    while (at + step <= chunk.length) {
      let sum = 0;
      const from = Math.floor(at);
      const to = Math.floor(at + step);
      for (let i = from; i < to; i++) sum += chunk[i]!;
      values.push(sum / Math.max(1, to - from));
      at += step;
    }
    this.resampleAt = at - chunk.length;
    const overflow = this.liveFill + values.length - this.live.length;
    if (overflow > 0) {
      this.live.copyWithin(0, overflow, this.liveFill);
      this.liveFill -= overflow;
    }
    this.live.set(values, this.liveFill);
    this.liveFill += values.length;
  }

  // The last few seconds as 16-bit PCM, for the teleprompter's listener.
  liveWindow(): ArrayBuffer {
    return toInt16(this.live.subarray(0, this.liveFill)).buffer as ArrayBuffer;
  }

  speakingRecently(ms: number): boolean {
    return performance.now() - this.level.voiceAt < ms;
  }

  async startTake(videoId: string, from: number): Promise<TakeWriter> {
    if (this.ctx.state === "suspended") await this.ctx.resume();
    const { take } = await studio.startTake(videoId, this.rate, from);
    this.liveFill = 0;
    this.takeGlitches = 0;
    this.take = new TakeWriter(videoId, take, this.rate);
    return this.take;
  }

  stopTake(): TakeWriter | null {
    const take = this.take;
    this.take = null;
    return take;
  }

  close(): void {
    this.take = null;
    this.nodes.forEach((node) => node.disconnect());
    this.stream.getTracks().forEach((track) => track.stop());
    void this.ctx.close();
  }
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = Math.max(-1, Math.min(1, samples[i]!)) * 0x7fff;
  return out;
}

// Streams a take to the server every few seconds, so a crash or a closed tab loses at most the last few seconds.
export class TakeWriter {
  private pending: Float32Array[] = [];
  private pendingLength = 0;
  private sending: Promise<void> = Promise.resolve();
  private timer: number;
  seconds = 0;
  error: string | null = null;

  constructor(
    readonly videoId: string,
    readonly id: string,
    private readonly rate: number,
  ) {
    this.timer = window.setInterval(() => this.flush(), 3000);
  }

  push(chunk: Float32Array): void {
    this.pending.push(chunk);
    this.pendingLength += chunk.length;
    this.seconds += chunk.length / this.rate;
  }

  private flush(): Promise<void> {
    if (this.pendingLength === 0) return this.sending;
    const all = new Float32Array(this.pendingLength);
    let offset = 0;
    for (const chunk of this.pending) {
      all.set(chunk, offset);
      offset += chunk.length;
    }
    this.pending = [];
    this.pendingLength = 0;
    const pcm = toInt16(all).buffer as ArrayBuffer;
    this.sending = this.sending.then(() =>
      studio.sendChunk(this.videoId, this.id, pcm).then(
        () => undefined,
        (error: unknown) => {
          this.error = error instanceof Error ? error.message : String(error);
        },
      ),
    );
    return this.sending;
  }

  async finish(): Promise<void> {
    window.clearInterval(this.timer);
    await this.flush();
    if (this.error) throw new Error(`Part of the take didn't reach the server: ${this.error}`);
  }
}
