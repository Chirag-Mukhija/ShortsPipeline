// Studio home: start a video from a typed or spoken idea, see what needs you now, and every video as a row with its progress through the stages.
import { VIDEO_MODES, type VideoAudio, type VideoMode, type VideoSummary } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { studio } from "../api";
import { ArrowRightIcon, MicIcon, StopIcon } from "../components/icons";
import { Button, PageHeader, Segmented } from "../components/ui";
import { hrefOf, navigate } from "../hooks";

export const STAGES = [
  { name: "idea", short: "Idea" },
  { name: "research", short: "Research" },
  { name: "plan", short: "Plan" },
  { name: "script", short: "Script" },
  { name: "record", short: "Record" },
  { name: "edit + graphics", short: "Edit" },
  { name: "rough cut", short: "Rough cut" },
  { name: "package + upload", short: "Package" },
] as const;

// A music-only video has no record stage, so its progress track leaves it out.
export const stagesFor = (audio: VideoAudio) => STAGES.filter((stage) => audio === "voice" || stage.name !== "record");

export const AUDIO_CHOICES: { id: VideoAudio; label: string; title: string }[] = [
  { id: "voice", label: "Voice-over", title: "You record a voice-over; the team writes it in your voice" },
  { id: "music", label: "Music only", title: "No voice: the team designs the visuals and on-screen text to carry it, set to music" },
];

const MODE_HELP: Record<VideoMode, string> = {
  gated: "The team stops at each gate and asks you",
  autonomous: "The team makes every call and logs why",
  chat: "Work on it in a Claude Code chat instead",
};

export function cardState(video: VideoSummary): { label: string; tone: string } {
  if (video.running) return { label: "Agents working", tone: "text-accent" };
  if (video.waitingForCreator) return { label: "Your turn", tone: "text-accent" };
  if (!video.currentStage) return { label: "Finished", tone: "text-good" };
  if (video.currentState?.startsWith("not built")) return { label: "Next stage not built yet", tone: "text-dim" };
  if (video.currentState === "needs changes") return { label: "Redoing with your notes", tone: "text-info" };
  return { label: video.currentState ?? "", tone: "text-muted" };
}

export function nextStep(video: VideoSummary): string {
  if (video.currentStage === "record") return "Record the voice-over";
  // The summary can't tell open questions from a gate, so this names the stage, not the exact ask.
  return video.currentStage ? `Your call on the ${video.currentStage}` : "The team needs you";
}

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const number = (video: VideoSummary) => `#${String(video.number).padStart(3, "0")}`;

function VoiceIdea({ onText }: { onText: (text: string) => void }) {
  const recorder = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const transcribe = useMutation({ mutationFn: (file: Blob) => studio.transcribe(file, file instanceof File ? file.name : "note.webm"), onSuccess: (r) => onText(r.text) });
  // Decision: browsers only allow the microphone on https or localhost, so other devices on the LAN upload a voice memo instead.
  const canRecord = window.isSecureContext && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices);

  const toggle = async () => {
    if (recording) return recorder.current?.stop();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const media = new MediaRecorder(stream);
    media.ondataavailable = (event) => chunks.push(event.data);
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      transcribe.mutate(new Blob(chunks, { type: media.mimeType }));
    };
    recorder.current = media;
    media.start();
    setRecording(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-dim">
      {canRecord ? (
        <Button type="button" tone={recording ? "danger" : "quiet"} size="sm" onClick={() => void toggle()} disabled={transcribe.isPending}>
          {recording ? <StopIcon size={14} /> : <MicIcon size={14} />}
          {recording ? "Stop and transcribe" : "Say it instead"}
        </Button>
      ) : (
        <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-muted hover:bg-surface hover:text-ink">
          <MicIcon size={14} /> Upload a voice memo
          <input type="file" accept="audio/*" className="hidden" onChange={(event) => event.target.files?.[0] && transcribe.mutate(event.target.files[0])} />
        </label>
      )}
      {recording ? <span className="flex items-center gap-1.5 text-bad"><span className="size-1.5 animate-pulse rounded-full bg-bad" /> Listening</span> : null}
      {transcribe.isPending ? <span>Transcribing on this computer…</span> : null}
      {transcribe.error ? <span className="text-bad">{transcribe.error.message}</span> : null}
    </div>
  );
}

function NewVideo() {
  const client = useQueryClient();
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<VideoMode>("gated");
  const [audio, setAudio] = useState<VideoAudio>("voice");
  const create = useMutation({
    mutationFn: () => studio.create(idea.trim(), mode, audio),
    onSuccess: (video) => {
      setIdea("");
      void client.invalidateQueries({ queryKey: ["videos"] });
      navigate({ page: "video", id: video.id });
    },
  });
  const ready = idea.trim().length >= 3;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (ready) create.mutate();
  };
  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-panel transition-colors focus-within:border-line-hi">
      <textarea
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && ready) create.mutate();
        }}
        rows={3}
        placeholder="What's the next video? Say it however it's in your head, with your own story in it."
        className="block w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed text-ink outline-none placeholder:text-dim"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <VoiceIdea onText={(text) => setIdea((current) => (current ? `${current} ${text}` : text))} />
          <Segmented label="Voice-over or music only" items={AUDIO_CHOICES} value={audio} onChange={setAudio} />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select value={mode} onChange={(event) => setMode(event.target.value as VideoMode)} className="field !h-9 min-w-0 flex-1 !py-0 text-sm sm:!w-auto sm:flex-none" title={MODE_HELP[mode]}>
            {VIDEO_MODES.filter((m) => m !== "chat").map((m) => (
              <option key={m} value={m}>
                {m === "gated" ? "Ask me at each gate" : "Fully autonomous"}
              </option>
            ))}
          </select>
          <Button tone="primary" type="submit" disabled={create.isPending || !ready}>
            {create.isPending ? "Starting…" : "Start the team"}
            <ArrowRightIcon size={14} />
          </Button>
        </div>
      </div>
      {audio === "music" ? (
        <p className="px-5 pb-3 text-xs leading-relaxed text-muted">
          No voice-over. The visuals and on-screen text carry the whole video, set to music, so the team designs every shot for it. There's nothing to record; the script becomes a cue sheet.
        </p>
      ) : null}
      {create.error ? <p className="px-5 pb-3 text-sm text-bad">{create.error.message}</p> : null}
    </form>
  );
}

export function StageTrack({ current, finished, audio, className = "" }: { current: string | null; finished: boolean; audio: VideoAudio; className?: string }) {
  const stages = stagesFor(audio);
  const at = finished ? stages.length : stages.findIndex((s) => s.name === current);
  return (
    <div className={`flex gap-1 ${className}`} aria-label={finished ? "Finished" : `At stage: ${current}`}>
      {stages.map((stage, i) => (
        <span key={stage.name} title={stage.short} className={`h-1 flex-1 rounded-full ${i < at ? "bg-muted" : i === at ? "bg-accent" : "bg-surface-hi"}`} />
      ))}
    </div>
  );
}

function Row({ video }: { video: VideoSummary }) {
  const state = cardState(video);
  const stage = STAGES.find((s) => s.name === video.currentStage);
  return (
    <a href={hrefOf({ page: "video", id: video.id })} className="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface md:grid-cols-[52px_minmax(0,1fr)_200px_96px_16px]">
      <span className="font-mono text-xs text-dim">{number(video)}</span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{video.title}</span>
          {video.audio === "music" ? <span className="eyebrow shrink-0 rounded border border-line px-1.5 !text-[10px]">Music only</span> : null}
        </span>
        <span className={`mt-0.5 flex items-center gap-1.5 text-xs ${state.tone}`}>
          {video.running ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
          {state.label}
        </span>
      </span>
      <span className="hidden flex-col gap-1.5 md:flex">
        <span className="eyebrow">{video.currentStage ? stage?.short ?? video.currentStage : "Finished"}</span>
        <StageTrack current={video.currentStage} finished={!video.currentStage} audio={video.audio} />
      </span>
      <span className="text-right text-xs text-dim">{ago(video.updatedAt)}</span>
      <ArrowRightIcon size={14} className="hidden text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block" />
    </a>
  );
}

function NeedsYou({ videos }: { videos: VideoSummary[] }) {
  const { data: voice } = useQuery({ queryKey: ["voice"], queryFn: studio.voice });
  const waiting = videos.filter((v) => v.waitingForCreator && !v.running);
  const count = waiting.length + (voice?.due ? 1 : 0);
  if (count === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow">Needs you · {count}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {waiting.map((video) => (
          <a key={video.id} href={hrefOf({ page: "video", id: video.id })} className="group flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-hi">
            <div className="flex items-center justify-between">
              <span className="eyebrow">
                {number(video)} · {STAGES.find((s) => s.name === video.currentStage)?.short ?? video.currentStage}
              </span>
              <span className="size-1.5 rounded-full bg-accent" />
            </div>
            <div className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">{video.title}</div>
            <div className="mt-auto flex items-center justify-between text-sm">
              <span className="text-muted">{nextStep(video)}</span>
              <ArrowRightIcon size={14} className="text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
          </a>
        ))}
        {voice?.due ? (
          <a href={hrefOf({ page: "voice" })} className="group flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-hi">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Voice practice</span>
              <MicIcon size={14} className="text-dim" />
            </div>
            <div className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">{voice.topic}</div>
            <div className="mt-auto flex items-center justify-between text-sm">
              <span className="text-muted">Talk about it for 2–3 minutes</span>
              <ArrowRightIcon size={14} className="text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </div>
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function Board() {
  const { data: videos = [], isLoading } = useQuery({ queryKey: ["videos"], queryFn: studio.videos, refetchInterval: 30_000 });
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <PageHeader eyebrow="Studio" title="Videos" />
        <NewVideo />
      </div>
      <NeedsYou videos={videos} />
      <section className="flex flex-col gap-3">
        <h2 className="eyebrow">All videos{videos.length ? ` · ${videos.length}` : ""}</h2>
        {isLoading ? null : videos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
            <div className="text-sm text-ink">Start your first video</div>
            <p className="mt-1 text-sm text-dim">Type an idea above. The team researches it, plans it and writes it, and checks with you at every gate.</p>
          </div>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {videos.map((video) => (
              <Row key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
