// The record page: read the script off a teleprompter that follows your voice, record takes and pickups (with a warning when the mic glitches), cut by text, clean background noise, then export the voice-over for the edit stage.
import { coverage as coverageOf, type Cleanup, type CutReason, type RecordState } from "@clipforge/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { studio } from "../api";
import { EditView, clock } from "../components/record/EditView";
import { MicPanel } from "../components/record/MicPanel";
import { Teleprompter } from "../components/record/Teleprompter";
import { Button, Empty } from "../components/ui";
import { ArrowLeftIcon, RefreshIcon } from "../components/icons";
import { hrefOf } from "../hooks";
import { Mic, listMics, type TakeWriter } from "../record/mic";

type Phase = "idle" | "countdown" | "recording" | "saving";
type Notice = { tone: "good" | "bad" | "info"; text: string; action?: { label: string; run: () => void } };

const CLEANUP: { id: Cleanup; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "gentle", label: "Gentle" },
  { id: "strong", label: "Strong" },
];

const stored = (name: string) => {
  try {
    return localStorage.getItem(`record.${name}`);
  } catch {
    return null;
  }
};
const store = (name: string, value: string) => {
  try {
    localStorage.setItem(`record.${name}`, value);
  } catch {
    // private mode: settings just won't persist
  }
};

export function RecordPage({ id }: { id: string }) {
  const client = useQueryClient();
  // While cleaned copies are being made in the background, keep checking so playback switches to them as they land.
  const { data: rec, error } = useQuery({ queryKey: ["record", id], queryFn: () => studio.record(id), refetchInterval: (query) => (query.state.data?.cleanup.pending ? 1500 : false) });
  const [tab, setTab] = useState<"record" | "edit">("record");
  const [cursor, setCursor] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(() => Number(stored("font")) || 34);
  const [follow, setFollow] = useState(() => stored("follow") !== "off");
  const [mic, setMic] = useState<Mic | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [glitchLive, setGlitchLive] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [focusTake, setFocusTake] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const writer = useRef<TakeWriter | null>(null);
  const micRef = useRef<Mic | null>(null);
  const cursorRef = useRef(0);
  const saveTimers = useRef(new Map<string, number>());
  const countdown = useRef(0);

  const coverage = useMemo(() => (rec ? coverageOf(rec.script, rec.takes) : []), [rec]);
  const missing = coverage.filter((c) => c === "missing").length;
  const position = cursor ?? Math.max(0, coverage.indexOf("missing"));
  cursorRef.current = position;
  const canRecord = window.isSecureContext && typeof AudioWorkletNode !== "undefined";
  const busy = phase !== "idle";

  const setState = useCallback((state: RecordState) => client.setQueryData(["record", id], state), [client, id]);

  const openMic = useCallback(async (deviceId: string | null) => {
    setMicError(null);
    try {
      micRef.current?.close();
      const next = await Mic.open(deviceId);
      micRef.current = next;
      setMic(next);
      if (next.deviceId) store("mic", next.deviceId);
      setDevices(await listMics());
    } catch (err) {
      micRef.current = null;
      setMic(null);
      setMicError(err instanceof Error && err.name === "NotAllowedError" ? "The browser blocked the microphone. Allow it in the address bar, then try again." : String(err instanceof Error ? err.message : err));
    }
  }, []);

  useEffect(() => () => micRef.current?.close(), []);

  useEffect(() => {
    if (phase !== "recording" && phase !== "countdown") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  // Live teleprompter: while you're talking, the last 5 s go to local Whisper about once a second and your place moves to match.
  useEffect(() => {
    if (phase !== "recording" || !follow || !mic) return;
    let inFlight = false;
    const timer = window.setInterval(() => {
      if (inFlight || !mic.speakingRecently(1200)) return;
      inFlight = true;
      const from = cursorRef.current;
      studio
        .listen(id, from, mic.liveWindow())
        .then((result) => {
          if (!result.busy && cursorRef.current === from) setCursor(result.cursor);
        })
        .catch(() => undefined)
        .finally(() => {
          inFlight = false;
        });
    }, 900);
    return () => window.clearInterval(timer);
  }, [phase, follow, mic, id]);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => {
      setElapsed(writer.current?.seconds ?? 0);
      setGlitchLive(Boolean(mic && performance.now() - mic.glitchAt < 3000));
    }, 250);
    return () => {
      window.clearInterval(timer);
      setGlitchLive(false);
    };
  }, [phase, mic]);

  const startRecording = useCallback(async () => {
    if (!mic) return;
    setNotice(null);
    setPhase("countdown");
    const ticket = ++countdown.current;
    for (let n = 3; n > 0; n--) {
      setCount(n);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      if (countdown.current !== ticket || micRef.current !== mic) return;
    }
    try {
      writer.current = await mic.startTake(id, cursorRef.current);
      setElapsed(0);
      setPhase("recording");
    } catch (err) {
      setPhase("idle");
      setNotice({ tone: "bad", text: err instanceof Error ? err.message : String(err) });
    }
  }, [mic, id]);

  const stopRecording = useCallback(async () => {
    const take = mic?.stopTake() ?? writer.current;
    writer.current = null;
    if (!take) return setPhase("idle");
    setPhase("saving");
    try {
      await take.finish();
      const before = new Set(rec?.takes.map((t) => t.id));
      const state = await studio.finishTake(id, take.id);
      setState(state);
      const added = state.takes.find((t) => !before.has(t.id));
      if (added) {
        const counts = { retake: 0, filler: 0, outside: 0 };
        for (const w of added.words) if (w.reason && w.reason in counts) counts[w.reason as keyof typeof counts]++;
        const redone = (rec?.takes ?? []).some((old) => state.takes.find((t) => t.id === old.id)?.words.some((w, i) => w.reason === "redone" && !old.words[i]?.cut));
        const parts = [
          counts.retake ? `cut ${counts.retake} words from restarted lines` : "",
          counts.filler ? `${counts.filler} filler${counts.filler > 1 ? "s" : ""}` : "",
          redone ? "replaced the older version of these lines" : "",
        ].filter(Boolean);
        const glitches = added.glitches?.length ?? 0;
        setNotice(
          glitches
            ? { tone: "bad", text: `Take saved (${clock(added.duration)}), but the mic glitched in ${glitches} place${glitches > 1 ? "s" : ""} (from ${added.glitches!.map(([from]) => clock(from)).join(", ")}). They're marked red in Edit: listen, and record those lines again.` }
            : { tone: "good", text: `Take saved (${clock(added.duration)}).${parts.length ? ` I ${parts.join(", ")}.` : ""} Check it in Edit.` },
        );
        const lastKept = [...added.words].reverse().find((w) => !w.cut && w.idx !== null);
        if (lastKept?.idx != null) setCursor(Math.min(state.script.words.length - 1, lastKept.idx + 1));
      }
    } catch (err) {
      setNotice({
        tone: "bad",
        text: `Transcribing failed: ${err instanceof Error ? err.message : String(err)}. The audio is safe on disk.`,
        action: { label: "Try again", run: () => void recoverRef.current(take.id) },
      });
      void client.invalidateQueries({ queryKey: ["record", id] });
    } finally {
      setPhase("idle");
    }
  }, [mic, id, rec, setState, client]);

  const toggleRecording = useCallback(() => {
    if (phase === "idle") void startRecording();
    else if (phase === "recording") void stopRecording();
    else if (phase === "countdown") {
      countdown.current++;
      setPhase("idle");
    }
  }, [phase, startRecording, stopRecording]);

  const moveCursor = useCallback(
    (delta: number) => {
      if (!rec) return;
      const words = rec.script.words;
      const para = words[cursorRef.current]?.para ?? 0;
      const target = delta > 0 ? words.find((w) => w.para > para) : [...words].reverse().find((w) => w.para < para && (words[w.i - 1]?.para ?? -1) !== w.para);
      if (target) setCursor(target.i);
    },
    [rec],
  );

  useEffect(() => {
    if (tab !== "record") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button")) return;
      if (event.key === " " && mic && phase !== "saving") {
        event.preventDefault();
        toggleRecording();
      } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && phase !== "saving") {
        event.preventDefault();
        moveCursor(event.key === "ArrowDown" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, mic, phase, toggleRecording, moveCursor]);

  const setCuts = useCallback(
    (take: string, cuts: (CutReason | null)[]) => {
      client.setQueryData<RecordState>(["record", id], (state) =>
        state
          ? {
              ...state,
              exported: state.exported ? { ...state.exported, stale: true } : null,
              takes: state.takes.map((t) =>
                t.id === take
                  ? {
                      ...t,
                      words: t.words.map((w, i) => {
                        const { reason: _old, ...rest } = w;
                        const reason = cuts[i] ?? null;
                        return reason ? { ...rest, cut: true, reason } : { ...rest, cut: false };
                      }),
                    }
                  : t,
              ),
            }
          : state,
      );
      window.clearTimeout(saveTimers.current.get(take));
      saveTimers.current.set(
        take,
        window.setTimeout(() => {
          studio.saveCuts(id, take, cuts).catch((err: unknown) => setNotice({ tone: "bad", text: `Couldn't save your cuts: ${err instanceof Error ? err.message : String(err)}` }));
        }, 300),
      );
    },
    [client, id],
  );

  const removeTake = async (take: string, label: string) => {
    if (!window.confirm(`Delete ${label}? It moves to record/trash, so it can be recovered by hand.`)) return;
    try {
      setState(await studio.deleteTake(id, take));
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof Error ? err.message : String(err) });
    }
  };

  const recover = async (take: string) => {
    setPhase("saving");
    try {
      setState(await studio.finishTake(id, take));
      setNotice({ tone: "good", text: "Saved the take. Check it in Edit." });
    } catch (err) {
      setNotice({ tone: "bad", text: `Transcribing failed again: ${err instanceof Error ? err.message : String(err)}. The audio is still safe on disk.`, action: { label: "Try again", run: () => void recoverRef.current(take) } });
    } finally {
      setPhase("idle");
    }
  };
  const recoverRef = useRef(recover);
  recoverRef.current = recover;

  const transcribeAgain = async (take: string, label: string) => {
    if (!window.confirm(`Transcribe ${label} again? Its suggested cuts are made fresh, so any cuts you made by hand on this take are reset.`)) return;
    setWorking(take);
    try {
      setState(await studio.retranscribe(id, take));
      setNotice({ tone: "good", text: `Transcribed ${label} again. Check it in Edit.` });
    } catch (err) {
      setNotice({ tone: "bad", text: `Transcribing failed: ${err instanceof Error ? err.message : String(err)}`, action: { label: "Try again", run: () => void transcribeAgainRef.current(take, label) } });
    } finally {
      setWorking(null);
    }
  };
  const transcribeAgainRef = useRef(transcribeAgain);
  transcribeAgainRef.current = transcribeAgain;

  const changeCleanup = async (cleanup: Cleanup) => {
    try {
      setState(await studio.setCleanup(id, cleanup));
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof Error ? err.message : String(err) });
    }
  };

  const finish = async () => {
    if (!rec) return;
    if (missing > 0) {
      const beats = [...new Set(rec.script.words.filter((_, i) => coverage[i] === "missing").map((w) => w.beat))];
      if (!window.confirm(`${missing} script words aren't recorded yet (Beat ${beats.join(", ")}). Export the voice-over anyway?`)) return;
    }
    setExporting(true);
    try {
      setState(await studio.exportNarration(id, true));
      setNotice({ tone: "good", text: "Voice-over exported. Listen to the final file below the takes." });
      void client.invalidateQueries({ queryKey: ["video", id] });
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setExporting(false);
    }
  };

  if (error) return <Empty>{error.message}</Empty>;
  if (!rec) return <Empty>Loading the script…</Empty>;

  const takesByTime = [...rec.takes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const recorded = coverage.length ? Math.round(((coverage.length - missing) / coverage.length) * 100) : 0;
  const nextGap = () => {
    const after = coverage.findIndex((c, i) => c === "missing" && i > position);
    const first = after >= 0 ? after : coverage.indexOf("missing");
    if (first >= 0) setCursor(first);
  };
  const startWord = rec.script.words[position];

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <div className="flex min-w-0 items-center gap-4">
          <a href={hrefOf({ page: "video", id })} onClick={(event) => busy && event.preventDefault()} className="inline-flex shrink-0 items-center gap-1.5 text-xs text-dim transition-colors hover:text-ink">
            <ArrowLeftIcon size={13} /> Video
          </a>
          <span className="h-4 w-px shrink-0 bg-line" />
          <h1 className="truncate text-[15px] font-medium text-ink">Record the voice-over</h1>
          <span className="hidden items-center gap-3 md:flex">
            <span className="h-1 w-20 overflow-hidden rounded-full bg-surface-hi">
              <span className="block h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${recorded}%` }} />
            </span>
            <span className="font-mono text-[11px] text-dim">
              {recorded}% recorded · {rec.takes.length} take{rec.takes.length === 1 ? "" : "s"}
            </span>
            {/^done\b/.test(rec.stageState) ? <span className="font-mono text-[11px] text-good">stage done</span> : null}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" className="flex rounded-lg border border-line bg-panel p-0.5">
            {(["record", "edit"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                disabled={busy}
                onClick={() => setTab(t)}
                className={`h-8 rounded-md px-3.5 text-sm capitalize transition-colors disabled:opacity-40 ${tab === t ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button tone="primary" disabled={busy || exporting || rec.takes.length === 0} onClick={() => void finish()}>
            {exporting ? "Exporting…" : /^done\b/.test(rec.stageState) ? "Export again" : "Finish and export"}
          </Button>
        </div>
      </div>

      {notice ? (
        <div className={`rise flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${notice.tone === "bad" ? "border-bad/30 bg-bad/[0.06] text-bad" : notice.tone === "good" ? "border-good/25 bg-good/[0.06] text-good" : "border-line bg-panel text-muted"}`}>
          <span>{notice.text}</span>
          <span className="flex shrink-0 items-center gap-3">
            {notice.action ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => {
                  const run = notice.action!.run;
                  setNotice(null);
                  run();
                }}
              >
                {notice.action.label}
              </Button>
            ) : null}
            <button className="text-xs text-dim hover:text-ink" aria-label="Dismiss" onClick={() => setNotice(null)}>
              ✕
            </button>
          </span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-panel">
          {tab === "record" ? (
            <>
              <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-panel/90 px-3 py-2 backdrop-blur">
                <Button size="sm" onClick={() => setFontSize((s) => (store("font", String(s - 4)), Math.max(20, s - 4)))}>
                  A−
                </Button>
                <Button size="sm" onClick={() => setFontSize((s) => (store("font", String(s + 4)), Math.min(72, s + 4)))}>
                  A+
                </Button>
                <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                  <input
                    className="accent-[var(--color-accent)]"
                    type="checkbox"
                    checked={follow}
                    onChange={(event) => {
                      setFollow(event.target.checked);
                      store("follow", event.target.checked ? "on" : "off");
                    }}
                  />
                  Follow my voice
                </label>
                <Button size="sm" disabled={missing === 0 || busy} onClick={nextGap}>
                  Next unrecorded line
                </Button>
                <span className="ml-auto text-[11px] text-dim">Click a word to start there · ↑↓ move by paragraph · Space records</span>
              </div>
              <Teleprompter script={rec.script} coverage={coverage} cursor={position} recording={phase === "recording"} fontSize={fontSize} onCursor={(i) => phase !== "saving" && setCursor(i)} />
              {glitchLive ? (
                <div role="alert" className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
                  <span className="flex items-center gap-2.5 rounded-full border border-bad/50 bg-bad px-4 py-2 text-sm font-medium text-white shadow-lg">
                    <span className="size-2.5 animate-ping rounded-full bg-white" />
                    Mic glitch. Stop, check the cable, and redo this line.
                  </span>
                </div>
              ) : null}
              {phase === "countdown" ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-bg/60">
                  <span key={count} className="rise font-mono text-[140px] font-medium tabular-nums text-accent">{count}</span>
                </div>
              ) : null}
            </>
          ) : (
            <EditView videoId={id} script={rec.script} takes={rec.takes} focusTake={focusTake} cleanup={rec.cleanup} onCuts={setCuts} />
          )}
        </div>

        <aside className="scrollbar-thin flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto">
          <section className="rounded-xl border border-line bg-panel p-3">
            <h2 className="eyebrow mb-3">Microphone</h2>
            {canRecord ? (
              <MicPanel
                mic={mic}
                devices={devices}
                selected={mic?.deviceId ?? null}
                disabled={busy}
                error={micError}
                onTurnOn={() => void openMic(stored("mic"))}
                onSelect={(deviceId) => void openMic(deviceId)}
              />
            ) : (
              <p className="text-xs text-warn">The browser only allows the microphone on this Mac's own address. Open the studio at http://localhost:5173 to record.</p>
            )}
          </section>

          <section className={`rounded-xl border p-3 ${phase === "recording" ? "border-bad/60 bg-bad/10" : "border-line bg-panel"}`}>
            {phase === "recording" ? (
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-bad">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-bad" /> Recording
                </span>
                <span className="font-mono tabular-nums text-ink">{clock(elapsed)}</span>
              </div>
            ) : (
              <p className="mb-2 text-xs text-muted">
                {startWord ? (
                  <>
                    Starts at Beat {startWord.beat}: <span className="text-ink">“{rec.script.words.slice(position, position + 6).map((w) => w.text).join(" ")}…”</span>. If you mess up, pause and say the line again: the restart gets cut for you.
                  </>
                ) : null}
              </p>
            )}
            <Button
              tone={phase === "recording" ? "danger" : "primary"}
              className="w-full"
              disabled={!mic || phase === "saving" || tab !== "record"}
              onClick={toggleRecording}
            >
              {phase === "saving" ? `Transcribing the take (about ${Math.max(3, Math.ceil(elapsed / 7))} s)…` : phase === "recording" ? "■ Stop and save" : phase === "countdown" ? "Cancel" : tab !== "record" ? "Switch to Record to record" : "● Record (Space)"}
            </Button>
          </section>

          {rec.unfinished.length > 0 && phase === "idle" ? (
            <section className="rounded-xl border border-warn/40 bg-warn/5 p-3">
              <h2 className="eyebrow mb-2 !text-warn">Unfinished take</h2>
              <p className="mb-2 text-xs text-muted">A take stopped without being saved (the tab closed or the connection dropped). Its audio is on disk.</p>
              {rec.unfinished.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>{clock(u.seconds)} recorded</span>
                  <span className="flex gap-1">
                    <Button size="sm" onClick={() => void recover(u.id)}>
                      Recover
                    </Button>
                    <Button size="sm" onClick={() => void removeTake(u.id, "this unfinished take")}>
                      Discard
                    </Button>
                  </span>
                </div>
              ))}
            </section>
          ) : null}

          <section className="rounded-xl border border-line bg-panel p-3">
            <h2 className="eyebrow mb-3">Takes</h2>
            {takesByTime.length === 0 ? <p className="text-xs text-muted">None yet.</p> : null}
            <ul className="flex flex-col gap-1.5">
              {takesByTime.map((take, n) => {
                const mapped = take.words.filter((w) => w.idx !== null && !w.cut);
                const first = mapped[0] ? rec.script.words[mapped[0].idx!]?.beat : null;
                const last = mapped.at(-1) ? rec.script.words[mapped.at(-1)!.idx!]?.beat : null;
                const kept = take.words.filter((w) => !w.cut).length;
                const glitches = take.glitches?.length ?? 0;
                return (
                  <li key={take.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2 py-1.5 text-xs">
                    <button
                      className="min-w-0 text-left hover:text-accent"
                      disabled={busy}
                      onClick={() => {
                        setTab("edit");
                        setFocusTake(take.id);
                      }}
                    >
                      <span className="font-semibold">Take {n + 1}</span> · {clock(take.duration)} ·{" "}
                      {first ? (first === last ? `Beat ${first}` : `Beats ${first}–${last}`) : "nothing kept"}
                      <span className="block text-dim">
                        {kept} of {take.words.length} words kept
                      </span>
                      {glitches ? (
                        <span className="mt-0.5 flex items-center gap-1 text-bad">
                          <span className="size-1.5 rounded-full bg-bad" /> Mic glitched in {glitches} place{glitches > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </button>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <button
                        className="grid size-6 place-items-center rounded text-dim hover:bg-surface-hi hover:text-ink disabled:opacity-40"
                        disabled={busy || working !== null}
                        title="Transcribe this take again"
                        aria-label={`Transcribe take ${n + 1} again`}
                        onClick={() => void transcribeAgain(take.id, `take ${n + 1}`)}
                      >
                        <RefreshIcon size={12} className={working === take.id ? "animate-spin" : ""} />
                      </button>
                      <button className="grid size-6 place-items-center rounded text-dim hover:bg-surface-hi hover:text-bad" disabled={busy} title="Delete this take" aria-label={`Delete take ${n + 1}`} onClick={() => void removeTake(take.id, `take ${n + 1}`)}>
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-line bg-panel p-3">
            <h2 className="eyebrow mb-2">Background noise</h2>
            <div role="radiogroup" aria-label="Background noise cleanup" className="mb-2 grid grid-cols-3 rounded-lg border border-line bg-surface p-0.5">
              {CLEANUP.map((option) => (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={rec.cleanup.level === option.id}
                  disabled={busy || exporting}
                  onClick={() => void changeCleanup(option.id)}
                  className={`h-7 rounded-md text-xs transition-colors disabled:opacity-40 ${rec.cleanup.level === option.id ? "bg-surface-hi text-ink" : "text-muted hover:text-ink"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {rec.cleanup.error
                ? null
                : rec.cleanup.level === "off"
                  ? "Takes play and export as recorded. Turn it on to remove fan hum, hiss and room noise."
                  : rec.cleanup.pending
                    ? `Cleaning ${rec.cleanup.pending} take${rec.cleanup.pending > 1 ? "s" : ""}… Playback switches over as each one is done.`
                    : `Playback and export use the cleaned audio. Switch to Off and back to compare.`}
            </p>
            {rec.cleanup.error ? <p className="text-xs text-bad">Cleanup failed: {rec.cleanup.error}</p> : null}
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              {rec.cleanup.engine === "deepfilternet" ? (
                "Using DeepFilterNet, a speech model running on this Mac."
              ) : (
                <>
                  Using ffmpeg's basic filter. For the much better DeepFilterNet model (free, 28 MB, runs on this Mac), run <code className="font-mono text-muted">pnpm setup:denoise</code> once.
                </>
              )}{" "}
              Transcripts always come from the original audio.
            </p>
          </section>

          {rec.exported ? (
            <section className="rounded-xl border border-line bg-panel p-3">
              <h2 className="eyebrow mb-2">Exported voice-over</h2>
              {rec.exported.stale ? (
                <p className="mb-2 text-xs text-warn">Out of date: you've changed takes or the noise setting since this export. Press Export again.</p>
              ) : (
                <p className="mb-2 text-xs text-muted">
                  {clock(rec.exported.duration)} · levelled to YouTube loudness{rec.exported.cleanup !== "off" ? ` · noise cleanup ${rec.exported.cleanup}` : ""} · saved as record/narration.wav with word timings and captions.
                </p>
              )}
              <audio controls preload="none" className="w-full" src={`/videofiles/${id}/record/narration.wav?v=${encodeURIComponent(rec.exported.at)}`} />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
