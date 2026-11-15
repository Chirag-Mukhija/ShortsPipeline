// Cut by text: every take as one document in script order, suggested cuts struck through, mic glitches marked, click a word to play from it, select words and press Delete to cut or restore.
import { buildTimeline, documentRuns, placeWords, refineSegments, type CleanupState, type CutReason, type RecordScript, type Take } from "@clipforge/schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player } from "../../record/player";
import { Button } from "../ui";

type Props = {
  videoId: string;
  script: RecordScript;
  takes: Take[];
  focusTake: string | null;
  cleanup: CleanupState;
  onCuts: (take: string, cuts: (CutReason | null)[]) => void;
};

const REASONS: Record<CutReason, { label: string; color: string }> = {
  retake: { label: "restarted line", color: "text-warn" },
  filler: { label: "filler", color: "text-muted" },
  redone: { label: "redone in a later take", color: "text-info" },
  outside: { label: "before or after your script lines", color: "text-dim" },
  you: { label: "cut by you", color: "text-bad" },
};

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const key = (take: string, at: number) => `${take}:${at}`;
const cutsOf = (take: Take) => take.words.map((w) => (w.cut ? (w.reason ?? "you") : null));

const glitchy = (take: Take, i: number) => {
  const w = take.words[i]!;
  return (take.glitches ?? []).some(([from, to]) => w.end > from && w.start < to);
};

export function EditView({ videoId, script, takes, focusTake, cleanup, onCuts }: Props) {
  const player = useMemo(() => new Player(videoId), [videoId]);
  useEffect(() => () => player.close(), [player]);
  // Decision: a take plays its cleaned copy as soon as that copy exists, and the original until then.
  const files = useMemo(() => {
    const ready = new Set(cleanup.ready);
    return new Map(takes.map((t) => [t.id, cleanup.level !== "off" && ready.has(t.id) ? `${t.id}.clean-${cleanup.engine}-${cleanup.level}` : t.id]));
  }, [takes, cleanup]);
  player.setFiles(files);
  const doc = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);
  const undo = useRef<Map<string, (CutReason | null)[]>[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  useEffect(() => {
    for (const take of takes) {
      player.load(take.id).then(
        () => setLoaded((n) => n + 1),
        (error: unknown) => setLoadError(error instanceof Error ? error.message : String(error)),
      );
    }
  }, [player, takes, files]);

  const takeMap = useMemo(() => new Map(takes.map((t) => [t.id, t])), [takes]);
  // Decision: takes with nothing left in them (fully redone) sit in a collapsed section, so they don't interrupt the read-through.
  const used = useMemo(() => takes.filter((t) => t.words.some((w) => !w.cut)), [takes]);
  const unused = useMemo(() => takes.filter((t) => t.words.every((w) => w.cut)), [takes]);
  const runs = useMemo(() => documentRuns(used), [used]);
  const unusedRuns = useMemo(() => documentRuns(unused), [unused]);
  // `loaded` is in the deps on purpose: cut points are refined again once each take's loudness envelope has loaded.
  const segments = useMemo(() => refineSegments(buildTimeline(takes), takeMap, player.envelopes), [takes, takeMap, player, loaded]);
  const placed = useMemo(() => placeWords(segments, takeMap), [segments, takeMap]);
  const order = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const run of runs) for (let i = run.first; i <= run.last; i++) map.set(key(run.take.id, i), n++);
    return map;
  }, [runs]);
  const placedOrder = useMemo(() => placed.words.map((w) => order.get(key(w.take, w.at)) ?? 0), [placed, order]);
  const takeNumber = useMemo(() => new Map([...takes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((t, i) => [t.id, i + 1])), [takes]);

  const current = useMemo(() => {
    let lo = 0;
    let hi = placed.words.length - 1;
    let found = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (placed.words[mid]!.start <= time + 1e-6) {
        found = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    const word = placed.words[found];
    return word ? key(word.take, word.at) : null;
  }, [placed, time]);

  const stop = useCallback(() => {
    player.stop();
    setPlaying(false);
  }, [player]);

  const play = useCallback(
    (from: number) => {
      setPlaying(true);
      void player.play(segments, placed.starts, takeMap, from, setTime, () => {
        setPlaying(false);
        setTime(0);
      });
    },
    [player, segments, placed, takeMap],
  );

  // Edits change the timeline under the playhead, so playback stops rather than play stale audio.
  useEffect(() => stop, [segments, stop]);

  useEffect(() => {
    if (!playing || !current) return;
    const el = doc.current?.querySelector<HTMLElement>(`[data-key="${current}"]`);
    const box = doc.current?.getBoundingClientRect();
    const rect = el?.getBoundingClientRect();
    if (el && box && rect && (rect.top < box.top + 40 || rect.bottom > box.bottom - 40)) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current, playing]);

  useEffect(() => {
    if (!focusTake) return;
    doc.current?.querySelector<HTMLElement>(`[data-take="${focusTake}"]`)?.scrollIntoView({ block: "center" });
  }, [focusTake]);

  const seekTo = (take: string, at: number) => {
    const o = order.get(key(take, at));
    if (o === undefined) return;
    const index = placedOrder.findIndex((p) => p >= o);
    const t = index >= 0 ? placed.words[index]!.start : placed.duration;
    setTime(t);
    if (playing) play(t);
  };

  const selectedWords = (): { take: string; at: number }[] => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !doc.current) return [];
    return [...doc.current.querySelectorAll<HTMLElement>("[data-at]")]
      .filter((el) => selection.containsNode(el, true))
      .map((el) => ({ take: el.dataset.take!, at: Number(el.dataset.at) }));
  };

  const apply = (changes: Map<string, (CutReason | null)[]>) => {
    const before = new Map<string, (CutReason | null)[]>();
    for (const [take, cuts] of changes) {
      const existing = takeMap.get(take);
      if (!existing) continue;
      before.set(take, cutsOf(existing));
      onCuts(take, cuts);
    }
    undo.current.push(before);
    if (undo.current.length > 100) undo.current.shift();
    setUndoCount(undo.current.length);
  };

  const toggleSelection = () => {
    const words = selectedWords();
    if (words.length === 0) return;
    const allCut = words.every((w) => takeMap.get(w.take)?.words[w.at]?.cut);
    const changes = new Map<string, (CutReason | null)[]>();
    for (const w of words) {
      const take = takeMap.get(w.take);
      if (!take) continue;
      const cuts = changes.get(w.take) ?? cutsOf(take);
      cuts[w.at] = allCut ? null : (cuts[w.at] ?? "you");
      changes.set(w.take, cuts);
    }
    apply(changes);
    window.getSelection()?.removeAllRanges();
    setHasSelection(false);
  };

  const undoLast = () => {
    const last = undo.current.pop();
    setUndoCount(undo.current.length);
    if (last) for (const [take, cuts] of last) onCuts(take, cuts);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest("input, textarea, select, button")) return;
      if (event.key === " ") {
        event.preventDefault();
        if (playing) stop();
        else play(time >= placed.duration ? 0 : time);
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        toggleSelection();
      } else if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        undoLast();
      }
    };
    const onSelection = () => setHasSelection(!(window.getSelection()?.isCollapsed ?? true));
    window.addEventListener("keydown", onKey);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("selectionchange", onSelection);
    };
  });

  if (takes.length === 0) {
    return <p className="p-8 text-center text-sm text-muted">Nothing recorded yet. Record a take, and it shows up here as text you can cut.</p>;
  }

  let lastTake: string | null = null;
  let lastBeat = 0;
  const renderRuns = (list: typeof runs, beats: boolean) =>
    list.map((run) => {
      const parts = [];
      const beat = script.words[Math.max(0, Math.floor(run.key))]?.beat ?? lastBeat;
      if (beats && beat > lastBeat) {
        lastBeat = beat;
        parts.push(
          <div key={`beat-${run.take.id}-${run.first}`} className="mb-1 mt-5 font-sans text-xs font-semibold uppercase tracking-widest text-accent/80">
            Beat {beat} · {script.beats.find((b) => b.n === beat)?.name}
          </div>,
        );
      }
      if (run.take.id !== lastTake) {
        lastTake = run.take.id;
        parts.push(
          <span key={`take-${run.take.id}-${run.first}`} data-take={run.take.id} className="mr-1.5 select-none rounded-md bg-surface-hi px-1.5 py-0.5 align-middle font-sans text-[10px] text-muted">
            Take {takeNumber.get(run.take.id)}
          </span>,
        );
      }
      for (let i = run.first; i <= run.last; i++) {
        const w = run.take.words[i]!;
        const k = key(run.take.id, i);
        const reason = w.cut ? REASONS[w.reason ?? "you"] : null;
        const cls =
          k === current && (playing || time > 0)
            ? "rounded bg-accent text-accent-ink"
            : reason
              ? `${reason.color} line-through decoration-1 opacity-70`
              : w.idx === null
                ? "text-ink underline decoration-info decoration-dotted underline-offset-4"
                : "text-ink";
        const glitch = glitchy(run.take, i) ? "bg-bad/15 rounded-sm" : "";
        parts.push(
          <span key={k}>
            <span data-key={k} data-take={run.take.id} data-at={i} title={reason ? `Cut: ${reason.label}` : glitch ? "The mic glitched here: listen, and redo the line if you hear it" : undefined} className={`cursor-text px-[0.05em] ${cls} ${glitch}`}>
              {w.text}
            </span>{" "}
          </span>,
        );
      }
      return parts;
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <Button tone="primary" className="w-24" onClick={() => (playing ? stop() : play(time >= placed.duration ? 0 : time))}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </Button>
        <span className="font-mono text-sm tabular-nums text-muted">
          {clock(time)} / {clock(placed.duration)}
        </span>
        <span className="mx-1 h-5 w-px bg-line" />
        <Button size="sm" disabled={!hasSelection} onClick={toggleSelection} title="Delete or Backspace">
          Cut / restore selection
        </Button>
        <Button size="sm" disabled={undoCount === 0} onClick={undoLast} title="Cmd+Z">
          Undo
        </Button>
        <span className="ml-auto text-xs text-dim">Click a word to play from it · select words + Delete to cut or restore · Space plays</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line px-4 py-2 text-[11px]">
        {(Object.keys(REASONS) as CutReason[]).map((reason) => (
          <span key={reason} className={`${REASONS[reason].color} line-through decoration-1`}>
            <span className="no-underline">{REASONS[reason].label}</span>
          </span>
        ))}
        <span className="text-ink underline decoration-info decoration-dotted underline-offset-4">your own words (not in the script)</span>
        <span className="rounded-sm bg-bad/15 px-1 text-ink">mic glitched</span>
        <span className="text-dim">pauses over 0.7 s are shortened automatically</span>
      </div>
      {loadError ? <p className="px-4 py-2 text-xs text-bad">{loadError}</p> : null}
      <div
        ref={doc}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6 text-[19px] leading-[1.9] md:px-10"
        onMouseUp={(event) => {
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed) return;
          const el = (event.target as HTMLElement).closest<HTMLElement>("[data-at]");
          if (el) seekTo(el.dataset.take!, Number(el.dataset.at));
        }}
      >
        <div className="mx-auto max-w-[920px]">
          {renderRuns(runs, true)}
          {unused.length > 0 ? (
            <details className="mt-8 border-t border-line pt-3 text-[16px]">
              <summary className="cursor-pointer font-sans text-xs text-muted">
                {unused.length} unused take{unused.length > 1 ? "s" : ""}: everything in {unused.length > 1 ? "them was" : "it was"} cut or redone later. Open to bring a line back.
              </summary>
              <div className="mt-2">{renderRuns(unusedRuns, false)}</div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
