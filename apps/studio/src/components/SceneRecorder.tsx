// Per-scene voice control: record with the mic or upload a file, see whether your voice or the AI voice will be
// used, and re-record or revert. Works at any pipeline stage — the next Voiceover run picks up whatever's here.
import type { RecordingView } from "@clipforge/schema";
import { useRef, useState } from "react";
import { api } from "../api";
import { Button, Chip } from "./ui";

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SceneRecorder({
  projectId,
  sceneId,
  recording,
  onChanged,
}: {
  projectId: string;
  sceneId: string;
  recording?: RecordingView;
  onChanged: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const upload = async (blob: Blob, fileName?: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.uploadRecording(projectId, sceneId, blob, fileName);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        stopTimer();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setIsRecording(false);
        void upload(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setElapsedMs(0);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 200);
    } catch {
      setError("Couldn't access the microphone. Check your browser's permission for this site.");
    }
  };

  const stopRecording = () => recorderRef.current?.stop();

  const onFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file, file.name);
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.deleteRecording(projectId, sceneId);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {recording ? (
        <Chip tone="good">Your voice · {formatSeconds(recording.durationMs)}</Chip>
      ) : (
        <Chip>AI voice</Chip>
      )}
      {isRecording ? (
        <Button tone="danger" className="!px-2 !py-1 text-xs" onClick={stopRecording}>
          Stop · {formatSeconds(elapsedMs)}
        </Button>
      ) : (
        <Button className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => void startRecording()}>
          {recording ? "Re-record" : "Record"}
        </Button>
      )}
      <Button className="!px-2 !py-1 text-xs" disabled={busy || isRecording} onClick={() => fileInputRef.current?.click()}>
        Upload file
      </Button>
      <input ref={fileInputRef} type="file" accept="audio/*,video/webm" className="hidden" onChange={onFilePicked} />
      {recording ? (
        <Button className="!px-2 !py-1 text-xs" disabled={busy || isRecording} onClick={() => void remove()}>
          Use AI voice instead
        </Button>
      ) : null}
      {error ? <span className="text-xs text-bad">{error}</span> : null}
    </div>
  );
}
