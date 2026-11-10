// One video: what needs the creator now (questions, gate approval), the team's documents, the live agent feed, the inbox and the decision log.
import { INBOX_INTENTS, VIDEO_MODES, type InboxIntent, type RunSummary, type StudioQuestion, type VideoDetail, type VideoMode } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { studio } from "../api";
import { Markdown } from "../components/Markdown";
import { Button, Empty, Panel } from "../components/ui";
import { navigate } from "../hooks";
import { cardState } from "./Board";

const DOCS: { file: string; label: string; editable: boolean }[] = [
  { file: "script.md", label: "Script", editable: true },
  { file: "plan.md", label: "Plan", editable: true },
  { file: "package.md", label: "Title & thumbnail", editable: true },
  { file: "brief.md", label: "Research brief", editable: true },
  { file: "factcheck.md", label: "Fact-check", editable: true },
  { file: "research/sources.md", label: "Sources", editable: false },
  { file: "idea.md", label: "Idea", editable: true },
  { file: "status.md", label: "Status", editable: false },
];

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function useVideoAction(id: string) {
  const client = useQueryClient();
  return <T,>(fn: (input: T) => Promise<VideoDetail>) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (video) => {
        client.setQueryData(["video", id], video);
        void client.invalidateQueries({ queryKey: ["videos"] });
      },
    });
}

function Questions({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const answer = action((answers: Record<string, string>) => studio.answer(video.id, answers));
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const questions = video.questions?.questions ?? [];
  const value = (q: StudioQuestion) => [...(picked[q.id] ?? []), other[q.id]?.trim()].filter(Boolean).join(", ");
  const toggle = (q: StudioQuestion, label: string) =>
    setPicked((current) => {
      const now = current[q.id] ?? [];
      const next = q.multiSelect ? (now.includes(label) ? now.filter((l) => l !== label) : [...now, label]) : now[0] === label ? [] : [label];
      return { ...current, [q.id]: next };
    });
  return (
    <Panel title={<span className="text-warn">The team needs you · {video.questions?.stage}</span>}>
      <div className="flex flex-col gap-6">
        {questions.map((q) => (
          <div key={q.id} className="flex flex-col gap-2">
            <div className="font-semibold">{q.question}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((option) => {
                const on = picked[q.id]?.includes(option.label);
                return (
                  <button
                    key={option.label}
                    onClick={() => toggle(q, option.label)}
                    className={`rounded-xl border p-3 text-left transition ${on ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent/50"}`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    {option.description ? <div className="mt-1 text-xs leading-relaxed text-muted">{option.description}</div> : null}
                  </button>
                );
              })}
            </div>
            <input
              value={other[q.id] ?? ""}
              onChange={(event) => setOther((current) => ({ ...current, [q.id]: event.target.value }))}
              placeholder="Or say it in your own words…"
              className="rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        ))}
        <div className="flex items-center justify-end gap-3">
          {answer.error ? <span className="text-sm text-bad">{answer.error.message}</span> : null}
          <Button tone="primary" disabled={answer.isPending || questions.some((q) => !value(q))} onClick={() => answer.mutate(Object.fromEntries(questions.map((q) => [q.id, value(q)])))}>
            Send answers and continue
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Gate({ video, stage }: { video: VideoDetail; stage: string }) {
  const action = useVideoAction(video.id);
  const approve = action((note: string) => studio.approve(video.id, stage, note || undefined));
  const notes = action((text: string) => studio.notes(video.id, stage, text));
  const [text, setText] = useState("");
  return (
    <Panel title={<span className="text-warn">Your call: {stage}</span>}>
      <p className="text-sm text-muted">Read the {stage} below. Approve it to move on, or tell the team what to change and they'll redo it.</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        placeholder="Notes (optional when approving)"
        className="mt-3 w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button disabled={!text.trim() || notes.isPending} onClick={() => notes.mutate(text)}>
          Redo with these notes
        </Button>
        <Button tone="primary" disabled={approve.isPending} onClick={() => approve.mutate(text)}>
          Approve {stage}
        </Button>
      </div>
    </Panel>
  );
}

function Documents({ video }: { video: VideoDetail }) {
  const client = useQueryClient();
  const available = DOCS.filter((doc) => video.files.includes(doc.file));
  const [tab, setTab] = useState(available[0]?.file ?? "status.md");
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    if (!available.some((doc) => doc.file === tab) && available[0]) setTab(available[0].file);
  }, [available, tab]);
  const doc = DOCS.find((d) => d.file === tab);
  const { data: text = "", isLoading } = useQuery({
    queryKey: ["video-file", video.id, tab, video.updatedAt],
    queryFn: () => studio.file(video.id, tab),
    enabled: video.files.includes(tab),
  });
  const save = useMutation({
    mutationFn: (content: string) => studio.saveFile(video.id, tab, content),
    onSuccess: (next) => {
      setEditing(null);
      client.setQueryData(["video", video.id], next);
    },
  });
  if (available.length === 0) return <Empty>The team's documents appear here as each stage finishes.</Empty>;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1 text-sm">
        {available.map((d) => (
          <button
            key={d.file}
            onClick={() => {
              setTab(d.file);
              setEditing(null);
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 transition ${tab === d.file ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        {doc?.editable ? (
          <div className="mb-3 flex justify-end gap-2">
            {editing === null ? (
              <Button className="!px-3 !py-1 text-xs" onClick={() => setEditing(text)}>
                Edit
              </Button>
            ) : (
              <>
                <Button className="!px-3 !py-1 text-xs" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button tone="primary" className="!px-3 !py-1 text-xs" disabled={save.isPending} onClick={() => save.mutate(editing)}>
                  Save
                </Button>
              </>
            )}
          </div>
        ) : null}
        {editing !== null ? (
          <textarea
            value={editing}
            onChange={(event) => setEditing(event.target.value)}
            className="min-h-[60vh] w-full rounded-xl border border-line bg-bg p-3 font-mono text-sm leading-relaxed outline-none focus:border-accent"
          />
        ) : isLoading ? (
          <Empty>Loading…</Empty>
        ) : (
          <Markdown text={text} />
        )}
        {save.error ? <p className="mt-2 text-sm text-bad">{save.error.message}</p> : null}
      </div>
    </div>
  );
}

function Feed({ runs }: { runs: RunSummary[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const run = runs.find((r) => r.id === selected) ?? runs[0];
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void end.current?.scrollIntoView({ block: "nearest" });
  }, [run?.feed.length]);
  if (!run) return <Empty>No runs yet. Press "Run next stage" to start the team.</Empty>;
  const color = { start: "text-info", text: "text-ink", tool: "text-muted", agent: "text-accent", result: "text-good", error: "text-bad", pause: "text-info" } as const;
  return (
    <div className="flex flex-col gap-2">
      {runs.length > 1 ? (
        <select value={run.id} onChange={(event) => setSelected(event.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink outline-none">
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.startedAt ? clock(r.startedAt) : "queued"} · {r.kind === "next" ? "stage" : "message"} · {r.state}
            </option>
          ))}
        </select>
      ) : null}
      <div className="scrollbar-thin flex max-h-[420px] flex-col gap-1.5 overflow-y-auto font-mono text-[12px] leading-relaxed">
        {run.feed.map((line, i) => (
          <div key={i} className={`flex gap-2 ${color[line.kind]}`}>
            <span className="shrink-0 text-dim">{clock(line.at)}</span>
            <span className="whitespace-pre-wrap break-words">{line.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="text-[11px] text-dim">
        {run.state}
        {run.costUsd != null ? ` · ~$${run.costUsd.toFixed(2)} if billed at API prices (an estimate; your Pro plan covers it)` : ""}
      </div>
    </div>
  );
}

function AskShowrunner({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const send = action((text: string) => studio.message(video.id, text));
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        placeholder="Ask the showrunner anything about this video…"
        className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-dim">The reply shows in the feed above.</span>
        <Button
          className="!px-3 !py-1 text-xs"
          disabled={text.trim().length < 2 || send.isPending}
          onClick={() => send.mutate(text, { onSuccess: () => setText("") })}
        >
          Send
        </Button>
      </div>
      {send.error ? <p className="text-xs text-bad">{send.error.message}</p> : null}
    </div>
  );
}

function Inbox({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const add = action((input: { file: File; note: string; intent: InboxIntent }) => studio.addToInbox(video.id, input.file, input.note, input.intent));
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState<InboxIntent>("use as visual");
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  // Decision: paste and drop both land here, because on the iPad a screenshot is fastest pasted and a sketch dragged from Files.
  const take = (files: FileList | null | undefined) => files?.[0] && setFile(files[0]);
  return (
    <div
      className="flex flex-col gap-3"
      onPaste={(event: ClipboardEvent) => take(event.clipboardData.files)}
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        take(event.dataTransfer.files);
      }}
    >
      <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line bg-surface p-4 text-center text-xs text-muted hover:border-accent/60">
        {preview ? <img src={preview} alt="" className="max-h-40 rounded-lg" /> : null}
        <span className="text-sm text-ink">{file ? file.name : "Add a sketch, screenshot, photo or clip"}</span>
        <span>tap to pick, paste, or drop it here</span>
        <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(event) => take(event.target.files)} />
      </label>
      {file ? (
        <>
          <select value={intent} onChange={(event) => setIntent(event.target.value as InboxIntent)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none">
            {INBOX_INTENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What is it for? e.g. this is how the pipeline diagram should look"
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button
            tone="primary"
            disabled={add.isPending}
            onClick={() =>
              add.mutate(
                { file, note, intent },
                {
                  onSuccess: () => {
                    setFile(null);
                    setNote("");
                  },
                },
              )
            }
          >
            {add.isPending ? "Uploading…" : "Send to the team"}
          </Button>
          {add.error ? <p className="text-xs text-bad">{add.error.message}</p> : null}
        </>
      ) : null}
      {video.inbox.length ? (
        <div className="grid grid-cols-3 gap-2">
          {video.inbox.map((item) => (
            <a key={item.file} href={item.url} target="_blank" rel="noreferrer" title={`${item.intent}: ${item.note}`} className="group flex flex-col gap-1">
              {item.kind === "image" ? (
                <img src={item.url} alt={item.note} className="aspect-square w-full rounded-lg border border-line object-cover group-hover:border-accent/60" />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-surface text-xs text-muted">{item.kind}</div>
              )}
              <span className="truncate text-[10px] text-dim">{item.intent}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VideoPage({ id }: { id: string }) {
  const client = useQueryClient();
  const { data: video, error } = useQuery({ queryKey: ["video", id], queryFn: () => studio.video(id), refetchInterval: 20_000 });
  const action = useVideoAction(id);
  const run = action(() => studio.run(id));
  const stop = action(() => studio.stop(id));
  const mode = useMutation({
    mutationFn: (next: VideoMode) => studio.setMode(id, next),
    onSuccess: (next) => client.setQueryData(["video", id], next),
  });
  if (error) return <Empty>{error.message}</Empty>;
  if (!video) return <Empty>Loading…</Empty>;
  const current = video.stages.find((stage) => stage.name === video.currentStage);
    const atGate = !video.running && !video.questions && current?.gate && /waiting|review|ready/.test(current.state);
  const state = cardState(video);

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <button className="self-start text-xs text-muted hover:text-ink" onClick={() => navigate({ page: "board" })}>
            ← All videos
          </button>
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">{video.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono text-dim">#{String(video.number).padStart(3, "0")}</span>
            <span className={state.tone}>
              {video.currentStage ? `${video.currentStage} · ` : ""}
              {state.label}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={video.mode}
            onChange={(event) => mode.mutate(event.target.value as VideoMode)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none"
          >
            {VIDEO_MODES.map((m) => (
              <option key={m} value={m}>
                {m === "gated" ? "Ask me at gates" : m === "autonomous" ? "Fully autonomous" : "Chat (Claude Code)"}
              </option>
            ))}
          </select>
          {video.running ? (
            <Button tone="danger" onClick={() => stop.mutate(undefined)} disabled={stop.isPending}>
              Stop
            </Button>
          ) : (
            <Button tone="primary" onClick={() => run.mutate(undefined)} disabled={run.isPending || Boolean(video.questions) || !video.currentStage}>
              Run next stage
            </Button>
          )}
        </div>
      </div>
      {run.error ? <p className="text-sm text-bad">{run.error.message}</p> : null}

      {video.questions ? <Questions video={video} /> : null}
      {atGate && current ? <Gate video={video} stage={current.name} /> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Documents video={video} />
        <div className="flex flex-col gap-5">
          <Panel title="Live feed">
            <Feed runs={video.runs} />
          </Panel>
          <Panel title="Talk to the showrunner">
            <AskShowrunner video={video} />
          </Panel>
          <Panel title="Inbox: your sketches and references">
            <Inbox video={video} />
          </Panel>
          <Panel title="Stages">
            <ol className="flex flex-col gap-1.5 text-sm">
              {video.stages.map((stage) => (
                <li key={stage.name} className="flex items-center justify-between gap-3">
                  <span className={stage.name === video.currentStage ? "font-semibold text-ink" : "text-muted"}>
                    {stage.name}
                    {stage.gate ? <span className="ml-1 text-[10px] text-warn">gate</span> : null}
                  </span>
                  <span className={`text-xs ${stage.state.startsWith("done") ? "text-good" : stage.state.startsWith("not built") ? "text-dim" : "text-muted"}`}>{stage.state}</span>
                </li>
              ))}
            </ol>
          </Panel>
          {video.decisions.length ? (
            <Panel title="Decisions">
              <ul className="flex flex-col gap-2 text-xs leading-relaxed text-muted">
                {[...video.decisions].reverse().map((decision) => (
                  <li key={decision} className={decision.includes("SHOWRUNNER") ? "text-info" : ""}>
                    {decision}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </main>
  );
}
