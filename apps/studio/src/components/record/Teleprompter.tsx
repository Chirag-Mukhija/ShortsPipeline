// The teleprompter: the script's spoken lines, large, with your place marked. While recording it follows your voice; otherwise it shows what's recorded and what's still missing.
import type { Coverage, RecordScript } from "@clipforge/schema";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  script: RecordScript;
  coverage: Coverage[];
  cursor: number;
  recording: boolean;
  fontSize: number;
  onCursor: (i: number) => void;
};

export function Teleprompter({ script, coverage, cursor, recording, fontSize, onCursor }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const beats = useMemo(() => {
    const out: { n: number; name: string; paras: { id: number; words: typeof script.words }[] }[] = [];
    for (const word of script.words) {
      let beat = out.at(-1);
      if (!beat || beat.n !== word.beat) {
        beat = { n: word.beat, name: script.beats.find((b) => b.n === word.beat)?.name ?? "", paras: [] };
        out.push(beat);
      }
      let para = beat.paras.at(-1);
      if (!para || para.id !== word.para) {
        para = { id: word.para, words: [] };
        beat.paras.push(para);
      }
      para.words.push(word);
    }
    return out;
  }, [script]);

  // Decision: your current line sits a third of the way down, so the next few lines are always visible below it.
  useEffect(() => {
    const container = box.current;
    const word = container?.querySelector<HTMLElement>(`[data-i="${cursor}"]`);
    if (!container || !word) return;
    const target = word.offsetTop - container.clientHeight * 0.3;
    if (Math.abs(container.scrollTop - target) > fontSize * 0.75) container.scrollTo({ top: target, behavior: "smooth" });
  }, [cursor, fontSize]);

  const style = (i: number): string => {
    if (i === cursor) return "rounded bg-accent text-accent-ink";
    if (recording) return i < cursor ? "text-dim" : "text-ink";
    const state = coverage[i];
    if (state === "done") return "text-muted";
    if (state === "reworded") return "text-dim italic";
    return "text-ink underline decoration-bad/60 decoration-2 underline-offset-[0.25em]";
  };

  return (
    <div ref={box} className="scrollbar-thin relative h-full overflow-y-auto px-4 pb-[60vh] pt-[20vh] md:px-10" style={{ fontSize, lineHeight: 1.55 }}>
      <div className="mx-auto max-w-[920px]">
        {beats.map((beat) => (
          <section key={beat.n} className="mb-[1.2em]">
            <h3 className="mb-[0.4em] font-sans text-xs font-semibold uppercase tracking-widest text-accent/80">
              Beat {beat.n} · {beat.name}
            </h3>
            {beat.paras.map((para) => (
              <p key={para.id} className="mb-[0.7em] font-display font-medium">
                {para.words.map((word) => (
                  <span key={word.i}>
                    <span data-i={word.i} onClick={() => onCursor(word.i)} className={`cursor-pointer px-[0.06em] transition-colors ${style(word.i)}`}>
                      {word.text}
                    </span>{" "}
                  </span>
                ))}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
