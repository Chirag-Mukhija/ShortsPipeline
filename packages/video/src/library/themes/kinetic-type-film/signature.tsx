// Kinetic type signature moments: colour-block cuts, the z-break into a letter, word-to-word morphs, words that act out their meaning, and a beat-locked type grid for music-only films.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { useTime } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { BLOCK, M, RED, WHITE, fitSize, voice, type Bg, type Voice } from "./theme";
import { EXPO, SWAP, emph, flashOn, shake, snap, span } from "./motion";
import { Grain, Spot, wght } from "./type";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ---------- BlockCut ----------

export type Cut = {
  at: number;
  bg: Bg;
  text?: string;
  v?: Voice;
  size?: number;
  // wipe: a 10 f hard-edged wipe with the word pinned in place; cut: instant, on the beat, with a 2 f flash.
  kind?: "wipe" | "cut";
  from?: "left" | "right" | "top" | "bottom";
};

const inset = (p: number, from: Cut["from"]) => {
  const r = `${(1 - p) * 100}%`;
  return from === "right" ? `inset(0 0 0 ${r})` : from === "top" ? `inset(0 0 ${r} 0)` : from === "bottom" ? `inset(${r} 0 0 0)` : `inset(0 ${r} 0 0)`;
};

// Full-frame colour blocks that change per beat, each with its word pinned: wiped on in 10 f with an accent edge riding the wipe, or hard cut with a 2 f flash.
export const BlockCut: FC<{ cuts: Cut[] }> = ({ cuts }) => {
  const { t } = useTime();
  return (
    <>
      {cuts.map((c, i) => {
        const kind = c.kind ?? "wipe";
        const p = kind === "cut" ? (t >= c.at ? 1 : 0) : span(t, c.at, 10, SWAP, 0);
        if (p <= 0) return null;
        const B = BLOCK[c.bg];
        const size = c.size ?? fitSize(c.text ?? "", W - 2 * M, 300);
        const vert = c.from === "top" || c.from === "bottom";
        const edge = (c.from === "right" || c.from === "bottom" ? 1 - p : p) * (vert ? H : W);
        const sn = kind === "cut" ? snap(t, c.at + 3 / FPS) : { o: 1, s: 1, y: 0 };
        return (
          <AbsoluteFill key={i} style={{ clipPath: inset(p, c.from) }}>
            <AbsoluteFill style={{ backgroundColor: B.bg }} />
            <Grain opacity={0.05} />
            {c.text && (
              <Spot x={W / 2} y={H / 2 + sn.y * size} transform={`scale(${sn.s})`} style={{ ...voice(c.v ?? "hit", size), color: B.ink, opacity: sn.o }}>
                {c.text}
              </Spot>
            )}
            {p < 1 && <div style={vert ? { position: "absolute", left: 0, right: 0, top: edge - 7, height: 14, background: B.accent } : { position: "absolute", top: 0, bottom: 0, left: edge - 7, width: 14, background: B.accent }} />}
            {kind === "cut" && flashOn(t, c.at) ? <AbsoluteFill style={{ backgroundColor: i % 2 ? WHITE : B.accent }} /> : null}
          </AbsoluteFill>
        );
      })}
    </>
  );
};

// ---------- ZBreak ----------

export type ZBreakProps = {
  text: string;
  // Index of the letter the camera flies into; pick one with ink at its centre (I, H, E, T, l).
  letter: number;
  // The word snaps in here.
  inAt: number;
  // The push starts here and fills the frame `dur` seconds later.
  at: number;
  dur?: number;
  size?: number;
  color?: string;
  // The letter's colour, which becomes the next scene's colour.
  ink?: string;
  peak?: number;
  // Nudges the zoom point inside the letter, in em.
  ox?: number;
  oy?: number;
  // What appears on the filled frame.
  children?: ReactNode;
};

// The once-per-film z-plane break: the camera pushes into one letter until its ink fills the frame and becomes the next scene.
// The zoom point is the target letter's centre, found without measuring: nested percentage translates of invisible copies of the text
// before (L) and after (R) the letter put the origin at (L − R) / 2 from the word's centre, which is exactly where that letter sits.
export const ZBreak: FC<ZBreakProps> = ({ text, letter, inAt, at, dur = 0.7, size = 300, color = WHITE, ink = RED, peak = 90, ox = 0, oy = 0, children }) => {
  const { t } = useTime();
  const L = text.slice(0, letter);
  const T = text[letter] ?? "";
  const R = text.slice(letter + 1);
  const e = interpolate(t, [at, at + dur], [0, 1], { ...CLAMP, easing: Easing.in(Easing.quad) });
  const s = Math.pow(peak, e);
  const fill = interpolate(e, [0.82, 0.97], [0, 1], CLAMP);
  const done = t >= at + dur;
  const sn = snap(t, inAt);
  const base: CSSProperties = { ...voice("hit", size), whiteSpace: "pre", position: "absolute", left: 0, top: 0 };
  const ghost: CSSProperties = { ...base, color: "transparent" };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {!done && sn.o > 0 && (
        <div style={{ position: "absolute", left: W / 2, top: H / 2, width: 0, height: 0, transform: `translateY(${sn.y * size}px) scale(${sn.s})`, opacity: sn.o }}>
          <div style={{ ...ghost, transform: "translateX(50%)" }}>
            {L}
            <div style={{ ...ghost, transform: "translateX(-50%)" }}>
              {R}
              <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transform: `translate(${ox * size}px, ${oy * size}px) scale(${s}) rotate(${e * 3}deg) translate(${-ox * size}px, ${-oy * size}px)`, transformOrigin: "0 0" }}>
                <div style={{ ...ghost, transform: "translateX(-50%)" }}>
                  {L}
                  <div style={{ ...ghost, transform: "translateX(50%)" }}>
                    {R}
                    <div style={{ ...base, color, transform: "translate(-50%, -50%)" }}>
                      {L}
                      <span style={{ color: ink }}>{T}</span>
                      {R}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {fill > 0 && <AbsoluteFill style={{ backgroundColor: ink, opacity: done ? 1 : fill }} />}
      {done && children}
    </AbsoluteFill>
  );
};

// ---------- TextMorph ----------

// One word turning into the next: each letter of the old word sinks and shears into the baseline while the new word's letters rise out of it, 1 f apart, 10 f in all.
export const TextMorph: FC<{ words: string[]; at: number[]; size?: number; y?: number; color?: string; accentLast?: boolean; v?: Voice }> = ({ words, at, size = 260, y = H / 2, color = WHITE, accentLast = true, v = "hit" }) => {
  const { t } = useTime();
  const k = at.reduce((acc, c, i) => (t >= c - 3 / FPS ? i : acc), -1);
  if (k < 0) return null;
  const sn = snap(t, at[0]!);
  const layer = (word: string, dir: "in" | "out" | "still", cue: number, isLast: boolean) => {
    const sz = Math.min(size, fitSize(word, W - 2 * M, size));
    return (
      <Spot x={W / 2} y={y} style={{ ...voice(v, sz), color: isLast && accentLast ? RED : color }} transform={k === 0 ? `translateY(${sn.y * sz}px) scale(${sn.s})` : ""}>
        {[...word].map((ch, j) => {
          const m = dir === "still" ? 1 : span(t, cue + j / FPS, 8, SWAP);
          const q = dir === "out" ? 1 - m : m;
          return (
            <span
              key={j}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                transformOrigin: "50% 86%",
                transform: `scaleY(${Math.max(0.001, q)}) skewX(${(1 - q) * (dir === "out" ? -18 : 18)}deg)`,
                opacity: k === 0 && dir === "still" ? sn.o : q > 0.02 ? 1 : 0,
              }}
            >
              {ch}
            </span>
          );
        })}
      </Spot>
    );
  };
  const cue = at[k]!;
  const done = k === 0 || span(t, cue + words[k]!.length / FPS, 8, SWAP) >= 1;
  return (
    <>
      {k > 0 && !done && layer(words[k - 1]!, "out", cue, false)}
      {layer(words[k]!, k === 0 || done ? "still" : "in", cue, k === words.length - 1)}
    </>
  );
};

// ---------- MeaningGag ----------

export type Gag = "shrink" | "stretch" | "heavy" | "split" | "fast";

// A word whose shape acts out its meaning on the spoken cue: shrink shrinks and thins, stretch pulls wide and thin, heavy thickens, drops and lands with a shake, split tears in two, fast whips in sheared with smears.
export const MeaningGag: FC<{ word: string; behavior: Gag; at: number; x?: number; y?: number; size?: number; color?: string; accent?: string; max?: number }> = ({ word, behavior, at, x = W / 2, y = H / 2, size = 200, color = WHITE, accent = RED, max = 2 }) => {
  const { t } = useTime();
  const act = at + 0.18;
  const sn = snap(t, at);
  if (sn.o <= 0) return null;
  const g = span(t, act, 16, EXPO, 0);
  const base: CSSProperties = { ...voice("hit", size), color, opacity: sn.o };
  const lift = sn.y * size;

  if (behavior === "shrink") {
    return (
      <Spot x={x} y={y + lift} transform={`scale(${sn.s * (1 - 0.68 * g)})`} style={{ ...base, ...wght(900 - 600 * g), letterSpacing: `${-0.045 + 0.08 * g}em`, color: g > 0.5 ? accent : color }}>
        {word}
      </Spot>
    );
  }
  if (behavior === "stretch") {
    const st = span(t, act, 14, Easing.out(Easing.back(2.2)), 0);
    return (
      <Spot x={x} y={y + lift} transform={`scale(${sn.s}) scaleX(${1 + (max - 1) * st}) scaleY(${1 - 0.12 * st})`} style={{ ...base, ...wght(900 - 500 * g), color: g > 0.5 ? accent : color }}>
        {word}
      </Spot>
    );
  }
  if (behavior === "heavy") {
    const drop = interpolate(t, [act, act + 9 / FPS], [0, 1], { ...CLAMP, easing: Easing.in(Easing.quad) });
    const land = act + 9 / FPS;
    const u = (t - land) * FPS;
    const squash = u < 0 ? 0 : u < 3 ? u / 3 : interpolate(u, [3, 12], [1, 0], { ...CLAMP, easing: Easing.out(Easing.back(3)) });
    const sh = shake(t, land, 18);
    return (
      <Spot x={x + sh.x} y={y - size * 0.9 * (1 - drop) + lift + sh.y} origin="50% 100%" transform={`scale(${sn.s}) scaleX(${1 + 0.22 * squash}) scaleY(${1 - 0.28 * squash})`} style={{ ...base, ...wght(300 + 600 * drop), color: drop >= 1 ? accent : color }}>
        {word}
      </Spot>
    );
  }
  if (behavior === "split") {
    const half = (top: boolean) => (
      <Spot x={x + (top ? -1 : 1) * 70 * g} y={y + lift + (top ? -1 : 1) * 14 * g} transform={`scale(${sn.s})`} style={{ ...base, color: top ? color : accent, clipPath: top ? "inset(-20% -5% 50% -5%)" : "inset(50% -5% -20% -5%)" }}>
        {word}
      </Spot>
    );
    return (
      <>
        {half(true)}
        {half(false)}
      </>
    );
  }
  // fast: whips in from off-frame left with shear and two smears, stops dead, the shear snaps back.
  const p = span(t, at, 6, EXPO);
  const sx = (1 - p) * -(W * 0.9);
  const shear = interpolate(t, [at, at + 6 / FPS, at + 10 / FPS], [-28, -28, 0], CLAMP);
  return (
    <>
      {[2, 1].map((k) => (
        <Spot key={k} x={x + sx - (1 - p) * k * 260 - k * 26 * (1 - g)} y={y} transform={`skewX(${shear}deg)`} style={{ ...base, color: "transparent", WebkitTextStroke: `2px ${accent}`, opacity: 0.3 * (1 - g * 0.9) }}>
          {word}
        </Spot>
      ))}
      <Spot x={x + sx} y={y} transform={`skewX(${shear}deg)`} style={{ ...base, opacity: 1 }}>
        {word}
      </Spot>
    </>
  );
};

// ---------- TypeBeatGrid ----------

export type TypeBeatGridProps = {
  bpm: number;
  // The downbeat of the first bar (s).
  start: number;
  // One line per bar. Each word takes a beat; "*word" is accent and bigger, "~word" is the serif aside, "_" is a rest.
  lines: string[];
  beatsPerBar?: number;
  // Colour block per bar, cycling.
  blocks?: Bg[];
  size?: number;
  counter?: boolean;
};

// For music-only films: every word lands on a beat from a BPM table, every bar hard-cuts to its own colour block with a 2 f flash, and a mono beat counter ticks along the bottom.
export const TypeBeatGrid: FC<TypeBeatGridProps> = ({ bpm, start, lines, beatsPerBar = 4, blocks = ["void", "red", "paper", "lime"], size = 190, counter = true }) => {
  const { t } = useTime();
  const beat = 60 / bpm;
  const bars = lines.map((l) => l.split(" ").filter(Boolean));
  const firstBeat: number[] = [];
  let acc = 0;
  for (const words of bars) {
    firstBeat.push(acc);
    acc += Math.ceil(words.length / beatsPerBar) * beatsPerBar;
  }
  const b = firstBeat.reduce((k, fb, i) => (t >= start + fb * beat - 3 / FPS ? i : k), -1);
  if (b < 0) return null;
  const B = BLOCK[blocks[b % blocks.length]!];
  const barAt = start + firstBeat[b]! * beat;
  const beatNow = Math.floor((t - start) / beat + 1e-6);
  const inBar = Math.min(beatsPerBar - 1, Math.max(0, beatNow - firstBeat[b]!) % beatsPerBar);
  const kick = interpolate(((t - start) / beat) % 1, [0, 0.35], [1.012, 1], { ...CLAMP, easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill style={{ backgroundColor: B.bg }}>
      <Grain opacity={0.05} />
      <AbsoluteFill style={{ transform: `scale(${kick})` }}>
        <div style={{ position: "absolute", left: M, right: M, top: 0, bottom: 120, display: "flex", flexWrap: "wrap", alignContent: "center", alignItems: "baseline", columnGap: size * 0.24, rowGap: size * 0.02 }}>
          {bars[b]!.map((raw, i) => {
            if (raw === "_") return null;
            const at = barAt + i * beat;
            const sn = snap(t, at);
            const isAcc = raw.startsWith("*");
            const isEmo = raw.startsWith("~");
            const word = raw.replace(/^[*~]/, "");
            const sz = isAcc ? size * 1.35 : isEmo ? size * 1.05 : size;
            return (
              <span key={i} style={{ ...voice(isEmo ? "emo" : "hit", sz), display: "inline-block", color: isAcc ? B.accent : B.ink, opacity: sn.o, transform: `translateY(${sn.y * sz}px) scale(${sn.s * (isAcc ? emph(t, at + 2 / FPS, 1.15, 1) : 1)})`, transformOrigin: "50% 70%" }}>
                {word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      {counter && (
        <div style={{ position: "absolute", left: M, right: M, bottom: M - 30, display: "flex", alignItems: "center", gap: 18, ...voice("tech", 30, 700), color: B.ink, letterSpacing: "0.14em" }}>
          <span>BAR {String(b + 1).padStart(2, "0")}</span>
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <div key={i} style={{ width: 26, height: 26, border: `3px solid ${B.ink}`, background: i <= inBar ? B.ink : "transparent" }} />
          ))}
          <span style={{ marginLeft: "auto", color: B.ink, opacity: 0.7 }}>{bpm} BPM</span>
        </div>
      )}
      {flashOn(t, barAt - 1 / FPS) && b > 0 ? <AbsoluteFill style={{ backgroundColor: WHITE }} /> : null}
    </AbsoluteFill>
  );
};

