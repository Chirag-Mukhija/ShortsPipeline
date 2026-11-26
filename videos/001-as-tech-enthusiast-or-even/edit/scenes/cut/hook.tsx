// Video 001's hook (0:00–0:08), adapted from the kit's title-card for the creator's Beat 1 note: the two context notes pop in, then go up and blur out while the question pops in word by word, with "learning" marked last.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "@kit/contract";
import { clamp01, cueAt, enter, useT } from "@kit/motion";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const QUESTION = ["What", "are", "you", "even", "learning?"];
const NOTES = [
  { text: "switching tech", word: "switching", x: -330, y: -40, tilt: -4 },
  { text: "AI writes the code", word: "AI", x: 300, y: 30, tilt: 3 },
];

const Hook: FC<SceneProps<Record<string, unknown>>> = ({ style, width, height, duration, cues }) => {
  const { t, frame, fps } = useT();
  // Pencil boil: lines re-jitter every 4 frames, like the rest of the hand-drawn video.
  const boil = (k: number) => Math.sin(k * 91.7 + Math.floor(frame / 4) * 12.9) * 0.6;
  const qAt = cueAt(cues, "what", 4.4);
  const out = clamp01((t - (qAt - 0.15)) / 0.45);
  // Word cues: each word of the question in order, each matched after the previous one.
  let from = 0;
  const lands = QUESTION.map((w, i) => {
    const k = cues.findIndex((c, j) => j >= from && norm(c.word) === norm(w));
    if (k >= 0) from = k + 1;
    return k >= 0 ? cues[k]!.at - 0.08 : qAt + i * 0.25;
  });
  const markAt = Math.min(lands[4]! + 0.55, duration - 0.8);
  const mark = clamp01(enter({ ...style, motion: "calm" }, frame, fps, markAt, 0.45));
  const asideAt = cueAt(cues, "don't", duration - 1.6);
  const aside = enter(style, frame, fps, asideAt, 0.5);
  // A fast, word-motivated camera from frame 0 (the creator's 2026-11-17 note): a push, then a jolt in on the question.
  const zoom = 1 + 0.035 * clamp01(t / qAt) + 0.06 * enter(style, frame, fps, qAt - 0.1, 0.35) + 0.02 * clamp01((t - qAt) / (duration - qAt));
  const size = Math.round(Math.min(132, width / 12.5));

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${style.muted}55 2px, transparent 2.4px)`, backgroundSize: `${Math.round(width / 40)}px ${Math.round(width / 40)}px`, opacity: 0.55 }} />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, alignItems: "center", justifyContent: "center" }}>
        {NOTES.map((n, i) => {
          const p = enter(style, frame, fps, cueAt(cues, n.word, 0.8 + i * 1.4) - 0.1, 0.5);
          if (p <= 0 || out >= 1) return null;
          return (
            <div
              key={n.text}
              style={{
                position: "absolute",
                transform: `translate(${n.x}px, ${n.y - 160 * out}px) rotate(${n.tilt + boil(i)}deg) scale(${0.6 + 0.4 * p})`,
                opacity: clamp01(p * 1.5) * (1 - out),
                filter: out > 0 ? `blur(${out * 12}px)` : undefined,
                fontFamily: style.display,
                fontSize: 96,
                fontWeight: 700,
                color: style.ink,
                padding: "14px 34px",
                border: `4px solid ${style.ink}`,
                borderRadius: style.radius,
                background: style.surface,
                whiteSpace: "nowrap",
              }}
            >
              {n.text}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: "0 0.28em", fontFamily: style.display, fontWeight: 700, fontSize: size, color: style.ink, whiteSpace: "nowrap" }}>
          {QUESTION.map((w, i) => {
            const p = enter(style, frame, fps, lands[i]!, 0.42);
            const isMark = i === QUESTION.length - 1;
            return (
              <span key={i} style={{ position: "relative", display: "inline-block", opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 40}px) scale(${0.4 + 0.6 * p})`, transformOrigin: "50% 80%", color: isMark && mark > 0 ? style.accent : style.ink }}>
                {w}
                {isMark && mark > 0 ? (
                  <span style={{ position: "absolute", left: "-0.04em", right: "0.3em", top: "1.02em", height: "0.08em", borderRadius: "0.04em", background: style.accent, transform: `scaleX(${mark}) rotate(${-1.4 + boil(9) * 0.6}deg)`, transformOrigin: "0 50%" }} />
                ) : null}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      {aside > 0 ? (
        <div style={{ position: "absolute", right: width * 0.1, bottom: height * 0.14, fontFamily: style.display, fontSize: 62, color: style.muted, transform: `rotate(${-3 + boil(4)}deg) translateY(${(1 - aside) * 20}px)`, opacity: clamp01(aside * 1.5) }}>
          (me neither)
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default Hook;
