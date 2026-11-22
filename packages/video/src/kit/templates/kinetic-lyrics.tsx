// Kinetic lyrics: lines of sung or spoken text land word by word on their cues; each line takes its own seeded composition (stack, staircase, giant key word, ring), the key word takes the accent and pushes the others, and a colour field wipes in on every line change.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const wordsOf = (line: string) => line.split(/\s+/).filter(Boolean);
const COMPS = ["stack", "stair", "giant", "ring"] as const;
const DOORS = ["up", "down", "left", "right", "depth"] as const;
type Comp = (typeof COMPS)[number];
type Door = (typeof DOORS)[number];
type Energy = "low" | "mid" | "high";

const keyIndex = (words: string[], key: string | undefined) => {
  if (key) {
    const i = words.findIndex((w) => norm(w) === norm(key));
    if (i >= 0) return i;
  }
  let best = 0;
  words.forEach((w, i) => {
    if (norm(w).length >= norm(words[best]!).length) best = i;
  });
  return best;
};

// Which compositions a line can take: the giant needs a short key word, the ring needs a few words to wrap around it.
const fits = (comp: Comp, words: string[], key: number) => {
  const keyLen = norm(words[key]!).length;
  const rest = words.reduce((a, w, i) => (i === key ? a : a + w.length), 0);
  if (comp === "giant") return keyLen <= 12;
  if (comp === "ring") return words.length >= 3 && words.length <= 7 && rest <= 34 && keyLen <= 10;
  if (comp === "stair") return words.length >= 2;
  return true;
};

const schema = z
  .object({
    lines: z
      .array(
        z.object({
          text: z.string().min(1).max(40).describe("One lyric or spoken line, ≤ 40 characters and ≤ 7 words, sentence case, no full stop, e.g. 'Every bug you fear'"),
          key: z.string().max(20).optional().describe("The word in this line that takes the accent and the scale, e.g. 'fear' (default: the longest word)"),
          shape: z
            .enum(COMPS)
            .optional()
            .describe("Force this line's composition: stack (words stacked, key word grows and pushes the rows apart), stair (a diagonal staircase), giant (key word fills the frame, the rest small above and below), ring (key word inside a drawn ring, the rest set along it). Leave out to let the seed choose; two lines in a row never repeat"),
        }),
      )
      .min(1)
      .max(6)
      .describe("The lines in order; each replaces the previous one on a colour-field wipe. Words land on their cues when the narration or lyrics timing has them"),
    energy: z.enum(["low", "mid", "high"]).default("mid").describe("low: soft rises and fades, no camera hits; mid: varied doors, a light hit on each line change; high: key words slam, harder hits, faster wipes. Follow the music's energy arc"),
    seed: z.number().int().min(0).max(999).default(7).describe("Changes which composition and entrance each line gets; change it if two segments in a video would look alike"),
    startWord: z.string().optional().describe("Spoken or sung word the first line starts on, when the cues don't contain the lines' own words; then all words are paced over the segment"),
  })
  .superRefine((p, ctx) => {
    let total = 0;
    p.lines.forEach((l, li) => {
      const ws = wordsOf(l.text);
      total += ws.length;
      if (ws.length > 7) ctx.addIssue({ code: "custom", message: `line ${li + 1} has ${ws.length} words; at most 7`, path: ["lines", li, "text"] });
      if (l.key && !ws.some((w) => norm(w) === norm(l.key!))) ctx.addIssue({ code: "custom", message: `key '${l.key}' is not a word in line ${li + 1}`, path: ["lines", li, "key"] });
      if (l.shape && ws.length && !fits(l.shape, ws, keyIndex(ws, l.key)))
        ctx.addIssue({ code: "custom", message: `line ${li + 1} can't be a ${l.shape}: giant needs a key word ≤ 12 letters, ring 3–7 words with ≤ 34 other letters and a key ≤ 10, stair ≥ 2 words`, path: ["lines", li, "shape"] });
    });
    if (total > 36) ctx.addIssue({ code: "custom", message: `${total} words in all; at most 36 (split into two segments)`, path: ["lines"] });
  });

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
// A knock: out fast, back slowly (the push a landing word gives its neighbours).
const knock = (x: number) => (x < 0 ? 0 : (1 - Math.exp(-30 * x)) * Math.exp(-5 * x));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const clampN = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Words start this far before they are heard, so the picture is settling on the word.
const LEAD = 0.1;
const GROW = 0.42;
// Extra pacing units between lines when words are paced rather than cued: a line needs reading time.
const LINE_GAP = 1.6;
const ENT: Record<Energy, number> = { low: 0.62, mid: 0.46, high: 0.34 };
const WIPE: Record<Energy, number> = { low: 0.55, mid: 0.4, high: 0.3 };
const HIT: Record<Energy, number> = { low: 0, mid: 0.014, high: 0.03 };

// Each word in order is matched to the next cue with the same text, so a repeated word lands on its own occurrence.
const matchWords = (words: string[], cues: Cue[]) => {
  let from = 0;
  return words.map((w) => {
    const i = cues.findIndex((c, k) => k >= from && norm(c.word) === norm(w));
    if (i < 0) return undefined;
    from = i + 1;
    return cues[i]!.at;
  });
};

// Rows for stack and stair: the key word always gets a row of its own, the others pack ≤ maxWords and ≤ maxChars per row.
const pack = (words: string[], key: number, maxChars: number, maxWords: number) => {
  const rows: { idx: number[]; key: boolean }[] = [];
  let cur: number[] = [];
  const flush = () => {
    if (cur.length) rows.push({ idx: cur, key: false });
    cur = [];
  };
  words.forEach((w, i) => {
    if (i === key) {
      flush();
      rows.push({ idx: [i], key: true });
      return;
    }
    const len = cur.reduce((a, j) => a + words[j]!.length + 1, 0) + w.length;
    if (cur.length && (cur.length >= maxWords || len > maxChars)) flush();
    cur.push(i);
  });
  flush();
  return rows;
};

type Plan = { words: string[]; key: number; comp: Comp; door: Door; flip: boolean; first: number };

const KineticLyrics: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const energy = props.energy;
  const ent = ENT[energy];
  const seed = props.seed;
  const accentC = mix(style.accent, 90, style.ink);
  // Character width estimate per em: Inter at 800 is wide, the hand and serif display faces are narrow.
  const cw = hand ? 0.46 : style.display === style.body ? 0.6 : 0.48;
  const mx = Math.max(96, W * 0.08);
  const my = Math.max(90, H * 0.11);
  const aw = W - mx * 2;
  const ah = H - my * 2;

  // Plans: composition, entrance door and mirroring per line, seeded, never the same composition or door twice running.
  const plans: Plan[] = [];
  let first = 0;
  props.lines.forEach((l, li) => {
    const words = wordsOf(l.text);
    const key = keyIndex(words, l.key);
    const prev = plans[li - 1];
    const allowed = COMPS.filter((c) => c !== prev?.comp && fits(c, words, key));
    const comp = l.shape ?? allowed[Math.floor(hash(seed * 13.7 + li * 7.1) * allowed.length)] ?? "stack";
    const doorSet = (energy === "low" ? (["up", "down", "depth"] as Door[]) : [...DOORS]).filter((d) => d !== prev?.door);
    const door = doorSet[Math.floor(hash(seed * 5.3 + li * 3.9 + 1) * doorSet.length)]!;
    plans.push({ words, key, comp, door, flip: hash(seed * 2.1 + li * 11.3 + 2) < 0.5, first });
    first += words.length;
  });

  // Timing: cued words land on their cue, the rest are paced (lines get extra room); everything is in by duration − 0.6, the key growth included.
  const flat = plans.flatMap((p, li) => p.words.map((w) => ({ w, li })));
  const n = flat.length;
  const latestStart = Math.max(0.15, duration - 0.6 - ent - 0.1 - GROW);
  const base = Math.max(0.1, cueAt(cues, props.startWord, 0.3) - LEAD);
  const units = flat.map((f, i) => i + f.li * LINE_GAP);
  const U = units[n - 1] || 1;
  const spoken = matchWords(
    flat.map((f) => f.w),
    cues,
  );
  const raw: number[] = [];
  flat.forEach((f, i) => {
    const paced = base + (units[i]! / U) * Math.max(0, latestStart - base);
    const at = spoken[i] !== undefined ? spoken[i]! - LEAD : paced;
    const gap = i === 0 ? 0 : f.li !== flat[i - 1]!.li ? 0.3 : 0.07;
    raw.push(Math.max(at, i ? raw[i - 1]! + gap : 0.05));
  });
  const r0 = raw[0]!;
  const rN = raw[n - 1]!;
  const first0 = Math.min(r0, latestStart);
  const S = raw.map((s) => (rN > latestStart ? (rN === r0 ? first0 : first0 + ((s - r0) / (rN - r0)) * (latestStart - first0)) : s));

  const wipeLen = WIPE[energy];
  // A line change starts its wipe so the new field is mostly in as the line's first word lands.
  const Ls = plans.map((p, li) => (li === 0 ? -Infinity : S[p.first]! - wipeLen * 0.6));
  let cur = 0;
  Ls.forEach((L, li) => {
    if (t >= L) cur = li;
  });

  const field = (li: number) => (li % 2 ? style.surface : style.bg);
  const fieldOther = (li: number) => (li % 2 ? style.bg : style.surface);
  const fieldBg = (li: number) => `radial-gradient(120% 95% at ${plans[li]!.flip ? 70 : 30}% 32%, ${mix(fieldOther(li), 55, field(li))} 0%, ${field(li)} 72%)`;

  // Where a line's composition sits: the wipe grows from there and the line's drift pushes in around it.
  const anchor = (p: Plan): [number, number] => {
    if (p.comp === "stack") return [p.flip ? W - mx : mx, H / 2];
    if (p.comp === "stair") return [p.flip ? W - mx : mx, my + ah * 0.25];
    return [W / 2, H / 2];
  };

  const textBase: CSSProperties = {
    fontFamily: style.display,
    fontWeight: 800,
    fontSynthesis: "none",
    lineHeight: 1.04,
    letterSpacing: hand ? 0 : "-0.03em",
    whiteSpace: "nowrap",
  };
  const maskStyle: CSSProperties = { display: "inline-block", overflow: "hidden", padding: "0.06em 0.1em 0.22em", margin: "-0.06em -0.1em -0.22em", verticalAlign: "top" };

  // One word's entrance through the line's door. Words not yet in still hold their space, so nothing reflows as they arrive.
  const wordEl = (w: string, a: number, door: Door, colour: string, slam: boolean, k: string | number): ReactNode => {
    if (t < a) return <span key={k} style={{ display: "inline-block", opacity: 0 }}>{w}</span>;
    if (slam) {
      const s = interpolate(t, [a, a + 0.1, a + 0.2], [1.55, 0.94, 1], { ...CLAMP, easing: Easing.out(Easing.quad) });
      const o = interpolate(t, [a, a + 0.05], [0, 1], CLAMP);
      return <span key={k} style={{ display: "inline-block", color: colour, opacity: o, transform: `scale(${s})` }}>{w}</span>;
    }
    const p = enter(style, frame, fps, a, ent);
    if (door === "up" || door === "down") {
      const dir = door === "up" ? 1 : -1;
      return (
        <span key={k} style={maskStyle}>
          <span style={{ display: "inline-block", color: colour, transform: `translateY(${dir * (1 - p) * 115}%)` }}>{w}</span>
        </span>
      );
    }
    if (door === "left" || door === "right") {
      const dir = door === "left" ? -1 : 1;
      return <span key={k} style={{ display: "inline-block", color: colour, opacity: clamp01(p * 2.2), transform: `translateX(${dir * (1 - p) * 0.8}em) skewX(${-dir * (1 - clamp01(p)) * 14}deg)` }}>{w}</span>;
    }
    const e = interpolate(t, [a, a + ent], [0, 1], { ...CLAMP, easing: Easing.out(Easing.cubic) });
    return <span key={k} style={{ display: "inline-block", color: colour, opacity: clamp01(e * 1.5), transform: `scale(${1 + 0.75 * (1 - p)})`, filter: e < 0.98 ? `blur(${(1 - e) * 10}px)` : undefined }}>{w}</span>;
  };

  const renderLine = (li: number): ReactNode => {
    const p = plans[li]!;
    const at = (wi: number) => S[p.first + wi]!;
    const keyAt = at(p.key);
    const slamKey = energy === "high" || (energy === "mid" && p.comp === "giant");
    const keyLand = keyAt + (slamKey ? 0.2 : ent * 0.85);
    const growAt = Math.min(keyLand + 0.04, duration - 0.6 - GROW);
    const g = enter(style, frame, fps, growAt, GROW);
    const windUp = 1 - 0.05 * bump(t - (growAt - 0.12), 0.12);
    const nextL = Ls[li + 1] ?? Infinity;
    const ex = Number.isFinite(nextL) ? interpolate(t, [nextL, nextL + 0.24], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) }) : 0;
    const lineStart = at(0);
    const holdEnd = li === plans.length - 1 ? duration - 0.6 : nextL;
    const drift = 1 + 0.02 * clamp01((t - lineStart) / Math.max(0.5, holdEnd - lineStart));
    const nextDoor = plans[li + 1]?.door;
    const exitDir = nextDoor === "left" ? 1 : nextDoor === "right" ? -1 : 0;
    const [ax, ay] = anchor(p);
    const words = p.words;
    const unit = (idx: number[]) => idx.reduce((a, j) => a + words[j]!.length * cw, 0) + (idx.length - 1) * 0.28;
    let content: ReactNode = null;

    if (p.comp === "stack" || p.comp === "stair") {
      const stair = p.comp === "stair";
      let rows = pack(words, p.key, stair ? 12 : 13, 2);
      if (stair && rows.length > 4) rows = pack(words, p.key, 20, 3);
      const keyRow = rows.find((r) => r.key)!;
      const others = rows.filter((r) => !r.key);
      let f: number;
      let K: number;
      let step = 0;
      if (!stair) {
        f = Math.min(hand ? 200 : 176, ...others.map((r) => aw / unit(r.idx)));
        K = Math.min(aw / unit(keyRow.idx), f * 2.1, hand ? 400 : 360);
        if (K < f * 1.25) f = K / 1.25;
        const hTot = (others.length * f + K) * 1.04;
        if (hTot > ah) {
          f *= ah / hTot;
          K *= ah / hTot;
        }
      } else {
        const mult = (r: { key: boolean }) => (r.key ? 1.6 : 1);
        f = Math.min(hand ? 160 : 140, ...rows.map((r) => (aw * 0.62) / (unit(r.idx) * mult(r))));
        const hTot = rows.reduce((a, r) => a + mult(r), 0) * 1.04 * f;
        if (hTot > ah) f *= ah / hTot;
        K = f * 1.6;
        step = rows.length > 1 ? Math.min(aw * 0.2, ...rows.slice(1).map((r, k) => (aw - unit(r.idx) * mult(r) * f) / (k + 1))) : 0;
      }
      // The key word lands at body size, winds up, then grows to its full size: the rows around it are pushed apart by real reflow.
      const ks = (f + (K - f) * g) * windUp;
      const keyColour = mix(accentC, clamp01(g) * 100, style.ink);
      content = (
        <AbsoluteFill style={{ padding: `0 ${mx}px`, justifyContent: "center", alignItems: p.flip ? "flex-end" : "flex-start" }}>
          {rows.map((r, ri) => (
            <div
              key={ri}
              style={{
                ...textBase,
                display: "flex",
                gap: f * 0.28,
                fontSize: r.key ? ks : f,
                color: style.ink,
                marginLeft: stair && !p.flip ? ri * step : 0,
                marginRight: stair && p.flip ? ri * step : 0,
              }}
            >
              {r.idx.map((j) => wordEl(words[j]!, at(j), p.door, r.key ? keyColour : style.ink, r.key && slamKey, j))}
            </div>
          ))}
        </AbsoluteFill>
      );
    } else if (p.comp === "giant") {
      const before = words.slice(0, p.key);
      const after = words.slice(p.key + 1);
      const kl = words[p.key]!.length;
      let G = Math.min((aw * 0.94) / (kl * cw), hand ? 460 : 420);
      let s = clampN(G * 0.28, 50, 90);
      const longest = Math.max(unit(before.map((_, i) => i)), unit(after.map((_, i) => i + p.key + 1)));
      if (longest > 0) s = Math.min(s, (aw * 0.96) / longest);
      const smallRows = (before.length ? 1 : 0) + (after.length ? 1 : 0);
      if (G * 0.92 + smallRows * s * 1.25 > ah) G = (ah - smallRows * s * 1.25) / 0.92;
      // The giant word knocks the line above it upward as it lands, and the line settles back.
      const push = -G * 0.1 * knock(t - keyAt - 0.04);
      const small = (ws: string[], offset: number, dy: number) => (
        <div style={{ ...textBase, fontSize: s, fontWeight: 700, display: "flex", gap: s * 0.28, color: style.ink, transform: `translateY(${dy}px)` }}>
          {ws.map((w, i) => wordEl(w, at(offset + i), p.door, style.ink, false, offset + i))}
        </div>
      );
      content = (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: s * 0.2 }}>
          {before.length ? small(before, 0, push) : null}
          <div style={{ ...textBase, fontSize: G, lineHeight: 0.92, letterSpacing: hand ? 0 : "-0.045em" }}>{wordEl(words[p.key]!, keyAt, "depth", accentC, slamKey, "k")}</div>
          {after.length ? small(after, p.key + 1, 0) : null}
        </AbsoluteFill>
      );
    } else {
      // ring: a drawn ring holds the key word; the other words drop onto an arc around its top, the ring kicks round when the key lands.
      const rest = words.map((_, i) => i).filter((i) => i !== p.key);
      const restChars = rest.reduce((a, i) => a + words[i]!.length, 0);
      const D = Math.min(H * 0.6, aw * 0.56);
      const arcCw = cw * 1.05;
      let fs = 64;
      let R = 0;
      for (let k = 0; k < 3; k++) {
        R = D / 2 + 30 + fs * 0.32;
        const len = 2 * Math.PI * R * (240 / 360);
        fs = clampN((len * 0.84) / (restChars * arcCw + (rest.length - 1) * 0.3), 40, 84);
      }
      R = D / 2 + 30 + fs * 0.32;
      const cx = W / 2;
      const cy = H / 2 + fs * 0.3;
      const pt = (deg: number) => [cx + R * Math.cos((deg * Math.PI) / 180), cy + R * Math.sin((deg * Math.PI) / 180)] as const;
      const [x0, y0] = pt(-210);
      const [x1, y1] = pt(30);
      const arcId = `kl-arc-${li}`;
      const kl = words[p.key]!.length;
      const Kf = Math.min((D * 0.72) / (kl * cw), D * 0.36);
      const draw = enter(calm, frame, fps, lineStart - 0.05, 0.6);
      const kick = enter(style, frame, fps, keyAt, 0.7);
      const spinT = Math.min(t, duration - 0.6) - lineStart;
      const rot = 8 * Math.max(0, spinT) + 30 * kick;
      const pulse = 1 + 0.04 * bump(t - keyAt, 0.3);
      const boil = hand ? (hash(li * 9 + Math.floor(t * 8)) - 0.5) * 3 : 0;
      const tickR = D / 2 - 26;
      // Each word is a tspan; dy is relative, so each one cancels the previous word's offset and adds its own drop.
      let prevDy = 0;
      const spans = rest.map((j, k) => {
        const a = at(j);
        const q = enter(style, frame, fps, a, ent);
        const d = t < a ? -fs * 0.7 : -(1 - q) * fs * 0.7;
        const el = (
          <tspan key={j} dy={d - prevDy} fillOpacity={t < a ? 0 : clamp01(q * 2)}>
            {(k ? " " : "") + words[j]}
          </tspan>
        );
        prevDy = d;
        return el;
      });
      content = (
        <AbsoluteFill>
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <defs>
              <path id={arcId} d={`M ${x0} ${y0} A ${R} ${R} 0 1 1 ${x1} ${y1}`} />
            </defs>
            <g transform={`translate(${cx} ${cy}) scale(${pulse}) translate(${-cx} ${-cy})`}>
              <circle cx={cx} cy={cy} r={D / 2 + boil} fill="none" stroke={style.accent} strokeWidth={9} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
              <g transform={`rotate(${rot} ${cx} ${cy})`} opacity={clamp01(draw * 1.4)}>
                <circle cx={cx} cy={cy} r={tickR} fill="none" stroke={style.muted} strokeWidth={6} strokeLinecap="round" strokeDasharray={`0 ${(2 * Math.PI * tickR) / 48}`} />
                <circle cx={cx + tickR} cy={cy} r={10} fill={style.accent2} />
              </g>
            </g>
            <text fontFamily={style.display} fontWeight={700} fontSize={fs} fill={style.ink} letterSpacing={hand ? 0 : -fs * 0.01} wordSpacing={fs * 0.12} style={{ fontSynthesis: "none" }}>
              <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
                {spans}
              </textPath>
            </text>
          </svg>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `translateY(${cy - H / 2}px)` }}>
            <div style={{ ...textBase, fontSize: Kf, transform: `scale(${pulse})` }}>{wordEl(words[p.key]!, keyAt, "depth", accentC, slamKey, "k")}</div>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }

    return (
      <AbsoluteFill
        key={li}
        style={{
          opacity: 1 - ex,
          transform: `translate(${exitDir * ex * 120}px, ${exitDir === 0 ? -ex * 40 : 0}px) scale(${drift * (1 - 0.05 * ex)})`,
          transformOrigin: `${ax}px ${ay}px`,
        }}
      >
        {content}
      </AbsoluteFill>
    );
  };

  // The field wipe for the current line: a circle grown from the composition's anchor for up/down/depth doors, a slanted slab for left/right doors.
  const curPlan = plans[cur]!;
  const wipeT = cur > 0 ? interpolate(t, [Ls[cur]!, Ls[cur]! + wipeLen], [0, 1], { ...CLAMP, easing: Easing.bezier(0.65, 0, 0.25, 1) }) : 1;
  const [wx, wy] = anchor(curPlan);
  const maxR = Math.hypot(Math.max(wx, W - wx), Math.max(wy, H - wy)) + 40;
  const slab = curPlan.door === "left" || curPlan.door === "right";
  const fromRight = curPlan.door === "right";
  const skew = W * 0.12;
  const edge = -skew + wipeT * (W + skew * 2);
  const slabPoly = (e: number) => {
    const xs = [e + skew, e - skew];
    return fromRight ? `polygon(${W - xs[0]!}px 0, ${W}px 0, ${W}px ${H}px, ${W - xs[1]!}px ${H}px)` : `polygon(0 0, ${xs[0]}px 0, ${xs[1]}px ${H}px, 0 ${H}px)`;
  };
  const wiping = cur > 0 && wipeT < 1;
  const edgeW = energy === "high" ? 26 : 16;

  // Camera: a small inhale before each line change, an impact on it (stronger at high energy); no motion otherwise.
  const hit = HIT[energy];
  const sinceL = cur > 0 ? t - Ls[cur]! : Infinity;
  const nextL = Ls[cur + 1];
  const cam = (1 + hit * Math.exp(-5 * sinceL)) * (nextL !== undefined ? 1 - hit * 0.4 * bump(t - (nextL - 0.16), 0.16) : 1);

  // Life layer: a large outlined square turning slowly, kicked a little further round on every line change.
  const kicks = Ls.reduce((a, L, li) => (li ? a + enter(calm, frame, fps, L, 0.9) : a), 0);
  const lifeRot = t * 6 + 24 * kicks;
  const lifeSize = H * 0.95;

  const shown = plans.map((_, li) => li).filter((li) => li === cur || (li === cur - 1 && t < Ls[cur]! + 0.3));

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {cur > 0 ? <AbsoluteFill style={{ background: fieldBg(cur - 1) }} /> : null}
      <AbsoluteFill style={{ background: fieldBg(cur), clipPath: wiping ? (slab ? slabPoly(edge) : `circle(${wipeT * maxR}px at ${wx}px ${wy}px)`) : undefined }} />
      {wiping && energy !== "low" ? (
        slab ? (
          <AbsoluteFill style={{ background: style.accent, clipPath: slabPoly(edge), opacity: 1 - wipeT * 0.4 }}>
            <AbsoluteFill style={{ background: fieldBg(cur), clipPath: slabPoly(edge - edgeW) }} />
          </AbsoluteFill>
        ) : (
          <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
            <circle cx={wx} cy={wy} r={wipeT * maxR} fill="none" stroke={style.accent} strokeWidth={edgeW * (1 - wipeT) + 3} opacity={1 - wipeT * 0.5} />
          </svg>
        )
      ) : null}

      <div
        style={{
          position: "absolute",
          width: lifeSize,
          height: lifeSize,
          left: (curPlan.flip ? W * 0.18 : W * 0.82) - lifeSize / 2,
          top: H * 0.78 - lifeSize / 2,
          border: `${hand ? 5 : 4}px solid ${style.accent2}`,
          borderRadius: Math.max(style.radius * 3, 24),
          opacity: 0.17,
          transform: `rotate(${lifeRot}deg)`,
        }}
      />

      <AbsoluteFill style={{ transform: `scale(${cam})` }}>{shown.map(renderLine)}</AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.14) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "kinetic-lyrics",
  title: "Kinetic lyrics",
  mode: "text",
  layouts: ["full"],
  useFor:
    "Music-only videos and high-energy moments: up to 6 short lines (≤ 7 words each) land word by word on their cues (lyrics timing or narration); each line takes its own composition (stack, stair, giant key word, ring), its key word takes the accent and scale and pushes the other words, and a colour field wipes in on every line change. Set energy to the music's section. No media.",
  avoid:
    "Long explanations or anything that needs to be read as a paragraph (use a graphic), lines shorter on screen than ~1.5 s + 0.3 s per word, more than ~36 words per segment, and two segments in a row with the same seed. Not for numbers or quotes (stat-punch, quote-card).",
  schema,
  example: {
    lines: [
      { text: "Every bug you fear", key: "fear", shape: "stack" },
      { text: "is just a question", key: "question", shape: "giant" },
      { text: "you haven't asked yet", key: "asked", shape: "ring" },
      { text: "So ask it louder", key: "louder", shape: "stair" },
    ],
    energy: "high",
    seed: 7,
    startWord: "Every",
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.4, end: 0.7, word: "Every" },
    { at: 0.7, end: 1.0, word: "bug" },
    { at: 1.0, end: 1.25, word: "you" },
    { at: 1.25, end: 1.9, word: "fear" },
    { at: 2.6, end: 2.8, word: "is" },
    { at: 2.8, end: 3.05, word: "just" },
    { at: 3.05, end: 3.2, word: "a" },
    { at: 3.2, end: 3.9, word: "question" },
    { at: 4.9, end: 5.1, word: "you" },
    { at: 5.1, end: 5.45, word: "haven't" },
    { at: 5.45, end: 5.85, word: "asked" },
    { at: 5.85, end: 6.3, word: "yet" },
    { at: 7.0, end: 7.25, word: "So" },
    { at: 7.25, end: 7.5, word: "ask" },
    { at: 7.5, end: 7.75, word: "it" },
    { at: 7.75, end: 8.4, word: "louder" },
  ],
  seconds: { min: 4, max: 15, demo: 10 },
  mediaSlots: 0,
  credit: { name: "'Synced lyrics motion video' by @samaote (prompt-motion.com)", url: "https://prompt-motion.com/samaote-5e2fc2" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <KineticLyrics props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
