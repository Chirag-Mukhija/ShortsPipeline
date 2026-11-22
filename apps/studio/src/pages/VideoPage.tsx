// One video: where it is in the chain, the one thing that needs the creator now, the team's documents, and a side panel for activity, questions to the showrunner, the inbox and decisions.
import { INBOX_INTENTS, VIDEO_MODES, type InboxIntent, type RunSummary, type StudioQuestion, type VideoAudio, type VideoDetail, type VideoMode } from "@clipforge/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";
import { studio } from "../api";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MicIcon, PlayIcon, StopIcon, UploadIcon } from "../components/icons";
import { Markdown } from "../components/Markdown";
import { Button, Empty, Segmented, Tabs } from "../components/ui";
import { hrefOf, navigate } from "../hooks";
import { AUDIO_CHOICES, STAGES, cardState } from "./Board";

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
const short = (stage: string) => STAGES.find((s) => s.name === stage)?.short ?? stage;
// On a music-only video the script is a cue sheet: visual, text and music cues, no spoken lines.
const named = (video: VideoDetail, stage: string) => (video.audio === "music" && stage === "script" ? "cue sheet" : stage);
const docLabel = (video: VideoDetail, file: string, label: string) => (video.audio === "music" && file === "script.md" ? "Cue sheet" : label);

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

// Where clicking a stage takes you: its document below, or the page where that stage's work happens.
const STAGE_DOC: Record<string, string> = { idea: "idea.md", research: "brief.md", plan: "plan.md", script: "script.md", "package + upload": "package.md" };
type Opener = (stage: string) => void;

function stageTarget(video: VideoDetail, stage: string): "doc" | "record" | "edit" | null {
  const doc = STAGE_DOC[stage];
  if (doc) return video.files.includes(doc) ? "doc" : null;
  if (stage === "record") return video.audio === "music" || !video.files.includes("script.md") ? null : "record";
  if (stage === "edit + graphics" || stage === "rough cut") {
    const reached = video.stages.some((s) => s.name === "record" && /^(done|skipped)\b/.test(s.state));
    return reached ? "edit" : null;
  }
  return null;
}

function Stepper({ video, onOpen }: { video: VideoDetail; onOpen: Opener }) {
  const list = useRef<HTMLOListElement>(null);
  // On a narrow screen the stepper scrolls sideways; keep the current stage in view.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="step"]');
    if (list.current && el) list.current.scrollLeft = Math.max(0, el.offsetLeft - 24);
  }, [video.currentStage]);
  return (
    <ol ref={list} className="scrollbar-thin relative flex overflow-x-auto border-y border-line">
      {video.stages.map((stage, i) => {
        const current = stage.name === video.currentStage;
        const done = /^done\b/.test(stage.state);
        const skipped = stage.state.startsWith("skipped");
        const soon = stage.state.startsWith("not built");
        const note = skipped
          ? "Skipped · music only"
          : done
          ? "Done"
          : current && video.running
            ? "Running"
            : current && (video.waitingForCreator || stage.name === "record")
              ? "Your turn"
              : current && stage.state === "needs changes"
                ? "Redoing"
                : soon
                  ? "Not built yet"
                  : current
                    ? "Next"
                    : "";
        const target = stageTarget(video, stage.name);
        return (
          <li
            key={stage.name}
            aria-current={current ? "step" : undefined}
            onClick={target ? () => onOpen(stage.name) : undefined}
            title={target === "doc" ? "Open its document" : target === "record" ? "Open the recorder" : target === "edit" ? "Open the editor" : undefined}
            className={`relative min-w-[132px] flex-1 px-3 py-3 ${i > 0 ? "border-l border-line" : ""} ${target ? "cursor-pointer transition-colors hover:bg-surface-hi" : ""}`}
          >
            {current ? <span className="absolute inset-x-0 -bottom-px h-px bg-accent" /> : null}
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[11px] ${current ? "text-accent" : "text-dim"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={`truncate text-sm ${current ? "font-medium text-ink" : skipped ? "text-dim line-through" : done ? "text-muted" : soon ? "text-dim" : "text-muted"}`}>
                {stage.name === "script" && video.audio === "music" ? "Cue sheet" : short(stage.name)}
              </span>
              {done ? <CheckIcon size={13} className="ml-auto shrink-0 text-good" /> : null}
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[11px] ${current ? "text-accent" : "text-dim"}`}>
              {current && video.running ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
              {note}
              {stage.gate && !done ? <span className="text-dim">{note ? "· gate" : "Gate"}</span> : null}
              {!note && !(stage.gate && !done) ? " " : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TurnCard({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="rise rounded-xl border border-accent/30 bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="text-sm text-ink">{title}</span>
        </div>
        {action}
      </div>
      {children ? <div className="border-t border-line px-5 py-5">{children}</div> : null}
    </section>
  );
}

function StatusBar({ text, action, live = false }: { text: ReactNode; action?: ReactNode; live?: boolean }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3 text-sm text-muted">
        <span className={`size-1.5 shrink-0 rounded-full ${live ? "animate-pulse bg-accent" : "bg-dim"}`} />
        <span className="min-w-0 truncate">{text}</span>
      </div>
      {action}
    </section>
  );
}

function Questions({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const answer = action((answers: Record<string, string>) => studio.answer(video.id, answers));
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const questions = video.questions?.questions ?? [];
  const value = (q: StudioQuestion) => [...(picked[q.id] ?? []), other[q.id]?.trim()].filter(Boolean).join(", ");
  const answered = questions.filter((q) => value(q)).length;
  const toggle = (q: StudioQuestion, label: string) =>
    setPicked((current) => {
      const now = current[q.id] ?? [];
      const next = q.multiSelect ? (now.includes(label) ? now.filter((l) => l !== label) : [...now, label]) : now[0] === label ? [] : [label];
      return { ...current, [q.id]: next };
    });
  return (
    <TurnCard title={<>The team needs a few answers <span className="text-dim">· {video.questions?.stage}</span></>}>
      <div className="flex flex-col gap-8">
        {questions.map((q, n) => (
          <div key={q.id} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <span className="font-mono text-xs leading-6 text-dim">{String(n + 1).padStart(2, "0")}</span>
              <div className="text-[15px] leading-relaxed text-ink">{q.question}</div>
            </div>
            <div className="grid gap-2 pl-7 sm:grid-cols-2">
              {q.options.map((option) => {
                const on = picked[q.id]?.includes(option.label);
                return (
                  <button
                    key={option.label}
                    onClick={() => toggle(q, option.label)}
                    aria-pressed={Boolean(on)}
                    className={`rounded-lg border p-3 text-left transition-colors ${on ? "border-accent/70 bg-accent/[0.07]" : "border-line bg-bg hover:border-line-hi"}`}
                  >
                    <div className="flex items-start justify-between gap-2 text-sm font-medium text-ink">
                      {option.label}
                      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-ink" : "border-line-hi"}`}>{on ? <CheckIcon size={10} strokeWidth={2.5} /> : null}</span>
                    </div>
                    {option.description ? <div className="mt-1.5 text-xs leading-relaxed text-muted">{option.description}</div> : null}
                  </button>
                );
              })}
            </div>
            <div className="pl-7">
              <input value={other[q.id] ?? ""} onChange={(event) => setOther((current) => ({ ...current, [q.id]: event.target.value }))} placeholder="Or say it in your own words" className="field" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
          {answer.error ? <span className="text-sm text-bad">{answer.error.message}</span> : null}
          <span className="font-mono text-xs text-dim">
            {answered}/{questions.length} answered
          </span>
          <Button tone="primary" disabled={answer.isPending || answered < questions.length} onClick={() => answer.mutate(Object.fromEntries(questions.map((q) => [q.id, value(q)])))}>
            {answer.isPending ? "Sending…" : "Send answers and continue"}
          </Button>
        </div>
      </div>
    </TurnCard>
  );
}

function Gate({ video, stage }: { video: VideoDetail; stage: string }) {
  const action = useVideoAction(video.id);
  const approve = action((note: string) => studio.approve(video.id, stage, note || undefined));
  const notes = action((text: string) => studio.notes(video.id, stage, text));
  const [text, setText] = useState("");
  return (
    <TurnCard title={<>Your call: review the {named(video, stage)}</>}>
      <p className="text-sm leading-relaxed text-muted">
        Read the {named(video, stage)} below. Small fixes: edit the document directly. Bigger changes: write notes and the team redoes it. Approve to move on.
      </p>
      <textarea value={text} onChange={(event) => setText(event.target.value)} rows={2} placeholder="Notes for the team (optional when approving)" className="field mt-4 resize-y" />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {notes.error || approve.error ? <span className="mr-auto self-center text-sm text-bad">{(notes.error ?? approve.error)?.message}</span> : null}
        <Button disabled={!text.trim() || notes.isPending} onClick={() => notes.mutate(text)}>
          Redo with these notes
        </Button>
        <Button tone="primary" disabled={approve.isPending} onClick={() => approve.mutate(text)}>
          <CheckIcon size={14} /> Approve {named(video, stage)}
        </Button>
      </div>
    </TurnCard>
  );
}

function Now({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const run = action(() => studio.run(video.id));
  const stop = action(() => studio.stop(video.id));
  const current = video.stages.find((stage) => stage.name === video.currentStage);
  const atGate = !video.running && !video.questions && current?.gate && /waiting|review|ready/.test(current.state);
  const recorded = video.stages.some((stage) => stage.name === "record" && /^done\b/.test(stage.state));
  const lastLine = video.runs[0]?.feed.at(-1)?.text;
  const error = run.error ?? stop.error;

  let body: ReactNode;
  if (video.running) {
    body = (
      <StatusBar
        live
        text={
          <>
            <span className="text-ink">The team is working on the {named(video, video.currentStage ?? "")}</span>
            {lastLine ? <span className="text-dim"> · {lastLine}</span> : null}
          </>
        }
        action={
          <div className="flex gap-2">
            {/* Watching or recording while the team works is safe: the team only writes files, it never locks the pages. */}
            {video.currentStage === "edit + graphics" || video.currentStage === "rough cut" ? (
              <Button size="sm" onClick={() => navigate({ page: "edit", id: video.id })}>
                Open editor
              </Button>
            ) : null}
            <Button tone="danger" size="sm" onClick={() => stop.mutate(undefined)} disabled={stop.isPending}>
              <StopIcon size={12} /> Stop
            </Button>
          </div>
        }
      />
    );
  } else if (video.questions) body = <Questions video={video} />;
  // The rough cut is a video, not a document: its review (player, notes, approve) lives on the Edit page, so the generic document gate would point at nothing.
  else if (atGate && current?.name === "rough cut") {
    body = (
      <TurnCard
        title={
          <>
            Your call: watch the rough cut <span className="hidden text-dim md:inline">· pin notes on moments, then approve it in the editor</span>
          </>
        }
        action={
          <Button tone="primary" onClick={() => navigate({ page: "edit", id: video.id })}>
            <PlayIcon size={14} /> Watch the rough cut
          </Button>
        }
      />
    );
  } else if (atGate && current) body = <Gate video={video} stage={current.name} />;
  else if (video.currentStage === "record") {
    body = (
      <TurnCard
        title={
          <>
            Your turn: record the voice-over <span className="hidden text-dim md:inline">· the teleprompter follows your voice, then you cut by editing text</span>
          </>
        }
        action={
          <Button tone="primary" onClick={() => navigate({ page: "record", id: video.id })}>
            <MicIcon size={14} /> Open recorder
          </Button>
        }
      />
    );
  } else if (video.currentStage === "edit + graphics" || video.currentStage === "rough cut") {
    body = (
      <TurnCard
        title={
          <>
            Edit: graphics, mix and the rough cut <span className="hidden text-dim md:inline">· watch it, fix beats, set the music, then approve</span>
          </>
        }
        action={
          <div className="flex gap-2">
            <Button
              onClick={() => run.mutate(undefined)}
              disabled={run.isPending}
              title="Before the storyboard is approved: the team plans the shots for the beats not built yet and renders the storyboard. After you approve it: they build those beats one by one and assemble a new cut."
            >
              <PlayIcon size={14} /> Run the team
            </Button>
            <Button tone="primary" onClick={() => navigate({ page: "edit", id: video.id })}>
              Open editor
            </Button>
          </div>
        }
      />
    );
  } else if (!video.currentStage || current?.state.startsWith("not built")) {
    body = (
      <StatusBar
        text={
          recorded
            ? "Voice-over recorded. The next stage isn't built yet."
            : video.audio === "music"
              ? "Cue sheet approved. Nothing to record: shoot the footage the plan lists."
              : "Everything built so far is done."
        }
        action={
          recorded ? (
            <Button size="sm" onClick={() => navigate({ page: "record", id: video.id })}>
              Open recorder
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <StatusBar
        text={<>Ready for the next stage: <span className="text-ink">{named(video, video.currentStage ?? "")}</span></>}
        action={
          <Button tone="primary" size="sm" onClick={() => run.mutate(undefined)} disabled={run.isPending}>
            <PlayIcon size={12} /> Run next stage
          </Button>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {body}
      {error ? <p className="px-1 text-sm text-bad">{error.message}</p> : null}
    </div>
  );
}

function Documents({ video, request }: { video: VideoDetail; request: { file: string; n: number } | null }) {
  const client = useQueryClient();
  const available = DOCS.filter((doc) => video.files.includes(doc.file));
  const [tab, setTab] = useState(available[0]?.file ?? "status.md");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!request) return;
    setTab(request.file);
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [request]);
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
    <section ref={box} className="flex min-w-0 scroll-mt-6 flex-col">
      <Tabs
        items={available.map((d) => ({ id: d.file, label: docLabel(video, d.file, d.label) }))}
        value={tab}
        onChange={(file) => {
          setTab(file);
          setEditing(null);
        }}
      />
      <div className="mt-5 rounded-xl border border-line bg-panel">
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-5 py-2">
          <span className="font-mono text-xs text-dim">{tab}</span>
          {doc?.editable ? (
            editing === null ? (
              <Button size="sm" tone="quiet" onClick={() => setEditing(text)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" tone="quiet" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button size="sm" tone="primary" disabled={save.isPending} onClick={() => save.mutate(editing)}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            )
          ) : (
            <span className="text-xs text-dim">Read only</span>
          )}
        </div>
        <div className="px-5 py-6 md:px-8 md:py-8">
          {editing !== null ? (
            <textarea value={editing} onChange={(event) => setEditing(event.target.value)} className="field min-h-[65vh] resize-y font-mono !text-[13px] !leading-relaxed" />
          ) : isLoading ? (
            <p className="text-sm text-dim">Loading…</p>
          ) : (
            <Markdown text={text} />
          )}
          {save.error ? <p className="mt-2 text-sm text-bad">{save.error.message}</p> : null}
        </div>
      </div>
    </section>
  );
}

const FEED_COLOR = { start: "text-info", text: "text-ink", tool: "text-dim", agent: "text-accent", result: "text-good", error: "text-bad", pause: "text-info" } as const;

function Feed({ runs }: { runs: RunSummary[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const run = runs.find((r) => r.id === selected) ?? runs[0];
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  // Decision: only the feed box scrolls, and only while you're at its bottom; reading older lines or the page never gets yanked.
  useEffect(() => {
    if (box.current && stick.current) box.current.scrollTop = box.current.scrollHeight;
  }, [run?.feed.length, run?.id]);
  if (!run) return <p className="py-8 text-center text-sm text-dim">No runs yet. When the team works, every step shows up here.</p>;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {runs.length > 1 ? (
        <select
          value={run.id}
          onChange={(event) => {
            setSelected(event.target.value);
            stick.current = true;
          }}
          className="field !h-8 !py-0 !text-xs"
        >
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.startedAt ? clock(r.startedAt) : "queued"} · {r.kind === "next" ? "stage" : "message"} · {r.state}
            </option>
          ))}
        </select>
      ) : null}
      <div
        ref={box}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 font-mono text-[12px] leading-relaxed"
      >
        {run.feed.map((line, i) => (
          <div key={i} className={`grid grid-cols-[52px_minmax(0,1fr)] gap-2 ${FEED_COLOR[line.kind]}`}>
            <span className="text-dim">{clock(line.at)}</span>
            <span className="whitespace-pre-wrap break-words">{line.text}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-line pt-2.5 text-[11px] text-dim">
        <span className={run.state === "running" ? "text-accent" : ""}>{run.state}</span>
        {run.costUsd != null ? ` · ~$${run.costUsd.toFixed(2)} at API prices (your Pro plan covers it)` : ""}
      </div>
    </div>
  );
}

function AskShowrunner({ video, onSent }: { video: VideoDetail; onSent: () => void }) {
  const action = useVideoAction(video.id);
  const send = action((text: string) => studio.message(video.id, text));
  const [text, setText] = useState("");
  const submit = () =>
    send.mutate(text, {
      onSuccess: () => {
        setText("");
        onSent();
      },
    });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted">Ask about this video, or ask for a change. The showrunner answers in Activity.</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && text.trim().length >= 2) submit();
        }}
        rows={5}
        placeholder="When can I send my own sketches for the storyboard?"
        className="field resize-y"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-dim">⌘ Enter to send</span>
        <Button size="sm" tone="primary" disabled={text.trim().length < 2 || send.isPending} onClick={submit}>
          {send.isPending ? "Sending…" : "Send"}
        </Button>
      </div>
      {send.error ? <p className="text-xs text-bad">{send.error.message}</p> : null}
    </div>
  );
}

// Decision: the beat fields travel as one labeled note ("Beat 3: Want: … From the sketch: …"), the form sketches.md tells agents to read.
const beatNote = (beat: string, want: string, take: string) =>
  [beat ? `Beat ${beat}:` : "Beat ?:", want.trim() && `Want: ${want.trim()}`, take.trim() && `From the sketch: ${take.trim()}`].filter(Boolean).join(" ");

function Inbox({ video }: { video: VideoDetail }) {
  const action = useVideoAction(video.id);
  const add = action((input: { file: File; note: string; intent: InboxIntent }) => studio.addToInbox(video.id, input.file, input.note, input.intent));
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState<InboxIntent>("for a beat");
  const [beat, setBeat] = useState("");
  const [want, setWant] = useState("");
  const [fromSketch, setFromSketch] = useState("");
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
      <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-line-hi bg-bg px-4 py-5 text-center transition-colors hover:border-muted">
        {preview ? <img src={preview} alt="" className="mb-1 max-h-40 rounded-md" /> : <UploadIcon size={18} className="text-dim" />}
        <span className="text-sm text-ink">{file ? file.name : "Add a sketch, screenshot, photo or clip"}</span>
        <span className="text-xs text-dim">Pick, paste or drop. Rough is fine: the team fills in colours and details.</span>
        <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(event) => take(event.target.files)} />
      </label>
      {file ? (
        <div className="rise flex flex-col gap-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
            <select value={intent} onChange={(event) => setIntent(event.target.value as InboxIntent)} className="field">
              {INBOX_INTENTS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
            {intent === "for a beat" ? <input value={beat} onChange={(event) => setBeat(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Beat no." className="field" /> : <span />}
          </div>
          {intent === "for a beat" ? (
            <>
              <textarea value={want} onChange={(event) => setWant(event.target.value)} rows={3} placeholder="What do you want on this beat? My chain of interests, each one fading as the next appears" className="field resize-y" />
              <textarea value={fromSketch} onChange={(event) => setFromSketch(event.target.value)} rows={2} placeholder="What to take from the sketch? Only the layout, not my colours" className="field resize-y" />
            </>
          ) : (
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="What is it for? This is how the pipeline diagram should look" className="field resize-y" />
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" tone="quiet" onClick={() => setFile(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              tone="primary"
              disabled={add.isPending || (intent === "for a beat" && !beat)}
              onClick={() =>
                add.mutate(
                  { file, note: intent === "for a beat" ? beatNote(beat, want, fromSketch) : note, intent },
                  {
                    onSuccess: () => {
                      setFile(null);
                      setNote("");
                      setBeat("");
                      setWant("");
                      setFromSketch("");
                    },
                  },
                )
              }
            >
              {add.isPending ? "Uploading…" : "Send to the team"}
            </Button>
          </div>
          {add.error ? <p className="text-xs text-bad">{add.error.message}</p> : null}
        </div>
      ) : null}
      {video.inbox.length ? (
        <div className="mt-2 flex flex-col gap-2">
          <span className="eyebrow">Sent · {video.inbox.length}</span>
          {video.inbox.map((item) => (
            <a key={item.file} href={item.url} target="_blank" rel="noreferrer" className="group flex gap-3 rounded-lg border border-line p-2 transition-colors hover:border-line-hi">
              {item.kind === "image" ? (
                <img src={item.url} alt="" className="size-14 shrink-0 rounded-md border border-line object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-md border border-line bg-surface font-mono text-[10px] uppercase text-dim">{item.kind}</span>
              )}
              <span className="min-w-0 py-0.5">
                <span className="eyebrow block">{item.intent}</span>
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{item.note || item.file}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SideTab = "activity" | "ask" | "inbox" | "decisions";

function SidePanel({ video }: { video: VideoDetail }) {
  const [tab, setTab] = useState<SideTab>("activity");
  const count = (n: number) => (n ? <span className="ml-1 font-mono text-[11px] text-dim">{n}</span> : null);
  return (
    <aside className="flex h-[640px] min-h-[420px] flex-col rounded-xl border border-line bg-panel lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <Tabs<SideTab>
        className="px-4"
        items={[
          {
            id: "activity",
            label: (
              <span className="flex items-center gap-1.5">
                Activity {video.running ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
              </span>
            ),
          },
          { id: "ask", label: "Ask" },
          { id: "inbox", label: <>Inbox{count(video.inbox.length)}</> },
          { id: "decisions", label: <>Decisions{count(video.decisions.length)}</> },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className={`flex min-h-0 flex-1 flex-col p-4 ${tab === "activity" ? "" : "scrollbar-thin overflow-y-auto"}`}>
        {tab === "activity" ? <Feed runs={video.runs} /> : null}
        {tab === "ask" ? <AskShowrunner video={video} onSent={() => setTab("activity")} /> : null}
        {tab === "inbox" ? <Inbox video={video} /> : null}
        {tab === "decisions" ? (
          video.decisions.length ? (
            <ol className="flex flex-col">
              {[...video.decisions].reverse().map((decision) => {
                const [, date, rest] = /^(\d{4}-\d{2}-\d{2})\s+(.*)$/s.exec(decision) ?? [null, null, decision];
                return (
                  <li key={decision} className="border-b border-line py-3 first:pt-0 last:border-0">
                    {date ? <span className="eyebrow">{date}</span> : null}
                    <p className={`mt-1 text-xs leading-relaxed ${decision.includes("SHOWRUNNER") ? "text-info" : "text-muted"}`}>{rest}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-dim">Every creative call you make is logged here, and the team follows it.</p>
          )
        ) : null}
      </div>
    </aside>
  );
}

export function VideoPage({ id }: { id: string }) {
  const client = useQueryClient();
  const { data: video, error } = useQuery({ queryKey: ["video", id], queryFn: () => studio.video(id), refetchInterval: 20_000 });
  const mode = useMutation({
    mutationFn: (next: VideoMode) => studio.setMode(id, next),
    onSuccess: (next) => client.setQueryData(["video", id], next),
  });
  const audio = useMutation({
    mutationFn: (next: VideoAudio) => studio.setAudio(id, next),
    onSuccess: (next) => {
      client.setQueryData(["video", id], next);
      void client.invalidateQueries({ queryKey: ["videos"] });
    },
  });
  const [docRequest, setDocRequest] = useState<{ file: string; n: number } | null>(null);
  if (error) return <Empty>{error.message}</Empty>;
  if (!video) return <p className="text-sm text-dim">Loading…</p>;
  const openStage = (stage: string) => {
    const target = stageTarget(video, stage);
    if (target === "record") navigate({ page: "record", id: video.id });
    else if (target === "edit") navigate({ page: "edit", id: video.id });
    else if (target === "doc") setDocRequest((r) => ({ file: STAGE_DOC[stage]!, n: (r?.n ?? 0) + 1 }));
  };
  const state = cardState(video);
  const planApproved = video.stages.some((stage) => stage.name === "plan" && /^done\b/.test(stage.state));

  return (
    <div className="flex flex-col gap-6">
      <a href={hrefOf({ page: "board" })} className="inline-flex w-fit items-center gap-1.5 text-xs text-dim transition-colors hover:text-ink">
        <ArrowLeftIcon size={13} /> Videos
      </a>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <div className="eyebrow mb-2 flex flex-wrap items-center gap-x-2">
            <span>#{String(video.number).padStart(3, "0")}</span>
            <span>·</span>
            <span className={state.tone}>{state.label}</span>
          </div>
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink md:text-[32px]">{video.title}</h1>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-2 text-xs text-dim">
            <span>Sound</span>
            <Segmented
              label="Voice-over or music only"
              items={AUDIO_CHOICES.map((choice) => ({ ...choice, title: planApproved ? "Locked: the plan is approved for this choice. Ask the showrunner to redo the plan to change it." : choice.title }))}
              value={video.audio}
              onChange={(next) => audio.mutate(next)}
              disabled={audio.isPending || video.running || planApproved}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-dim">
            Mode
            <select value={video.mode} onChange={(event) => mode.mutate(event.target.value as VideoMode)} className="field !h-9 !w-auto !py-0" disabled={mode.isPending}>
              {VIDEO_MODES.map((m) => (
                <option key={m} value={m}>
                  {m === "gated" ? "Ask me at gates" : m === "autonomous" ? "Fully autonomous" : "Chat (Claude Code)"}
                </option>
              ))}
            </select>
          </label>
          {audio.error ? <p className="max-w-xs text-right text-xs text-bad">{audio.error.message}</p> : null}
        </div>
      </header>
      <Stepper video={video} onOpen={openStage} />
      <Now video={video} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Documents video={video} request={docRequest} />
        <SidePanel video={video} />
      </div>
      <a href={hrefOf({ page: "guide" })} className="inline-flex w-fit items-center gap-1.5 text-xs text-dim transition-colors hover:text-ink">
        How this page works <ArrowRightIcon size={12} />
      </a>
    </div>
  );
}
