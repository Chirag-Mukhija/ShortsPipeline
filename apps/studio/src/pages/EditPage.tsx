// The Edit page: watch the assembled cut over a timeline (beats, voice, music, notes), mix voice and music live, redo beats with notes and attachments, keep takes, handle footage, pin notes for a moment or the whole video, render and approve.
import { SHOT_MOVES, SHOT_SIZES, type EditBeatInfo, type EditMix, type EditNote, type EditShot, type EditState, type ShotMove, type ShotSize } from "@clipforge/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { studio } from "../api";
import { ArrowLeftIcon, ClipIcon, PlayIcon, RefreshIcon } from "../components/icons";
import { Button, Chip, Empty, Tabs } from "../components/ui";
import { hrefOf } from "../hooks";
import { useLiveMix } from "../liveMix";

type Panel = "beat" | "shots" | "mix" | "footage" | "notes";
type View = "cut" | "storyboard";

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const db = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(0)} dB`;
const STATUS_TONE = { planned: "default", building: "warn", ready: "accent", approved: "good" } as const;
const beatNumber = (beatId: string) => Number(beatId.replace(/\D/g, ""));

// Attachments go to the video's inbox with a note naming the beat (or "Whole video"), which is how the team's context pack finds them.
async function attachAll(id: string, files: File[], note: string, intent: "for a beat" | "reference") {
  for (const f of files) await studio.addToInbox(id, f, note, intent);
  return files.length ? `\n(Attached in the inbox: ${files.map((f) => f.name).join(", ")})` : "";
}

export function EditPage({ id }: { id: string }) {
  const client = useQueryClient();
  const { data: edit, error } = useQuery({
    queryKey: ["edit", id],
    queryFn: () => studio.edit(id),
    // Poll while a render runs or a beat is being rebuilt; otherwise server events refresh it.
    refetchInterval: (q) => (q.state.data?.job?.status === "running" ? 1500 : q.state.data?.beats.some((b) => b.status === "building") ? 6000 : false),
  });
  const { data: video } = useQuery({ queryKey: ["video", id], queryFn: () => studio.video(id) });
  const [panel, setPanel] = useState<Panel>("beat");
  const [view, setView] = useState<View>("cut");
  const [selected, setSelected] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  // The mix as the creator is hearing it; saved a moment after the last change, without re-rendering anything.
  const [mixDraft, setMixDraft] = useState<EditMix | null>(null);
  const saveTimer = useRef(0);
  const mix = mixDraft ?? edit?.spec?.mix;
  const changeMix = (patch: Partial<EditMix>) => {
    if (!mix) return;
    const next = { ...mix, ...patch };
    setMixDraft(next);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      studio
        .patchEdit(id, { mix: next })
        .then((state) => {
          client.setQueryData(["edit", id], state);
          setMixDraft((d) => (d === next ? null : d));
        })
        .catch((e: Error) => setProblem(e.message));
    }, 500);
  };
  const source = view === "storyboard" ? edit?.renders.animatic : edit?.renders.preview;
  useLiveMix(player, {
    src: source?.url,
    musicUrl: edit?.tracks.find((t) => t.id === edit.spec?.music?.trackId)?.url,
    mix,
    duration: edit?.spec?.duration ?? 0,
    waveform: edit?.waveform ?? [],
  });

  const act = async (label: string, fn: () => Promise<EditState>) => {
    setBusy(label);
    setProblem(null);
    try {
      client.setQueryData(["edit", id], await fn());
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const seek = (t: number) => {
    setTime(t);
    if (player.current) player.current.currentTime = t;
  };

  useEffect(() => {
    const el = player.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      setTime(el.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const start = () => (raf = requestAnimationFrame(tick));
    const stop = () => cancelAnimationFrame(raf);
    el.addEventListener("play", start);
    el.addEventListener("pause", stop);
    el.addEventListener("seeked", () => setTime(el.currentTime));
    return () => {
      stop();
      el.removeEventListener("play", start);
      el.removeEventListener("pause", stop);
    };
  }, [edit?.renders.preview?.url]);

  if (error) return <Empty>{(error as Error).message}</Empty>;
  if (!edit) return null;
  const spec = edit.spec && mix ? { ...edit.spec, mix } : edit.spec;
  const shown = spec ? { ...edit, spec } : edit;
  const beat = edit.beats.find((b) => b.id === selected) ?? edit.beats.find((b) => time >= b.start && time < b.end) ?? edit.beats[0];
  const job = edit.job;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <a href={hrefOf({ page: "video", id })} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeftIcon size={14} /> {video?.title ?? id}
        </a>
        <span className="eyebrow">Edit</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" disabled={!spec || job?.status === "running"} onClick={() => void act("render", () => studio.render(id, "preview"))}>
            <RefreshIcon size={12} /> Render preview
          </Button>
          <Button size="sm" disabled={!spec || job?.status === "running"} onClick={() => void act("final", () => studio.render(id, "final"))}>
            Final 1080p
          </Button>
          {edit.renders.final ? (
            <a href={edit.renders.final.url} download className="inline-flex h-7 items-center rounded-md border border-line bg-surface px-2.5 text-xs text-ink hover:border-line-hi hover:bg-surface-hi">
              Download final
            </a>
          ) : null}
          <Button tone="primary" size="sm" disabled={!edit.renders.preview || busy !== null} onClick={() => void act("approve", () => studio.approveCut(id))}>
            Approve rough cut
          </Button>
        </div>
      </header>

      {job ? <JobBar job={job} /> : null}
      {problem ? <p className="rounded-lg border border-bad/40 px-3 py-2 text-sm text-bad">{problem}</p> : null}

      {!spec ? (
        <Empty>No edit plan yet. Go back to the video and press "Run the team": it plans the beats, builds them and assembles a first cut.</Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-line bg-black">
              {source ? (
                <video ref={player} src={source.url} controls className="aspect-video w-full" />
              ) : (
                <div className="grid aspect-video place-items-center text-sm text-dim">{view === "storyboard" ? "No storyboard render yet. Plan shots in the Shots panel, then Render storyboard." : "No preview yet. Press Render preview."}</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs items={[{ id: "cut", label: "Cut" }, { id: "storyboard", label: `Storyboard${spec.storyboard === "approved" ? " · approved" : ""}` }]} value={view} onChange={setView} />
              {view === "storyboard" ? (
                <div className="ml-auto flex gap-2">
                  <Button size="sm" disabled={job?.status === "running"} onClick={() => void act("animatic", () => studio.render(id, "animatic"))}>
                    <RefreshIcon size={12} /> Render storyboard
                  </Button>
                  <Button tone="primary" size="sm" disabled={busy !== null || !(spec.shots ?? []).length || spec.storyboard === "approved"} onClick={() => void act("storyboard", () => studio.approveStoryboard(id))}>
                    {spec.storyboard === "approved" ? "Storyboard approved" : "Approve storyboard"}
                  </Button>
                </div>
              ) : null}
            </div>
            <Timeline edit={shown} time={time} selected={beat?.id} onSeek={seek} onSelect={(b) => (setSelected(b.id), setPanel("beat"), seek(b.start))} onMoveBoundary={(b, end) => void act("move", () => studio.patchEdit(id, { beats: [{ id: b.id, end }] }))} />
            <p className="text-xs text-dim">
              {clock(time)} / {clock(spec.duration)} · click the timeline to jump, drag the line between two beats to move where one ends. Any change re-renders only the beats it touches.
            </p>
          </div>

          <aside className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
            <Tabs
              items={[
                { id: "beat", label: "Beat" },
                { id: "shots", label: `Shots${beat ? ` · ${(spec.shots ?? []).filter((x) => x.beat === beat.id).length}` : ""}` },
                { id: "mix", label: "Mix" },
                // Footage only shows up once a beat asks for a recording or photo.
                ...(spec.footage?.length ? [{ id: "footage" as const, label: `Footage · ${spec.footage.filter((f) => !f.file).length}` }] : []),
                { id: "notes", label: `Notes${edit.notes.filter((n) => n.status === "open").length ? ` · ${edit.notes.filter((n) => n.status === "open").length}` : ""}` },
              ]}
              value={panel}
              onChange={setPanel}
            />
            {panel === "beat" && beat ? <BeatPanel id={id} beat={beat} busy={busy} act={act} running={job?.status === "running"} /> : null}
            {panel === "shots" && beat ? <ShotsPanel id={id} beat={beat} shots={(spec.shots ?? []).filter((x) => x.beat === beat.id)} time={time} act={act} busy={busy} onSeek={seek} /> : null}
            {panel === "mix" ? <MixPanel id={id} edit={shown} onMix={changeMix} act={act} /> : null}
            {panel === "footage" ? <FootagePanel id={id} edit={edit} act={act} /> : null}
            {panel === "notes" ? <NotesPanel id={id} edit={edit} time={time} onSeek={seek} act={act} /> : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function JobBar({ job }: { job: NonNullable<EditState["job"]> }) {
  const last = job.log.at(-1) ?? "";
  const label = job.kind === "stills" ? `Stills for ${job.beat}` : job.kind === "final" ? "Final render" : job.beat ? `Re-render ${job.beat}` : "Preview render";
  const tone = job.status === "running" ? "border-accent/40 text-ink" : job.status === "done" ? "border-good/40 text-good" : "border-bad/40 text-bad";
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      {job.status === "running" ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
      <span className="font-medium">{label}</span>
      <span className="text-dim">· {job.status === "running" ? "working" : job.status}</span>
      {last ? <span className="ml-2 truncate font-mono text-xs text-dim">{last}</span> : null}
    </div>
  );
}

// Lanes share one time axis: beats (with thumbnails), the voice waveform, the music bed, and note pins; the playhead runs across all of them.
function Timeline({ edit, time, selected, onSeek, onSelect, onMoveBoundary }: { edit: EditState; time: number; selected?: string; onSeek: (t: number) => void; onSelect: (b: EditBeatInfo) => void; onMoveBoundary: (b: EditBeatInfo, end: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  // The time axis starts after the 88 px lane labels; seeking, dragging, pins and the playhead all measure against this strip.
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ beat: EditBeatInfo; t: number } | null>(null);
  const dur = edit.spec?.duration ?? 1;
  const pct = (t: number) => `${(t / dur) * 100}%`;
  const at = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    return r ? Math.min(dur, Math.max(0, ((clientX - r.left) / r.width) * dur)) : 0;
  };
  const wave = useMemo(() => {
    const w = edit.waveform;
    if (!w.length) return "";
    const n = w.length;
    return `M0,50 ${w.map((v, i) => `L${((i / n) * 1000).toFixed(1)},${(50 - v * 46).toFixed(1)}`).join(" ")} L1000,50 ${[...w].reverse().map((v, i) => `L${(((n - 1 - i) / n) * 1000).toFixed(1)},${(50 + v * 46).toFixed(1)}`).join(" ")} Z`;
  }, [edit.waveform]);
  const voiceScale = Math.pow(10, (edit.spec?.mix.voiceDb ?? 0) / 20);
  const music = edit.spec?.music && edit.spec.mix.musicOn ? edit.spec.music : null;

  return (
    <div
      ref={box}
      className="relative select-none overflow-hidden rounded-xl border border-line bg-panel"
      onMouseMove={(e) => drag && setDrag({ ...drag, t: at(e.clientX) })}
      onMouseUp={() => {
        if (drag) onMoveBoundary(drag.beat, Number(drag.t.toFixed(2)));
        setDrag(null);
      }}
      onMouseLeave={() => setDrag(null)}
    >
      <Lane label="Beats">
        {edit.beats.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            style={{ left: pct(b.start), width: pct(b.end - b.start) }}
            className={`absolute inset-y-1 overflow-hidden rounded-md border text-left ${selected === b.id ? "border-accent" : "border-line-hi"} ${b.status === "planned" ? "bg-surface" : "bg-surface-hi"}`}
          >
            {b.thumb && b.status !== "planned" ? <img src={b.thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" /> : null}
            <span className="relative block truncate px-1.5 pt-1 text-[11px] font-medium text-ink">{i + 1}. {b.label ?? b.id}</span>
            <span className={`relative block px-1.5 text-[10px] ${b.status === "building" ? "text-warn" : "text-dim"}`}>{b.status ?? "planned"}</span>
          </button>
        ))}
        {edit.beats.slice(0, -1).map((b) => (
          <span key={`h${b.id}`} onMouseDown={(e) => (e.stopPropagation(), setDrag({ beat: b, t: b.end }))} style={{ left: pct(drag?.beat.id === b.id ? drag.t : b.end) }} className="absolute inset-y-0 z-10 -ml-1.5 w-3 cursor-ew-resize" title="Drag to move where this beat ends">
            <span className="mx-auto block h-full w-0.5 bg-line-hi hover:bg-accent" />
          </span>
        ))}
      </Lane>
      <Lane label={`Voice ${db(edit.spec?.mix.voiceDb ?? 0)}`} onClick={(e) => onSeek(at(e.clientX))}>
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d={wave} className="fill-info/60" transform={`translate(0 ${50 - 50 * Math.min(1.6, voiceScale)}) scale(1 ${Math.min(1.6, voiceScale)})`} />
        </svg>
      </Lane>
      <Lane label={music ? `Music ${db(edit.spec!.mix.musicDb)}` : "Music off"} onClick={(e) => onSeek(at(e.clientX))}>
        {music ? (
          <div className="absolute inset-y-2 left-0 right-0 rounded bg-good/15">
            <span className="block truncate px-2 pt-1 text-[11px] text-good">{music.title}</span>
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center px-2 text-[11px] text-dim">No music bed (pick one in Mix)</span>
        )}
      </Lane>
      <div ref={track} className="pointer-events-none absolute inset-y-0 left-[88px] right-0">
        {edit.notes.filter((n) => n.scope !== "video").map((n) => (
          <span key={n.id} style={{ left: pct(n.at) }} title={n.text} className={`absolute top-0 -ml-1 size-2 rounded-full ${n.status === "open" ? "bg-warn" : "bg-dim"}`} />
        ))}
        <span style={{ left: pct(time) }} className="absolute inset-y-0 w-px bg-accent" />
      </div>
    </div>
  );
}

function Lane({ label, children, onClick }: { label: string; children: ReactNode; onClick?: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] border-b border-line last:border-b-0">
      <span className="flex items-center border-r border-line px-2 text-[11px] text-dim">{label}</span>
      <div className="relative h-14 cursor-pointer" onClick={onClick}>
        {children}
      </div>
    </div>
  );
}

type Act = (label: string, fn: () => Promise<EditState>) => Promise<void>;

function BeatPanel({ id, beat, busy, act, running }: { id: string; beat: EditBeatInfo; busy: string | null; act: Act; running: boolean }) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [stills, setStills] = useState(false);
  const [label, setLabel] = useState(beat.label ?? "");
  useEffect(() => setLabel(beat.label ?? ""), [beat.id, beat.label]);
  const redo = () =>
    act("redo", async () => {
      const attached = await attachAll(id, files, `Beat ${beatNumber(beat.id)} redo: ${note.trim()}`, "for a beat");
      return studio.redoBeat(id, beat.id, note.trim() + attached);
    }).then(() => (setNote(""), setFiles([])));
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== beat.label && void act("label", () => studio.patchEdit(id, { beats: [{ id: beat.id, label }] }))} className="field min-w-0 flex-1 text-sm" />
        <Chip tone={STATUS_TONE[beat.status ?? "planned"]}>{beat.status === "approved" ? "ready" : beat.status ?? "planned"}</Chip>
      </div>
      <p className="text-xs text-dim">
        {clock(beat.start)}–{clock(beat.end)} · {(beat.end - beat.start).toFixed(1)} s
      </p>

      <span className="eyebrow">Redo this beat</span>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder='What should change? e.g. "the chain feels slow here; make the play buttons pop on each switch"' className="field resize-none text-sm" />
      <Attach files={files} onChange={setFiles} />
      <Button tone="primary" size="sm" className="self-start" disabled={note.trim().length < 3 || busy !== null || beat.status === "planned"} onClick={() => void redo()}>
        <PlayIcon size={12} /> Redo with this note
      </Button>
      <p className="text-xs text-dim">Redoing keeps the current version as a take, so you can always go back. A sketch or iPad screenshot attached here goes to the designer with your note.</p>

      <span className="eyebrow">Takes</span>
      {beat.takes.length ? (
        <div className="flex flex-wrap gap-1.5">
          {beat.takes.map((t) => (
            <Button key={t} size="sm" disabled={busy !== null} onClick={() => void act("take", () => studio.restoreTake(id, beat.id, t))} title="Use this version (the current one is kept as a take too)">
              Use {t}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-dim">Earlier versions appear here when you redo this beat.</p>
      )}

      {beat.status !== "planned" ? (
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setStills((v) => !v)} className="text-xs text-muted hover:text-ink">
            {stills ? "Hide stills" : `Show stills${beat.stills.length ? ` (${beat.stills.length})` : ""}`}
          </button>
          {stills ? (
            <Button size="sm" disabled={running} onClick={() => void act("stills", () => studio.render(id, "stills", beat.id))}>
              <RefreshIcon size={12} /> Refresh
            </Button>
          ) : null}
        </div>
      ) : null}
      {stills ? (
        beat.stills.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {beat.stills.map((s) => (
              <a key={s} href={s} target="_blank" rel="noreferrer" title={decodeURIComponent(s.split("/").pop() ?? "").replace(".png", " s")}>
                <img src={s} alt="" loading="lazy" className="aspect-video w-full rounded border border-line object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-dim">No stills yet. Refresh makes a few frames of this beat.</p>
        )
      ) : null}
      {beat.status === "planned" ? <p className="text-xs text-dim">Not built yet: the team builds it after you approve the storyboard.</p> : null}
    </div>
  );
}

// A paperclip that collects files to send with a note; nothing is uploaded until the note is sent.
function Attach({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink" title="Attach a sketch, screenshot or reference">
        <ClipIcon size={13} /> Attach
      </button>
      {files.map((f, i) => (
        <span key={`${f.name}${i}`} className="inline-flex max-w-[180px] items-center gap-1 rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted">
          <span className="truncate">{f.name}</span>
          <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="hover:text-bad" aria-label={`Remove ${f.name}`}>
            ✕
          </button>
        </span>
      ))}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*,video/*,.pdf"
        hidden
        onChange={(e) => {
          onChange([...files, ...Array.from(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, format, onChange }: { label: string; value: number; min: number; max: number; step?: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-ink">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[var(--color-accent)]" />
    </label>
  );
}

function MixPanel({ id, edit, onMix, act }: { id: string; edit: EditState; onMix: (patch: Partial<EditMix>) => void; act: Act }) {
  const spec = edit.spec!;
  const mix = spec.mix;
  const [more, setMore] = useState(false);
  const [end, setEnd] = useState(spec.duration);
  useEffect(() => setEnd(spec.duration), [spec.duration]);
  return (
    <div className="flex flex-col gap-4 text-sm">
      <Slider label="Your voice" value={mix.voiceDb} min={-20} max={12} format={db} onChange={(v) => onMix({ voiceDb: v })} />
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">Music track</span>
        <select value={spec.music?.trackId ?? ""} onChange={(e) => void act("music", () => studio.patchEdit(id, { music: e.target.value ? { trackId: e.target.value } : null }))} className="field text-sm">
          <option value="">No music</option>
          {edit.tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
              {t.mood.length ? ` (${t.mood.slice(0, 2).join(", ")})` : ""}
            </option>
          ))}
        </select>
        {!edit.tracks.length ? <span className="text-xs text-dim">No tracks yet: add one from your computer on the Library page (Music tab).</span> : null}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={mix.musicOn} onChange={(e) => onMix({ musicOn: e.target.checked })} /> Music on
      </label>
      <Slider label="Music volume" value={mix.musicDb} min={-40} max={0} format={db} onChange={(v) => onMix({ musicDb: v })} />
      <p className="text-xs text-dim">You hear every change straight away, and it saves itself. The mixed audio file is only written when you export (Final 1080p).</p>

      <button type="button" onClick={() => setMore((v) => !v)} className="self-start text-xs text-muted hover:text-ink">
        {more ? "Fewer options" : "More options: dip, start, fades, video end"}
      </button>
      {more ? (
        <div className="flex flex-col gap-4">
          <Slider label="Music dips while you talk" value={mix.duckDb} min={0} max={24} format={(v) => (v ? `−${v} dB` : "off")} onChange={(v) => onMix({ duckDb: v })} />
          <div className="grid grid-cols-3 gap-2">
            <Num label="Music starts at (s)" value={mix.musicStart} onChange={(v) => onMix({ musicStart: v })} />
            <Num label="Fade in (s)" value={mix.fadeIn} onChange={(v) => onMix({ fadeIn: v })} />
            <Num label="Fade out (s)" value={mix.fadeOut} onChange={(v) => onMix({ fadeOut: v })} />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">Video ends at (s) · narration is {clock(edit.waveform.length / 10)}</span>
            <input type="number" step="0.1" value={end} onChange={(e) => setEnd(Number(e.target.value))} onBlur={() => end !== spec.duration && void act("duration", () => studio.patchEdit(id, { duration: end }))} className="field !py-1 text-sm" />
          </label>
        </div>
      ) : null}
      <p className="text-xs text-dim">Narration edits (cuts, noise cleanup) live on the Record page; re-export there and the edit follows, because every beat is pinned to your words.</p>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted">{label}</span>
      <input type="number" step="0.1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="field !py-1 text-sm" />
    </label>
  );
}

function FootagePanel({ id, edit, act }: { id: string; edit: EditState; act: Act }) {
  const slots = edit.spec?.footage ?? [];
  if (!slots.length) return <p className="text-sm text-dim">The beats don't need anything from you yet. When they do (a screen recording, a photo), it's listed here with an upload button.</p>;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-dim">Nothing is used raw: each clip gets the theme's frame, crop, zoom and grade. Record at 1080p or higher, desktop clutter hidden.</p>
      {slots.map((f) => (
        <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
          <div className="flex items-start gap-2">
            <span className="flex-1 text-ink">{f.need}</span>
            <Chip tone={f.file ? "good" : "warn"}>{f.file ? "uploaded" : "needed"}</Chip>
          </div>
          <span className="text-xs text-dim">
            {f.beat ?? ""}
            {f.seconds ? ` · about ${f.seconds} s` : ""}
          </span>
          {f.file ? <video src={`/videofiles/${id}/${f.file}`} controls className="w-full rounded border border-line" /> : null}
          <input type="file" accept="video/*,image/*" onChange={(e) => e.target.files?.[0] && void act("footage", () => studio.uploadFootage(id, f.id, e.target.files![0]!))} className="text-xs text-muted" />
          {f.file ? (
            <div className="grid grid-cols-3 gap-2">
              <Num label="In (s)" value={f.in ?? 0} onChange={(v) => void act("footage", () => studio.patchEdit(id, { footage: [{ id: f.id, in: v }] }))} />
              <Num label="Out (s)" value={f.out ?? 0} onChange={(v) => void act("footage", () => studio.patchEdit(id, { footage: [{ id: f.id, out: v }] }))} />
              <Num label="Speed ×" value={f.speed ?? 1} onChange={(v) => void act("footage", () => studio.patchEdit(id, { footage: [{ id: f.id, speed: v }] }))} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// Notes are either pinned to a moment (that beat gets redone) or about the whole video (standing direction: the shared style changes once and every beat follows it).
function NotesPanel({ id, edit, time, onSeek, act }: { id: string; edit: EditState; time: number; onSeek: (t: number) => void; act: Act }) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<"moment" | "video">("moment");
  const [files, setFiles] = useState<File[]>([]);
  const beatAt = (t: number) => edit.beats.find((b) => t >= b.start && t < b.end)?.id;
  const save = (notes: EditNote[]) => act("notes", () => studio.saveNotes(id, notes));
  const open = edit.notes.filter((n) => n.status === "open");
  const whole = edit.notes.filter((n) => n.scope === "video");
  const moments = edit.notes.filter((n) => n.scope !== "video").sort((a, b) => a.at - b.at);
  const add = () => {
    const body = text.trim();
    if (!body) return;
    const beat = scope === "moment" ? beatAt(time) : undefined;
    void act("notes", async () => {
      const where = scope === "video" ? "Whole video" : `Beat ${beatNumber(beat ?? "")} note at ${clock(time)}`;
      const attached = await attachAll(id, files, `${where}: ${body}`, scope === "video" ? "reference" : "for a beat");
      return studio.saveNotes(id, [...edit.notes, { id: `${Date.now()}`, at: scope === "video" ? 0 : time, text: body + attached, beat, scope, status: "open", createdAt: new Date().toISOString() }]);
    }).then(() => (setText(""), setFiles([])));
  };
  const row = (n: EditNote) => (
    <div key={n.id} className="flex items-start gap-2 py-2">
      {n.scope === "video" ? (
        <span className="text-xs text-dim">all</span>
      ) : (
        <button type="button" onClick={() => onSeek(n.at)} className="font-mono text-xs text-accent hover:underline">
          {clock(n.at)}
        </button>
      )}
      <span className={`flex-1 whitespace-pre-line ${n.status === "done" ? "text-dim line-through" : "text-ink"}`}>{n.text}</span>
      <button type="button" className="text-xs text-dim hover:text-ink" onClick={() => void save(edit.notes.map((x) => (x.id === n.id ? { ...x, status: x.status === "open" ? "done" : "open" } : x)))}>
        {n.status === "open" ? "done" : "reopen"}
      </button>
      <button type="button" className="text-xs text-dim hover:text-bad" onClick={() => void save(edit.notes.filter((x) => x.id !== n.id))}>
        ✕
      </button>
    </div>
  );
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex gap-1 rounded-lg bg-surface p-0.5 text-xs">
        {(["moment", "video"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setScope(s)} className={`flex-1 rounded-md px-2 py-1 ${scope === s ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
            {s === "moment" ? `This moment · ${clock(time)}` : "Whole video"}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={scope === "video" ? 'e.g. "darker background", "orange instead of yellow", "faster pace"' : `Note at ${clock(time)}…`} className="field min-w-0 flex-1 text-sm" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button size="sm" disabled={!text.trim()} onClick={add}>
          {scope === "video" ? "Add" : "Pin"}
        </Button>
      </div>
      <Attach files={files} onChange={setFiles} />
      <p className="text-xs text-dim">
        {scope === "video"
          ? "A whole-video note changes the video's shared style once; every built beat re-renders with it, and beats built later follow it too."
          : "Pause where something's off and pin a note there. Only the beats with notes get redone."}
      </p>
      {whole.length ? (
        <div className="flex flex-col">
          <span className="eyebrow">Whole video</span>
          <div className="flex flex-col divide-y divide-line">{whole.map(row)}</div>
        </div>
      ) : null}
      {moments.length ? (
        <div className="flex flex-col">
          <span className="eyebrow">At a moment</span>
          <div className="flex flex-col divide-y divide-line">{moments.map(row)}</div>
        </div>
      ) : null}
      <Button tone="primary" disabled={!open.length} onClick={() => void act("send", () => studio.sendNotes(id))}>
        Send {open.length || ""} note{open.length === 1 ? "" : "s"} to the team
      </Button>
    </div>
  );
}

const SIZE_NAMES: Record<ShotSize, string> = { wide: "Wide", medium: "Medium", mcu: "Med close-up", cu: "Close-up", ecu: "Extreme CU" };

// A beat's storyboard as editable rows: when it starts, what's on screen, how the camera frames it, and the words shown. Saving re-renders only this beat's animatic.
function ShotsPanel({ id, beat, shots, time, act, busy, onSeek }: { id: string; beat: EditBeatInfo; shots: EditShot[]; time: number; act: Act; busy: string | null; onSeek: (t: number) => void }) {
  const [list, setList] = useState<EditShot[]>(shots);
  useEffect(() => setList(shots), [JSON.stringify(shots)]);
  const set = (i: number, patch: Partial<EditShot>) => setList((l) => l.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const changed = JSON.stringify(list) !== JSON.stringify(shots);
  const at = Math.min(Math.max(time, beat.start), beat.end - 0.5);
  const save = () =>
    act("shots", async () => {
      await studio.patchEdit(id, { shots: { beat: beat.id, list: [...list].sort((a, b) => a.at - b.at) } });
      return studio.render(id, "animatic");
    });
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-xs text-dim">One idea per shot. Watch it in the Storyboard view: labelled boxes and a moving camera over your voice. Change anything here; only this beat re-renders.</p>
      {list.length === 0 ? <p className="text-xs text-dim">No shots planned for this beat yet. The team writes them in the edit plan, or add one at the playhead.</p> : null}
      {list.map((s, i) => {
        const words = (s.text ?? "").trim().split(/\s+/).filter(Boolean).length;
        return (
          <div key={s.id} className="flex flex-col gap-1.5 rounded-lg border border-line p-2.5">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => onSeek(s.at)} className="font-mono text-xs text-accent hover:underline">{clock(s.at)}</button>
              <input type="number" step="0.1" value={s.at} onChange={(e) => set(i, { at: Number(e.target.value) })} className="field !w-20 !py-0.5 text-xs" title="Starts at (video seconds)" />
              <select value={s.size} onChange={(e) => set(i, { size: e.target.value as ShotSize })} className="field !w-auto !py-0.5 text-xs">
                {SHOT_SIZES.map((z) => <option key={z} value={z}>{SIZE_NAMES[z]}</option>)}
              </select>
              <select value={s.move} onChange={(e) => set(i, { move: e.target.value as ShotMove })} className="field !w-auto !py-0.5 text-xs">
                {SHOT_MOVES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="ml-auto text-xs text-dim hover:text-bad" aria-label="Remove shot">✕</button>
            </div>
            <input value={s.subject} onChange={(e) => set(i, { subject: e.target.value })} placeholder="What's on screen (a noun)" className="field !py-1 text-sm" />
            <input value={s.action} onChange={(e) => set(i, { action: e.target.value })} placeholder="What it does (a verb)" className="field !py-1 text-xs" />
            <div className="flex items-center gap-1.5">
              <input value={s.text ?? ""} onChange={(e) => set(i, { text: e.target.value })} placeholder="On-screen words (8 at most)" className="field !py-1 min-w-0 flex-1 text-xs" />
              <span className={`text-[10px] ${words > 8 ? "text-bad" : "text-dim"}`}>{words}/8</span>
            </div>
            <input value={s.transitionOut ?? ""} onChange={(e) => set(i, { transitionOut: e.target.value })} placeholder="Transition out (e.g. mask grows from the stamp)" className="field !py-1 text-xs" />
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setList((l) => [...l, { id: `s${Date.now()}`, beat: beat.id, at: Number(at.toFixed(1)), subject: "", action: "", size: "medium", move: "glide" }])}>
          + Shot at {clock(at)}
        </Button>
        <Button tone="primary" size="sm" disabled={!changed || busy !== null || list.some((s) => !s.subject.trim())} onClick={() => void save()}>
          Save and render
        </Button>
      </div>
    </div>
  );
}
