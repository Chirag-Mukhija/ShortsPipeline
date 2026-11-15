// Voice practice: how fresh the voice profile is, today's practice topic, and recording or uploading a sample for the voice-profile skill.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { studio } from "../api";
import { MicIcon, StopIcon, UploadIcon } from "./icons";
import { Button } from "./ui";

const days = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
const ago = (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);

export function VoiceCard() {
  const client = useQueryClient();
  const { data: voice } = useQuery({ queryKey: ["voice"], queryFn: studio.voice });
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const save = useMutation({
    mutationFn: (input: { blob: Blob; name: string }) => studio.addVoiceSample(input.blob, input.name, voice?.topic ?? ""),
    onSuccess: (result) => {
      setHeard(result.text);
      client.setQueryData(["voice"], result.status);
    },
  });
  // Decision: browsers only allow the microphone on https or localhost; elsewhere the card offers upload instead.
  const canRecord = window.isSecureContext && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices);
  if (!voice) return null;

  const toggle = async () => {
    if (recording) return recorder.current?.stop();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const media = new MediaRecorder(stream);
    media.ondataavailable = (e) => chunks.push(e.data);
    media.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      save.mutate({ blob: new Blob(chunks, { type: media.mimeType }), name: "sample.webm" });
    };
    recorder.current = media;
    media.start(1000);
    setRecording(true);
  };

  const state = !voice.exists
    ? "No voice profile yet, so scripts won't sound like you."
    : voice.newSamples > 0
      ? `${voice.newSamples} new sample${voice.newSamples > 1 ? "s" : ""} waiting. Run /voice-profile in Claude Code to fold ${voice.newSamples > 1 ? "them" : "it"} in.`
      : `Profile updated ${ago(days(voice.updatedAt!))} from ${voice.samples + 1} recording${voice.samples ? "s" : ""}.`;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">Today's topic</span>
          <span className={`flex items-center gap-1.5 text-xs ${voice.due ? "text-accent" : "text-good"}`}>
            <span className="size-1.5 rounded-full bg-current" />
            {voice.due ? "Due" : "Up to date"}
          </span>
        </div>
        <p className="max-w-2xl text-2xl font-medium leading-snug tracking-[-0.02em] text-ink md:text-[28px]">{voice.topic}</p>
        <p className="text-sm text-muted">Talk for 2–3 minutes, unscripted, in English. Ums and tangents are welcome: they're what makes it you.</p>
        <div className="flex flex-wrap items-center gap-2">
          {canRecord ? (
            <Button tone={recording ? "danger" : "primary"} onClick={() => void toggle()} disabled={save.isPending}>
              {recording ? <StopIcon size={14} /> : <MicIcon size={14} />}
              {recording ? "Stop and save" : "Record"}
            </Button>
          ) : null}
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:border-line-hi hover:bg-surface-hi">
            <UploadIcon size={14} /> Upload a recording
            <input type="file" accept="audio/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && save.mutate({ blob: e.target.files[0], name: e.target.files[0].name })} />
          </label>
          {recording ? (
            <span className="ml-1 flex items-center gap-1.5 text-xs text-bad">
              <span className="size-1.5 animate-pulse rounded-full bg-bad" /> Recording
            </span>
          ) : null}
          {save.isPending ? <span className="ml-1 text-xs text-muted">Transcribing on this computer…</span> : null}
        </div>
        {save.error ? <p className="text-sm text-bad">{save.error.message}</p> : null}
      </div>
      <div className="border-t border-line bg-bg/40 px-6 py-4 text-sm text-muted md:px-8">{state}</div>
      {heard ? (
        <details className="border-t border-line px-6 py-4 text-sm md:px-8" open>
          <summary className="text-good">Saved. Here's what Whisper heard; check it got your words right.</summary>
          <p className="mt-3 leading-relaxed text-muted">{heard}</p>
        </details>
      ) : null}
    </section>
  );
}
