// Face cam for the record page: camera choice and preview, and a recorder that streams the take's video (with a reference copy of the mic for syncing) to the server every few seconds.
import { studio } from "../api";

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput" && d.deviceId !== "");
}

// Decision: MP4/H.264 first (Safari and recent Chrome record it natively, and ffmpeg handles it fastest), WebM as the fallback.
const MIME = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

export class Camera {
  private constructor(readonly stream: MediaStream) {}

  static async open(deviceId: string | null): Promise<Camera> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      audio: false,
    });
    return new Camera(stream);
  }

  get deviceId(): string | null {
    return this.stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
  }

  get size(): string {
    const s = this.stream.getVideoTracks()[0]?.getSettings();
    return s?.width && s.height ? `${s.width}×${s.height}${s.frameRate ? ` · ${Math.round(s.frameRate)} fps` : ""}` : "";
  }

  // Records the camera plus the mic's track. The server matches that mic copy against the clean voice take to line the video up exactly.
  start(videoId: string, take: string, micTrack: MediaStreamTrack | null): CamWriter {
    const tracks = [...this.stream.getVideoTracks(), ...(micTrack ? [micTrack] : [])];
    const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const recorder = new MediaRecorder(new MediaStream(tracks), { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 8_000_000 });
    return new CamWriter(videoId, take, recorder);
  }

  close(): void {
    this.stream.getTracks().forEach((track) => track.stop());
  }
}

// Uploads each piece in order as it arrives, so a closed tab loses at most the last few seconds.
export class CamWriter {
  private sending: Promise<void> = Promise.resolve();
  private stopped: Promise<void>;
  error: string | null = null;

  constructor(
    readonly videoId: string,
    readonly take: string,
    private readonly recorder: MediaRecorder,
  ) {
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      const piece = event.data;
      this.sending = this.sending.then(() =>
        studio.sendVideoChunk(videoId, take, piece).then(
          () => undefined,
          (error: unknown) => {
            this.error = error instanceof Error ? error.message : String(error);
          },
        ),
      );
    };
    this.stopped = new Promise((resolve) => recorder.addEventListener("stop", () => resolve(), { once: true }));
    recorder.start(3000);
  }

  async finish(): Promise<void> {
    if (this.recorder.state !== "inactive") this.recorder.stop();
    await this.stopped;
    await this.sending;
    if (this.error) throw new Error(`Part of the face cam didn't reach the server: ${this.error}`);
  }
}
