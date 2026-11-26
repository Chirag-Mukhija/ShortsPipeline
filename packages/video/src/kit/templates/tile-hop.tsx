// Tile hop: letter tiles with little faces hop onto a rack to spell a word, then leap, swap places and tumble off to re-spell it as the next word on its cue, with an optional caption under the rack.
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import type { Cue, Style } from "../contract";
import { defineTemplate } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const schema = z.object({
  words: z
    .array(
      z.object({
        text: z
          .string()
          .min(1)
          .max(10)
          .regex(/^[A-Za-z0-9 &?!']+$/)
          .describe("What the tiles spell, ≤ 10 characters, letters/digits and spaces only, shown in capitals, e.g. 'stressed'"),
        word: z.string().optional().describe("Spoken word this spelling lands on (defaults to the first word of text)"),
        accent: z
          .array(z.number().int().min(0).max(9))
          .max(10)
          .optional()
          .describe("0-based character positions (spaces count) whose tiles turn the accent colour once this spelling has landed, e.g. [0] for the first letter"),
      }),
    )
    .min(1)
    .max(3)
    .describe("1–3 spellings in spoken order. Tiles whose letter is reused leap to their new place; unused ones jump off, missing ones drop in. Anagrams (listen → silent) and shrinking words (stressed → rest) look best"),
  entrance: z.enum(["drop", "hop"]).default("drop").describe("How the first spelling arrives: drop = tiles fall in one by one from above; hop = they hop in a line from the right edge"),
  faces: z.boolean().default(true).describe("Give each tile two blinking eyes and cheeks so the tiles act as characters; false for plain tiles"),
  caption: z.string().max(44).optional().describe("One short line under the rack after the last spelling, ≤ 44 characters, e.g. 'Sometimes the fix is inside the word'"),
  captionWord: z.string().optional().describe("Spoken word the caption lands on"),
  seed: z.number().int().min(1).max(99).default(1).describe("Changes blink timing and the board pattern; vary between segments"),
});

type Props = z.infer<typeof schema>;

const GAP = 0.12;
const SPACE = 0.45;
const CROUCH = 0.12;

const hash = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const bump = (x: number) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));

// Relative luminance of a hex token (other formats count as mid-grey), so tile ink is picked by contrast rather than hard-coded.
const lum = (c: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  let h = m[1]!;
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((u) => (u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

type Move = { kind: "drop" | "walk" | "hop" | "bob" | "exit"; a: number; d: number; x0: number; x1: number; h: number };
type Tile = { id: number; ch: string; slot: (number | null)[]; moves: Move[] };
type Pose = { x: number; y: number; rot: number; sx: number; sy: number; look: number; lookY: number };

const units = (w: string) => {
  const chars = [...w];
  const n = chars.filter((c) => c !== " ").length;
  const spaces = chars.length - n;
  return n * (1 + GAP) - GAP + spaces * SPACE;
};

// Centre x of each character's tile (NaN for spaces) and the word's total width.
const layoutWord = (w: string, s: number, cx: number) => {
  const pos: number[] = [];
  let c = 0;
  for (const ch of w) {
    if (ch === " ") {
      pos.push(Number.NaN);
      c += s * SPACE;
    } else {
      pos.push(c + s / 2);
      c += s * (1 + GAP);
    }
  }
  const total = c - s * GAP;
  return { pos: pos.map((p) => p + cx - total / 2), total };
};

// Each letter of a new spelling takes the unused old tile with the same letter that sits closest (relative to word centre); the rest exit or enter.
const matchTiles = (words: string[]) => {
  const tiles: Tile[] = [];
  words.forEach((w, k) => {
    const chars = [...w];
    const rel = (j: number, len: number) => j - (len - 1) / 2;
    const prev = k === 0 ? [] : tiles.filter((t) => t.slot[k - 1] != null);
    const prevLen = k === 0 ? 0 : [...words[k - 1]!].length;
    const used = new Set<number>();
    for (const t of tiles) t.slot[k] = null;
    chars.forEach((c, j) => {
      if (c === " ") return;
      let best: Tile | undefined;
      let bd = Infinity;
      for (const t of prev) {
        if (used.has(t.id) || t.ch !== c) continue;
        const d = Math.abs(rel(t.slot[k - 1]!, prevLen) - rel(j, chars.length));
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
      if (best) {
        used.add(best.id);
        best.slot[k] = j;
      } else {
        const slot: (number | null)[] = Array.from({ length: k + 1 }, () => null);
        slot[k] = j;
        tiles.push({ id: tiles.length, ch: c, slot, moves: [] });
      }
    });
  });
  return tiles;
};

// Where a tile is at time t: a pure function of its move list (anticipation crouch, eased arc, damped landing squash).
const poseAt = (moves: Move[], t: number, amp: number, dropH: number, H: number): Pose | null => {
  const first = moves[0];
  if (!first || t < first.a) return null;
  let m = first;
  for (const mv of moves) {
    const lead = mv.kind === "hop" || mv.kind === "bob" || mv.kind === "exit" ? CROUCH : 0;
    if (t >= mv.a - lead) m = mv;
    else break;
  }
  const dir = Math.sign(m.x1 - m.x0);
  if (t < m.a) {
    const D = 0.13 * amp * Math.sin((Math.PI / 2) * clamp01((t - (m.a - CROUCH)) / CROUCH));
    return { x: m.x0, y: 0, rot: 0, sx: 1 + D * 0.6, sy: 1 - D, look: dir, lookY: 0 };
  }
  const p = clamp01((t - m.a) / m.d);
  if (p < 1) {
    const crouchOut = 0.13 * amp * Math.max(0, 1 - p / 0.15);
    switch (m.kind) {
      case "drop":
        return { x: m.x1, y: -dropH * (1 - p * p), rot: 0, sx: 1 - 0.05 * amp * p, sy: 1 + 0.1 * amp * p, look: 0, lookY: 1 };
      case "walk": {
        const ph = p * 3;
        const air = Math.abs(Math.sin(Math.PI * ph));
        const touch = 0.09 * amp * (1 - air) ** 6;
        return { x: lerp(m.x0, m.x1, p), y: -air * m.h * (1 - 0.35 * p), rot: dir * 7 * amp * Math.sin(Math.PI * p), sx: 1 + touch * 0.6, sy: 1 - touch, look: dir, lookY: 0 };
      }
      case "exit": {
        const fall = p > 0.5 ? (p - 0.5) ** 2 * 4 * H * 0.7 : 0;
        return { x: lerp(m.x0, m.x1, p), y: -m.h * 4 * p * (1 - p) + fall, rot: dir * 260 * p * p, sx: 1, sy: 1 + 0.06 * amp * Math.sin(Math.PI * p) - crouchOut, look: dir, lookY: -0.5 };
      }
      default: {
        const e = Easing.inOut(Easing.sin)(p);
        const sy = 1 + 0.1 * amp * Math.sin(Math.PI * p) - crouchOut;
        return { x: lerp(m.x0, m.x1, e), y: -m.h * 4 * p * (1 - p), rot: dir * 10 * amp * Math.sin(Math.PI * p), sx: 1 - (sy - 1) * 0.6, sy, look: dir, lookY: m.kind === "bob" ? -0.6 : 0 };
      }
    }
  }
  if (m.kind === "exit") return null;
  const k = t - (m.a + m.d);
  const D = 0.2 * amp * Math.exp(-7 * k) * Math.sin(Math.min(26 * k, Math.PI * 4));
  return { x: m.x1, y: 0, rot: 0, sx: 1 + D * 0.6, sy: 1 - D, look: k < 0.35 ? dir * (1 - k / 0.35) : 0, lookY: 0 };
};

const Scene = ({ props, style, width: W, height: H, duration, cues }: { props: Props; style: Style; width: number; height: number; duration: number; cues: Cue[] }) => {
  const { t, frame, fps } = useT();
  const wide = W / H >= 1.3;
  const seed = props.seed ?? 1;
  const faces = props.faces ?? true;
  const entrance = props.entrance ?? "drop";
  const amp = style.motion === "calm" ? 0.55 : 1;
  const hand = style.motion === "hand";
  const calm = { ...style, motion: "calm" as const };

  const texts = props.words.map((w) => w.text.trim().toUpperCase());
  const n = texts.length;

  // Size: the longest spelling fits 88% of the canvas width; tiles never taller than a fifth of the frame.
  const maxU = Math.max(...texts.map(units));
  const s = Math.min(H * (wide ? 0.19 : 0.16), (W * 0.88) / maxU);
  const th = faces ? s * 1.12 : s;
  const rackH = s * 0.24;
  const capSize = wide ? 50 : 42;
  const capW = W * 0.8;
  const capLines = props.caption ? Math.min(2, Math.ceil((props.caption.length * capSize * 0.52) / capW)) : 0;
  const capBlock = props.caption ? 64 + capLines * capSize * 1.25 : 0;
  const groupH = th + rackH + capBlock;
  const top = (H - groupH) / 2 - H * 0.02;
  const rackY = top + th;
  const cx = W / 2;
  const dropH = rackY + th + 40;

  // Timing: spellings land on their words (fallbacks spread over the first ~60%), each ≥ 1.2 s after the last and early enough to settle.
  const fbFirst = entrance === "hop" ? 1.3 : 0.6;
  const fbLast = n > 1 ? Math.min(duration * 0.62, duration - 2.3) : fbFirst;
  const T = props.words.map((w, k) => cueAt(cues, w.word ?? w.text.trim().split(/\s+/)[0], n > 1 ? fbFirst + (k * (fbLast - fbFirst)) / (n - 1) : fbFirst));
  T[0] = Math.min(T[0]!, duration - 2);
  for (let k = 1; k < n; k++) T[k] = Math.min(Math.max(T[k]!, T[k - 1]! + 1.2), duration - 2.3);

  const layouts = texts.map((w) => layoutWord(w, s, cx));
  const tiles = matchTiles(texts);
  const settle: number[] = [];

  // Word 0: the first tile lands on the spoken word, the rest follow left to right.
  {
    const first = tiles.filter((tl) => tl.slot[0] != null).sort((a, b) => a.slot[0]! - b.slot[0]!);
    const pos = layouts[0]!.pos;
    let end = 0;
    first.forEach((tl, i) => {
      const x1 = pos[tl.slot[0]!]!;
      if (entrance === "hop") {
        const x0 = W + s;
        const d = 0.85 + 0.35 * ((x0 - x1) / W);
        const d0 = 0.85 + 0.35 * ((x0 - pos[first[0]!.slot[0]!]!) / W);
        const a = Math.max(0.05, T[0]! - d0) + i * Math.min(0.09, 0.7 / first.length);
        tl.moves.push({ kind: "walk", a, d, x0, x1, h: s * 0.42 });
        end = Math.max(end, a + d);
      } else {
        const a = Math.max(0.05, T[0]! - 0.45) + i * Math.min(0.08, 0.6 / first.length);
        tl.moves.push({ kind: "drop", a, d: 0.42, x0: x1, x1, h: 0 });
        end = Math.max(end, a + 0.42);
      }
    });
    settle.push(end + 0.3);
  }

  // Later words: leavers jump off first, then movers leap in new-slot order, then missing letters drop into the gaps.
  for (let k = 1; k < n; k++) {
    const a0 = T[k]! - 0.3;
    const prev = layouts[k - 1]!.pos;
    const pos = layouts[k]!.pos;
    let end = 0;
    const leavers = tiles.filter((tl) => tl.slot[k - 1] != null && tl.slot[k] == null);
    leavers.forEach((tl, i) => {
      const x0 = prev[tl.slot[k - 1]!]!;
      const dir = x0 < cx ? -1 : 1;
      tl.moves.push({ kind: "exit", a: a0 + i * 0.05, d: 0.75, x0, x1: dir < 0 ? -s * 2 : W + s * 2, h: s * 1.7 });
    });
    const movers = tiles.filter((tl) => tl.slot[k - 1] != null && tl.slot[k] != null).sort((a, b) => a.slot[k]! - b.slot[k]!);
    const stg = Math.min(0.06, 0.36 / Math.max(movers.length, 1));
    movers.forEach((tl, i) => {
      const x0 = prev[tl.slot[k - 1]!]!;
      const x1 = pos[tl.slot[k]!]!;
      const dist = Math.min(Math.abs(x1 - x0) / s, 4);
      const a = a0 + (leavers.length ? 0.12 : 0) + i * stg;
      // Leftward leapers arc higher, so crossing tiles pass over each other instead of through.
      const mv: Move = dist < 0.1 ? { kind: "bob", a, d: 0.36, x0, x1, h: s * 0.22 * amp } : { kind: "hop", a, d: 0.46 + 0.08 * dist, x0, x1, h: s * (0.5 + 0.22 * dist) * (x1 < x0 ? 1.4 : 1) * (0.6 + 0.4 * amp) };
      tl.moves.push(mv);
      end = Math.max(end, mv.a + mv.d);
    });
    const comers = tiles.filter((tl) => tl.slot[k] != null && (k === 0 || tl.slot[k - 1] == null) && tl.moves.length === 0).sort((a, b) => a.slot[k]! - b.slot[k]!);
    comers.forEach((tl, i) => {
      const x1 = pos[tl.slot[k]!]!;
      const a = a0 + 0.3 + i * 0.07;
      tl.moves.push({ kind: "drop", a, d: 0.42, x0: x1, x1, h: 0 });
      end = Math.max(end, a + 0.42);
    });
    settle.push(end + 0.3);
  }

  const lastSettle = settle[n - 1]!;
  const capAt = Math.min(Math.max(cueAt(cues, props.captionWord, lastSettle + 0.2), lastSettle - 0.2), duration - 1.2);

  // The active spelling at time t (switches as its swap begins) drives accent tints.
  const activeAt = (time: number) => {
    let k = 0;
    for (let i = 1; i < n; i++) if (time >= T[i]! - 0.3) k = i;
    return k;
  };
  const tintOf = (tl: Tile) => {
    let v = 0;
    props.words.forEach((w, k) => {
      const j = tl.slot[k];
      if (j == null || !w.accent?.includes(j)) return;
      const on = enter(style, frame, fps, settle[k]! + 0.1, 0.45);
      const off = k < n - 1 ? interpolate(t, [T[k + 1]! - 0.35, T[k + 1]! - 0.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
      v = Math.max(v, on * (1 - off));
    });
    return clamp01(v);
  };

  // Rack width eases to each spelling's width as its swap begins.
  const widthOf = (k: number) => layouts[k]!.total + s * 0.7;
  const introStart = Math.min(...tiles.flatMap((tl) => tl.moves.slice(0, 1).map((m) => m.a)));
  const rackGrow = enter(calm, frame, fps, Math.max(0, introStart - 0.25), 0.6);
  let rackW = widthOf(0);
  for (let k = 1; k < n; k++) rackW += (widthOf(k) - widthOf(k - 1)) * enter(calm, frame, fps, T[k]! - 0.25, 0.8);

  // Colours: light tiles on dark looks, white tiles on light ones; accent-tile ink picked by contrast.
  const dark = lum(style.bg) < 0.3;
  const face = dark ? style.ink : style.surface;
  const letterInk = dark ? style.bg : style.ink;
  const accentInk = contrast(style.accent, style.ink) >= contrast(style.accent, style.bg) ? style.ink : style.bg;
  const side = `color-mix(in srgb, ${face} 68%, black)`;
  const accentSide = `color-mix(in srgb, ${style.accent} 68%, black)`;
  const rTile = Math.min(style.radius, 22) * (s / 150) * 0.9 + 2;

  // Camera: born a little close on the rack, settles back as the first word lands; each swap is a small push that returns.
  const born = interpolate(t, [0, Math.max(settle[0]!, 0.6)], [1.1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  let cam = born;
  for (let k = 1; k < n; k++) cam += 0.035 * bump((t - (T[k]! - 0.45)) / 1.7);
  const camOrigin = `${cx}px ${rackY - th / 2}px`;
  const boardCam = 1 + (cam - 1) * 0.35;

  // Board: a faint grid of squares behind the rack with a few seeded tinted cells; a soft light pool drifts across it as the life layer.
  const cell = s * (1 + GAP) * 0.92;
  const cols = Math.ceil(W / cell) + 2;
  const rows = Math.ceil(H / cell) + 2;
  const gridX = (cx - cell / 2) % cell - cell;
  const gridY = (rackY - th) % cell - cell;
  const specials = Array.from({ length: 10 },(_, i) => ({ c: Math.floor(hash(seed, i * 2 + 1) * cols), r: Math.floor(hash(seed, i * 2 + 2) * rows), alt: hash(seed, i + 40) > 0.5 }));
  const lightX = 30 + 40 * clamp01(t / Math.max(duration, 1));
  const line = `color-mix(in srgb, ${style.ink} ${dark ? 10 : 8}%, ${style.bg})`;

  const capIn = enter(style, frame, fps, capAt - 0.05, 0.7);
  const looksDown = props.caption ? enter(style, frame, fps, capAt + 0.1, 0.3) : 0;

  const poses = tiles.map((tl) => ({ tl, pose: poseAt(tl.moves, t, amp, dropH, H) }));
  const airborne = (p: Pose) => p.y < -2 || p.rot !== 0;

  const renderTile = ({ tl, pose }: { tl: Tile; pose: Pose }) => {
    const tint = tintOf(tl);
    const pop = 1 + 0.07 * bump(tint);
    const lean = hand ? (hash(seed, tl.id + 70) - 0.5) * 5 : 0;
    const period = 2.6 + hash(seed, tl.id + 9) * 2.4;
    const blinkP = ((t + hash(seed, tl.id + 3) * period) % period) / 0.16;
    const open = 1 - 0.9 * bump(blinkP);
    const lookX = pose.look * (1 - looksDown);
    const lookY = pose.lookY * (1 - looksDown) + looksDown;
    const letter = (ink: string) => (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: faces ? th * 0.36 : 0,
          height: faces ? th * 0.6 : th,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: style.display,
          fontWeight: 700,
          fontSize: faces ? s * 0.54 : s * 0.66,
          lineHeight: 1,
          color: ink,
        }}
      >
        {tl.ch}
      </div>
    );
    const ew = s * 0.105;
    const eh = s * 0.145 * open;
    return (
      <div
        key={tl.id}
        style={{
          position: "absolute",
          left: pose.x - s / 2,
          top: rackY - th + pose.y,
          width: s,
          height: th,
          zIndex: airborne(pose) ? 3 : 2,
          transform: `rotate(${pose.rot + lean}deg)`,
          transformOrigin: "50% 60%",
        }}
      >
        <div style={{ position: "absolute", inset: 0, transform: `scale(${pose.sx * pop}, ${pose.sy * pop})`, transformOrigin: "50% 100%" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: s * 0.07, bottom: -s * 0.07, borderRadius: rTile, background: side }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: s * 0.07, bottom: -s * 0.07, borderRadius: rTile, background: accentSide, opacity: tint }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: rTile,
              background: face,
              border: hand ? `4px solid ${style.ink}` : undefined,
              boxShadow: `inset 0 ${-s * 0.035}px 0 rgba(0,0,0,0.07), inset 0 ${s * 0.03}px 0 rgba(255,255,255,0.35)`,
              overflow: "hidden",
            }}
          >
            {letter(letterInk)}
            <div style={{ position: "absolute", inset: 0, background: style.accent, opacity: tint }}>{letter(accentInk)}</div>
            {faces ? (
              <>
                {[0.33, 0.67].map((fx) => (
                  <div
                    key={fx}
                    style={{
                      position: "absolute",
                      left: s * fx - ew / 2 + lookX * s * 0.035,
                      top: th * 0.19 - eh / 2 + lookY * s * 0.025,
                      width: ew,
                      height: Math.max(eh, s * 0.012),
                      borderRadius: "50%",
                      background: tint > 0.5 ? accentInk : letterInk,
                    }}
                  >
                    {open > 0.6 ? <div style={{ position: "absolute", left: ew * 0.22, top: eh * 0.16, width: ew * 0.34, height: ew * 0.34, borderRadius: "50%", background: tint > 0.5 ? style.accent : face }} /> : null}
                  </div>
                ))}
                {[0.17, 0.83].map((fx) => (
                  <div
                    key={fx}
                    style={{
                      position: "absolute",
                      left: s * fx - s * 0.055,
                      top: th * 0.29,
                      width: s * 0.11,
                      height: s * 0.065,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${tint > 0.5 ? style.accent2 : style.accent} 45%, transparent)`,
                    }}
                  />
                ))}
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${boardCam})`, transformOrigin: camOrigin }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {specials.map((sp, i) => (
            <rect key={i} x={gridX + sp.c * cell} y={gridY + sp.r * cell} width={cell} height={cell} fill={`color-mix(in srgb, ${sp.alt ? style.accent2 : style.accent} ${dark ? 8 : 8}%, ${style.bg})`} />
          ))}
          {Array.from({ length: cols + 1 }, (_, i) => (
            <line key={`c${i}`} x1={gridX + i * cell} y1={0} x2={gridX + i * cell} y2={H} stroke={line} strokeWidth={2} />
          ))}
          {Array.from({ length: rows + 1 }, (_, i) => (
            <line key={`r${i}`} x1={0} y1={gridY + i * cell} x2={W} y2={gridY + i * cell} stroke={line} strokeWidth={2} />
          ))}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 65% at ${lightX}% 42%, color-mix(in srgb, ${style.surface} ${dark ? 22 : 70}%, transparent) 0%, transparent 70%)` }} />

      <AbsoluteFill style={{ transform: `scale(${cam})`, transformOrigin: camOrigin }}>
        <div
          style={{
            position: "absolute",
            left: cx - rackW / 2,
            top: rackY,
            width: rackW,
            height: rackH,
            transform: `scaleX(${rackGrow})`,
            borderRadius: Math.min(style.radius, 14),
            background: `color-mix(in srgb, ${style.ink} ${dark ? 30 : 22}%, ${style.bg})`,
            border: hand ? `4px solid ${style.ink}` : undefined,
            boxShadow: `0 ${s * 0.12}px ${s * 0.25}px rgba(0,0,0,${dark ? 0.4 : 0.14})`,
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: rackH * 0.3, borderRadius: Math.min(style.radius, 14), background: `color-mix(in srgb, ${style.ink} ${dark ? 45 : 10}%, ${style.surface})` }} />
        </div>

        {poses.map(({ tl, pose }) => {
          if (!pose) return null;
          const lift = Math.max(0, -pose.y);
          const k = 1 / (1 + lift / (s * 1.6));
          return (
            <div
              key={`sh${tl.id}`}
              style={{
                position: "absolute",
                left: pose.x - (s * 0.5 * k),
                top: rackY - s * 0.04,
                width: s * k,
                height: s * 0.1,
                borderRadius: "50%",
                background: `rgba(0,0,0,${(dark ? 0.45 : 0.22) * k})`,
                filter: "blur(4px)",
              }}
            />
          );
        })}

        {poses.map((p) => (p.pose ? renderTile({ tl: p.tl, pose: p.pose }) : null))}

        {props.caption ? (
          <div style={{ position: "absolute", left: cx - capW / 2, width: capW, top: rackY + rackH + 56, overflow: "hidden", textAlign: "center", paddingBottom: 8 }}>
            <div
              style={{
                fontFamily: style.body,
                fontWeight: 600,
                fontSize: capSize,
                lineHeight: 1.25,
                color: style.ink,
                transform: `translateY(${(1 - capIn) * 110}%)`,
                opacity: clamp01(capIn * 1.5),
              }}
            >
              {props.caption}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${dark ? 0.45 : hand ? 0.08 : 0.14}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "tile-hop",
  title: "Tile hop",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Wordplay and 'look at this word' moments: 1–3 spellings (≤ 10 characters each) built from letter tiles with little faces that drop or hop onto a rack on the spoken word. On the next word the tiles act it out: reused letters leap over each other to their new places, unused ones jump off the rack, missing ones drop in, and the rack stretches to fit. Made for anagrams (listen → silent), a word shrinking to its core (stressed → rest), an acronym or name spelled out, or a typo fixed. Optional accent tiles per spelling and one caption line under the rack. No media.",
  avoid:
    "Words longer than 10 characters or sentences (use title-card or kinetic-lyrics), more than once or twice per video, or less than ~2.5 s per spelling. Not for lists (list-tick) or numbers (stat-punch). Spellings that share no letters lose the point of the swap.",
  schema,
  example: {
    words: [
      { text: "stressed", word: "stressed" },
      { text: "desserts", word: "desserts", accent: [0] },
      { text: "rest", word: "rest", accent: [0, 1, 2, 3] },
    ],
    entrance: "drop",
    faces: true,
    caption: "Sometimes the fix is inside the word",
    captionWord: "fix",
    seed: 4,
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.4, end: 0.6, word: "When" },
    { at: 0.6, end: 0.85, word: "you're" },
    { at: 0.9, end: 1.5, word: "stressed" },
    { at: 3.4, end: 3.7, word: "spell" },
    { at: 3.7, end: 3.8, word: "it" },
    { at: 3.85, end: 4.4, word: "backwards" },
    { at: 4.7, end: 5.3, word: "desserts" },
    { at: 6.3, end: 6.5, word: "or" },
    { at: 6.5, end: 6.8, word: "just" },
    { at: 6.9, end: 7.3, word: "rest" },
    { at: 7.9, end: 8.0, word: "the" },
    { at: 8.1, end: 8.4, word: "fix" },
  ],
  seconds: { min: 3, max: 14, demo: 10 },
  mediaSlots: 0,
  credit: { name: "\"Scrabble tile character story\" on prompt-motion.com", url: "https://prompt-motion.com/anilraok-eff262" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} width={width} height={height} duration={duration} cues={cues} />,
});
