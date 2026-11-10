// Studio home: start a video from a typed, dictated or recorded idea, and see every video on a board by stage and what it's waiting on.
import { VIDEO_MODES, type VideoMode, type VideoSummary } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { studio } from "../api";
import { Button, Empty } from "../components/ui";
import { navigate } from "../hooks";

const COLUMNS = ["idea", "research", "plan", "script", "record", "edit + graphics", "rough cut", "package + upload"] as const;

const MODE_HELP: Record<VideoMode, string> = {
  gated: "Agents stop at each gate and ask you",
  autonomous: "Agents make every call and log why",
  chat: "Work on it in a Claude Code chat instead",
};

export function cardState(video: VideoSummary): { label: string; tone: string } {
  if (video.running) return { label: "Agents working", tone: "text-accent" };
  if (video.waitingForCreator) return { label: "Waiting for you", tone: "text-warn" };
  if (!video.currentStage) return { label: "Finished", tone: "text-good" };
  if (video.currentState?.startsWith("not built")) return { label: "Next stage not built yet", tone: "text-dim" };
  if (video.currentState === "needs changes") return { label: "Redoing with your notes", tone: "text-info" };
  return { label: video.currentState ?? "", tone: "text-muted" };
}

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
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
      {canRecord ? (
        <Button type="button" className="!px-3 !py-1.5 text-xs" onClick={() => void toggle()} disabled={transcribe.isPending}>
          {recording ? "■ Stop and transcribe" : "● Say it instead"}
        </Button>
      ) : (
        <label className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-1.5 text-ink hover:bg-surface-hi">
          Upload a voice memo
          <input type="file" accept="audio/*" className="hidden" onChange={(event) => event.target.files?.[0] && transcribe.mutate(event.target.files[0])} />
        </label>
      )}
      {transcribe.isPending ? <span>transcribing on this computer…</span> : null}
      {transcribe.error ? <span className="text-bad">{transcribe.error.message}</span> : null}
      {!canRecord ? <span className="text-dim">or tap the mic on your keyboard to dictate</span> : null}
    </div>
  );
}

function NewVideo() {
  const client = useQueryClient();
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<VideoMode>("gated");
  const create = useMutation({
    mutationFn: () => studio.create(idea.trim(), mode),
    onSuccess: (video) => {
      setIdea("");
      void client.invalidateQueries({ queryKey: ["videos"] });
      navigate({ page: "video", id: video.id });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (idea.trim().length >= 3) create.mutate();
  };
  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-gradient-to-br from-surface to-panel p-5 md:p-7">
      <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">What's the next video?</h1>
      <p className="mt-1 text-sm text-muted">Say it however it's in your head. The team researches it, plans it and writes it, and checks with you at every gate.</p>
      <textarea
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        rows={3}
        placeholder="e.g. how UPI moves money in two seconds, explained like I'm 15"
        className="mt-4 w-full resize-y rounded-2xl border border-line bg-bg px-4 py-3 text-base outline-none placeholder:text-dim focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <VoiceIdea onText={(text) => setIdea((current) => (current ? `${current} ${text}` : text))} />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as VideoMode)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none"
            title={MODE_HELP[mode]}
          >
            {VIDEO_MODES.filter((m) => m !== "chat").map((m) => (
              <option key={m} value={m}>
                {m === "gated" ? "Ask me at each gate" : "Fully autonomous"}
              </option>
            ))}
          </select>
          <Button tone="primary" type="submit" className="!px-5" disabled={create.isPending || idea.trim().length < 3}>
            {create.isPending ? "Starting…" : "Start the team"}
          </Button>
        </div>
      </div>
      {create.error ? <p className="mt-2 text-sm text-bad">{create.error.message}</p> : null}
    </form>
  );
}

function Card({ video }: { video: VideoSummary }) {
  const state = cardState(video);
  return (
    <button
      onClick={() => navigate({ page: "video", id: video.id })}
      className={`flex w-full flex-col gap-2 rounded-2xl border bg-surface p-3 text-left transition hover:border-accent/60 ${video.waitingForCreator ? "border-warn/60" : "border-line"}`}
    >
      <div className="flex items-center justify-between text-[11px] text-dim">
        <span className="font-mono">#{String(video.number).padStart(3, "0")}</span>
        <span className="rounded-full bg-surface-hi px-2 py-0.5">{video.mode}</span>
      </div>
      <div className="line-clamp-3 text-sm font-semibold leading-snug">{video.title}</div>
      <div className={`flex items-center gap-1.5 text-xs ${state.tone}`}>
        {video.running ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
        {state.label}
      </div>
    </button>
  );
}

export function Board() {
  const { data: videos = [], isLoading } = useQuery({ queryKey: ["videos"], queryFn: studio.videos, refetchInterval: 30_000 });
  const finished = videos.filter((video) => !video.currentStage);
  return (
    <main className="flex flex-col gap-6">
      <NewVideo />
      {isLoading ? null : videos.length === 0 ? (
        <Empty>No videos yet. Type an idea above and the team takes it from there.</Empty>
      ) : (
        <div className="scrollbar-thin -mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2">
          {[...COLUMNS, "finished"].map((column) => {
            const items = column === "finished" ? finished : videos.filter((video) => video.currentStage === column);
            return (
              <section key={column} className="flex w-60 shrink-0 snap-start flex-col gap-2">
                <h2 className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {column}
                  <span className="text-dim">{items.length || ""}</span>
                </h2>
                {items.map((video) => (
                  <Card key={video.id} video={video} />
                ))}
                {items.length === 0 ? <div className="rounded-2xl border border-dashed border-line/60 p-3 text-xs text-dim">—</div> : null}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
