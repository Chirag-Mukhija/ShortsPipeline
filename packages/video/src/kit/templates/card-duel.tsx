// Card duel: two pixel-art trading cards are dealt face-down onto a game board, flip, and fight: each spoken hit makes one card wind up and strike the other, knocking its health down until one is defeated and an optional verdict ribbon names the winner.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const ICON_NAMES = ["sword", "shield", "heart", "flame", "coin", "clock", "book", "house", "bolt", "star", "leaf"] as const;
type IconName = (typeof ICON_NAMES)[number];

const card = z.object({
  name: z.string().min(1).max(14).describe("Card name, ≤ 14 characters, e.g. 'Home cooking'"),
  icon: z.enum(ICON_NAMES).describe("Pixel art in the card's window: sword, shield, heart, flame, coin, clock, book, house, bolt, star, leaf"),
  power: z.number().int().min(0).max(99).describe("Number on the card's power badge (bottom left), e.g. its strength or score"),
  health: z.number().int().min(1).max(99).describe("Starting number on the health badge (bottom right); hits on this card count it down"),
  ability: z.string().max(40).optional().describe("One short line of card text under the art, ≤ 40 characters, e.g. 'Cheap, and you learn a skill'"),
  word: z.string().optional().describe("Spoken word the card lands on the board"),
});

const schema = z.object({
  title: z.string().max(30).optional().describe("Match title typed at the top, ≤ 5 words, e.g. 'Dinner showdown'"),
  titleWord: z.string().optional().describe("Spoken word the title starts typing on"),
  left: card.describe("The left card (accent colour), dealt first"),
  right: card.describe("The right card (second accent colour), dealt second"),
  versus: z.string().min(1).max(4).default("VS").describe("Small emblem between the cards, ≤ 4 characters"),
  hits: z
    .array(
      z.object({
        from: z.enum(["left", "right"]).describe("Which card strikes"),
        amount: z.number().int().min(1).max(99).describe("Health the struck card loses; a card at 0 is defeated (cracks and tips over)"),
        label: z.string().max(14).optional().describe("What the hit is, ≤ 14 characters, tagged on the struck card, e.g. 'Saves money'"),
        word: z.string().optional().describe("Spoken word the strike lands on (wind-up starts ~0.4 s before)"),
      }),
    )
    .max(3)
    .default([])
    .describe("0–3 strikes in spoken order, at least ~1 s apart"),
  verdict: z
    .object({
      text: z.string().min(1).max(28).describe("The result, ≤ 28 characters, typed on a ribbon at the bottom, e.g. 'Home cooking wins the week'"),
      side: z.enum(["left", "right"]).optional().describe("The winning card; default: the card with more health left"),
      word: z.string().optional().describe("Spoken word the ribbon opens on; default: after the last hit"),
    })
    .optional()
    .describe("Ribbon naming the winner; the winning card rises and glows"),
});

type Props = z.infer<typeof schema>;
type Side = "left" | "right";

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// Pixel things (art, sparks, embers) move on 12 fps steps; cards and camera stay smooth.
const step = (t: number) => Math.floor(t * 12) / 12;
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const outC = Easing.out(Easing.cubic);
const inQ = Easing.in(Easing.quad);
const sinE = Easing.inOut(Easing.sin);

// Perceived brightness 0–255 of a hex or rgb() colour; unknown formats count as light.
const lum = (c: string) => {
  let r = 255;
  let g = 255;
  let b = 255;
  const hex = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const rgb = c.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/./g, "$&$&") : hex[1]!;
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (rgb) [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Card art, 12 × 12. o outline · a tone · A tone light · d tone dark · l light · m muted · w wood
const ICONS: Record<IconName, string[]> = {
  sword: [".........ooo", "........olmo", ".......olmo.", "......olmo..", ".....olmo...", ".oo.olmo....", ".oaoomo.....", "..oaao......", "..owaao.....", ".owo.oao....", "owo...oo....", "oo.........."],
  shield: ["............", ".oooooooooo.", ".oAAaaaaado.", ".oAaallaado.", ".oAllllllao.", ".oaaallaado.", ".oaaallaado.", "..oaallado..", "..oaaaaddo..", "...oaaddo...", "....oddo....", ".....oo....."],
  heart: ["............", ".ooo....ooo.", "oAAao..oaaao", "oAaaaooaaado", "oAaaaaaaaado", "oaaaaaaaaado", ".oaaaaaaado.", "..oaaaaado..", "...oaaado...", "....oado....", ".....oo.....", "............"],
  flame: [".....o......", "....oao.....", "....oaao....", "...oaAao.o..", "..oaaAaaoao.", "..oaAAlaaao.", ".oaaAllAaao.", ".oaAlllAaado", ".oaAlllaaado", "..oaAlaaado.", "...oaaaddo..", "....oooo...."],
  coin: ["...oooooo...", ".ooaaaaaaoo.", ".oaAAaaaaao.", "oaAaaddaaado", "oaAadaadaado", "oaaadaaaaado", "oaaaadaaaado", "oaaaaadaaado", "oaaadaadaado", ".oaaaddaaao.", ".oodaaaaddo.", "...oooooo..."],
  clock: ["...oooooo...", "..oaaaaaao..", ".oallllllao.", "oallllmlllao", "oalllldlllao", "oalllldddlao", "oallllllllao", "oalmllllllao", ".oallllllao.", "..oaaaaaao..", "...oooooo...", "............"],
  book: ["............", "............", ".ooo....ooo.", "ollloooolllo", "olmmllolmmlo", "ollllolllllo", "olmmlolmmllo", "ollllolllllo", "olmmlolmmllo", "ollllolllllo", "oaaaaoaaaaao", ".oooooooooo."],
  house: [".....oo.....", "....oaao....", "...oaaaao...", "..oaaAaaao..", ".oaaAaaaaao.", "oooooooooooo", ".ollllllllo.", ".ollwwlmmlo.", ".ollwwlmmlo.", ".ollwwllllo.", ".ollwwllllo.", ".oooooooooo."],
  bolt: ["......oooo..", ".....oAao...", "....oAao....", "...oAao.....", "..oAaooooo..", ".oAaaaaaao..", ".ooooaaao...", "....oaao....", "...oaao.....", "..oado......", ".odo........", ".oo........."],
  star: [".....oo.....", "....oAao....", "....oAao....", "ooooAaaaoooo", "oAAaaaaaaado", ".oaaaaaaado.", "..oaaaaaao..", "..oaaaaaao..", ".oaaaooaaao.", ".oaaoo.oaao.", "oaao....oado", "ooo......ooo"],
  leaf: ["..........oo", "......oooaao", "....ooaaaado", "...oaaAaadao", "..oaAAaadaao", "..oaAaadaado", ".oaaadaaaado", ".oaadaaaado.", ".oadaaaddo..", "..odooooo...", ".odo........", "oo.........."],
};
// Badge glyphs, 7 × 7: power (a bolt) and health (a heart).
const GLYPH_POWER = ["...oo..", "..oo...", ".oo....", "ooooo..", "...oo..", "..oo...", ".oo...."];
const GLYPH_HEALTH = [".oo.oo.", "ooooooo", "ooooooo", ".ooooo.", "..ooo..", "...o...", "......."];

// A box with stepped (pixel) corners and a thick border, as one SVG.
const PixelBox: FC<{ w: number; h: number; q: number; notch: number; fill: string; border: string }> = ({ w, h, q, notch, fill, border }) => {
  const poly = (i: number, n: number) => {
    const x0 = i;
    const y0 = i;
    const x1 = w - i;
    const y1 = h - i;
    return `${x0 + n},${y0} ${x1 - n},${y0} ${x1 - n},${y0 + n} ${x1},${y0 + n} ${x1},${y1 - n} ${x1 - n},${y1 - n} ${x1 - n},${y1} ${x0 + n},${y1} ${x0 + n},${y1 - n} ${x0},${y1 - n} ${x0},${y0 + n} ${x0 + n},${y0 + n}`;
  };
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} shapeRendering="crispEdges">
      <polygon points={poly(0, notch)} fill={border} />
      <polygon points={poly(q, notch > 0 ? Math.max(0, notch - q / 2) : 0)} fill={fill} />
    </svg>
  );
};

const Pixels: FC<{ rows: string[]; x: number; y: number; unit: number; colors: Record<string, string>; reveal?: number; seed?: number }> = ({ rows, x, y, unit, colors, reveal = 1, seed = 0 }) => {
  const out: ReactNode[] = [];
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx]!;
      if (c === ".") continue;
      if (reveal < 1 && hash(rx * 13.1 + ry * 7.7 + seed) > reveal) continue;
      out.push(<rect key={`${rx}-${ry}`} x={x + rx * unit} y={y + ry * unit} width={unit + 0.5} height={unit + 0.5} fill={colors[c] ?? colors.o} />);
    }
  });
  return <>{out}</>;
};

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const calm: Style = { ...style, motion: "calm" };
  const dark = lum(style.bg) < 110;
  const narrow = W < 1400;
  const hand = style.motion === "hand";
  const O = dark ? mix(style.bg, 82, style.ink) : style.ink;
  const light = dark ? style.ink : style.surface;
  const tone: Record<Side, string> = { left: style.accent, right: style.accent2 };
  // Text on a tone fill: dark ink on bright tones, light on deep ones.
  const onTone = (c: string) => (lum(c) < 105 ? (dark ? style.ink : style.surface) : dark ? style.bg : style.ink);
  const ts = step(t);

  // ---- Layout ----
  const m = narrow ? 48 : 96;
  const titleSize = (narrow ? 52 : 60) * (hand ? 1.2 : 1);
  const titleLines = props.title ? Math.max(1, Math.ceil((props.title.length * titleSize * 0.52) / (W - m * 2))) : 0;
  const titleTop = H * 0.06;
  const titleBottom = titleTop + titleLines * titleSize * 1.12;
  const vSize = (narrow ? 46 : 52) * (hand ? 1.3 : 1);
  const ribbonH = Math.round(vSize * 1.3 + 36);
  const ribbonTop = H - (narrow ? 44 : 52) - ribbonH;
  const regionTop = props.title ? titleBottom + 48 : H * 0.08;
  const regionBottom = props.verdict ? ribbonTop - 30 : H - 56;
  const bs = narrow ? 82 : 92;
  const avail = regionBottom - regionTop - bs * 0.5;
  let ch = Math.min(avail, H * 0.62);
  const cw = Math.round(Math.min(ch * 0.7, narrow ? W * 0.36 : W * 0.245));
  ch = Math.round(Math.min(ch, cw / 0.7));
  const cy = regionTop + (avail - ch) / 2 + ch / 2;
  const cx: Record<Side, number> = { left: narrow ? W * 0.24 : W * 0.3, right: narrow ? W * 0.76 : W * 0.7 };
  // In the narrow panel the badges sit near the edges, so strikes knock back less and the camera doesn't lean in.
  const knock = narrow ? 20 : 36;
  const hitPush = narrow ? 1 : 1.04;
  const gap = cx.right - cx.left - cw;
  const reach = gap + Math.min(28, cw * 0.06);
  const q = Math.max(5, Math.round(cw / 60));
  const notch = Math.min(q * 2, Math.max(q, Math.round(style.radius / 2)));
  const u = Math.max(5, Math.round(cw / 64));

  // ---- Timing ----
  const playAt: Record<Side, number> = { left: 0, right: 0 };
  playAt.left = Math.min(Math.max(cueAt(cues, props.left.word, 0.6), 0.55), duration - 2);
  playAt.right = Math.min(Math.max(cueAt(cues, props.right.word, playAt.left + 1.0), playAt.left + 0.6), duration - 1.4);
  const hits = props.hits;
  const verdictNeed = props.verdict ? 0.4 + props.verdict.text.length / 30 + 0.3 : 0.5;
  const hitFirst = playAt.right + 1.2;
  const hitLast = Math.max(hitFirst, duration - 0.6 - 0.8 - verdictNeed);
  const hitT: number[] = [];
  hits.forEach((h, k) => {
    const fb = hits.length === 1 ? hitFirst : hitFirst + (k * (hitLast - hitFirst)) / (hits.length - 1);
    let T = cueAt(cues, h.word, fb + 0.05) - 0.05;
    T = Math.max(T, playAt.right + 0.8);
    if (k > 0) T = Math.max(T, hitT[k - 1]! + 1.0);
    hitT.push(Math.min(T, duration - 1.4));
  });
  const lastEvent = hits.length ? hitT[hits.length - 1]! : playAt.right;
  const verdictAt = props.verdict ? Math.min(cueAt(cues, props.verdict.word, lastEvent + 0.9) - 0.05, duration - 1.2) : 0;
  const vText = props.verdict?.text ?? "";
  const vCps = Math.max(30, vText.length / Math.max(0.3, duration - 0.6 - (verdictAt + 0.35)));
  const titleAt = cueAt(cues, props.titleWord, 0.25) - 0.05;

  // Health over time, and when a card falls to 0.
  const other = (s: Side): Side => (s === "left" ? "right" : "left");
  const healthAt = (side: Side, time: number) => {
    let h = props[side].health;
    hits.forEach((hit, k) => {
      if (other(hit.from) === side && time >= hitT[k]! + 0.08) h -= hit.amount;
    });
    return Math.max(0, h);
  };
  const koAt: Record<Side, number | null> = { left: null, right: null };
  hits.forEach((hit, k) => {
    const d = other(hit.from);
    if (koAt[d] === null && healthAt(d, hitT[k]! + 0.1) === 0) koAt[d] = hitT[k]!;
  });
  const endH = { left: healthAt("left", 1e9), right: healthAt("right", 1e9) };
  const winner: Side | null = props.verdict?.side ?? (endH.left > endH.right ? "left" : endH.right > endH.left ? "right" : null);
  const winAt = props.verdict ? verdictAt : lastEvent + 0.7;
  const showWin = winner !== null && (props.verdict !== undefined || hits.length > 0);

  // ---- Camera: born close on the empty board, pulls back, leans toward each strike, settles wide. ----
  type Shot = { s: number; x: number; y: number };
  const wide: Shot = { s: 1, x: W / 2, y: cy };
  const open: Shot = { s: 1.1, x: W / 2, y: cy };
  const moves: { a: number; b: number; to: Shot; ease: (x: number) => number }[] = [{ a: 0.1, b: 1.1, to: wide, ease: outC }];
  let lastEnd = 1.1;
  hits.forEach((hit, k) => {
    const T = hitT[k]!;
    const contactX = hit.from === "left" ? cx.right - cw / 2 : cx.left + cw / 2;
    const a = Math.max(lastEnd, T - 0.7);
    const b = Math.max(a + 0.35, T - 0.1);
    moves.push({ a, b, to: { s: hitPush, x: narrow ? W / 2 : W / 2 + (contactX - W / 2) * 0.35, y: cy }, ease: sinE });
    lastEnd = b;
  });
  if (hits.length) {
    const b = Math.min(duration - 0.6, Math.max(lastEnd + 1.0, lastEvent + 1.3));
    const a = Math.max(lastEnd, Math.min(lastEvent + 0.4, b - 0.6));
    moves.push({ a, b, to: wide, ease: outC });
  }
  let cam = open;
  for (const mv of moves) {
    if (t >= mv.b) {
      cam = mv.to;
      continue;
    }
    if (t > mv.a) {
      const p = mv.ease((t - mv.a) / (mv.b - mv.a));
      cam = { s: cam.s + (mv.to.s - cam.s) * p, x: cam.x + (mv.to.x - cam.x) * p, y: cam.y + (mv.to.y - cam.y) * p };
    }
    break;
  }
  const impact =
    hitT.reduce((acc, T) => acc + (t >= T ? 0.02 * Math.exp(-(t - T) * 7) : 0), 0) +
    (["left", "right"] as Side[]).reduce((acc, s) => acc + (t >= playAt[s] ? 0.01 * Math.exp(-(t - playAt[s]) * 8) : 0), 0);
  const cs = cam.s * (1 + impact) * (1 + 0.005 * Math.sin((2 * Math.PI * t) / 8));
  const camX = Math.min(Math.max(cam.x + 3 * Math.sin((2 * Math.PI * t) / 7), W / (2 * cs)), W - W / (2 * cs));
  const camY = Math.min(Math.max(cam.y, H / (2 * cs)), H - H / (2 * cs));
  const camT = `translate(${W / 2 - camX * cs}px, ${H / 2 - camY * cs}px) scale(${cs})`;

  // ---- Board ----
  const boardTop = cy - ch / 2 - Math.max(36, ch * 0.08);
  const boardBottom = cy + ch / 2 + bs * 0.5 + Math.max(24, ch * 0.05);
  const tile = u * 3;
  const boardIn = step(clamp01(t / 0.5));
  const borderTiles = Array.from({ length: Math.ceil((W * 3) / tile) }, (_, i) => {
    const x = -W + i * tile;
    if (x >= 0 && boardIn < 1 && x >= W * boardIn) return null;
    const c = i % 2 ? mix(style.muted, dark ? 42 : 34, style.bg) : mix(style.muted, dark ? 28 : 22, style.bg);
    return (
      <g key={`bt${i}`}>
        <rect x={x} y={boardTop - u} width={tile} height={u * 2} fill={c} />
        <rect x={x} y={boardBottom - u} width={tile} height={u * 2} fill={c} />
      </g>
    );
  });
  const embers = Array.from({ length: narrow ? 12 : 18 }, (_, i) => {
    const span = boardBottom - boardTop;
    const speed = 26 + hash(i * 3.3) * 30;
    const y = boardBottom - ((hash(i * 7.1) * span + ts * speed) % span);
    const x = hash(i * 5.9 + 1) * W;
    const a = enter(calm, frame, fps, 0.3 + hash(i) * 0.6, 0.5);
    return <rect key={`em${i}`} x={Math.round(x / u) * u} y={Math.round(y / u) * u} width={u} height={u} fill={i % 2 ? tone.left : tone.right} opacity={a * 0.28} />;
  });
  const slots = (["left", "right"] as Side[]).map((s) => {
    const a = enter(calm, frame, fps, 0.2 + (s === "right" ? 0.1 : 0), 0.4) * (1 - seg(t, playAt[s], playAt[s] + 0.2));
    return (
      <rect
        key={`sl${s}`}
        x={cx[s] - cw / 2}
        y={cy - ch / 2}
        width={cw}
        height={ch}
        fill={mix(style.muted, 8)}
        stroke={mix(style.muted, 60, style.bg)}
        strokeWidth={u * 0.8}
        strokeDasharray={`${u * 2} ${u * 2}`}
        opacity={a}
      />
    );
  });
  const pools = (["left", "right"] as Side[]).map((s) => <ellipse key={`pl${s}`} cx={cx[s]} cy={cy} rx={cw * 0.95} ry={ch * 0.62} fill={`url(#kit-cd-pool-${s})`} opacity={seg(t, playAt[s] - 0.1, playAt[s] + 0.4)} />);

  // ---- Card motion ----
  type Pose = { visible: boolean; front: boolean; x: number; y: number; r: number; s: number; sx: number };
  const pose = (side: Side): Pose => {
    const dir = side === "left" ? 1 : -1;
    const at = playAt[side];
    const pose: Pose = { visible: t >= at - 0.5, front: true, x: cx[side], y: cy, r: 0, s: 1, sx: 1 };
    if (!pose.visible) return pose;
    // Dealt from off-board (left from below, right from above), flipping face-up in flight, then a slam on landing.
    if (t < at) {
      const f = outC(seg(t, at - 0.5, at));
      pose.x = cx[side] - dir * W * 0.22 * (1 - f);
      pose.y = cy + dir * H * 0.85 * (1 - f);
      pose.r = -dir * 22 * (1 - f);
      const ang = 180 * (1 - sinE(seg(t, at - 0.36, at - 0.06)));
      pose.front = ang < 90;
      pose.sx = Math.max(0.02, Math.abs(Math.cos((ang * Math.PI) / 180)));
    } else {
      const dt = t - at;
      pose.s = 1 + (style.motion === "calm" ? 0.035 : 0.06) * Math.exp(-dt * 9) * Math.cos(dt * 22);
    }
    // Strikes: wind up away, snap into the other card, follow through back home. Being struck: knocked back.
    hits.forEach((hit, k) => {
      const T = hitT[k]!;
      if (hit.from === side) {
        if (t >= T - 0.38 && t < T - 0.12) {
          const p = outC(seg(t, T - 0.38, T - 0.12));
          pose.x -= dir * 40 * p;
          pose.s *= 1 + 0.05 * p;
          pose.r -= dir * 3 * p;
        } else if (t >= T - 0.12 && t < T) {
          const p = inQ(seg(t, T - 0.12, T));
          pose.x += dir * (-40 + (reach + 40) * p);
          pose.s *= 1.05;
          pose.r += dir * (-3 + 7 * p);
        } else if (t >= T && t < T + 0.5) {
          const p = outC(seg(t, T, T + 0.5));
          pose.x += dir * reach * (1 - p);
          pose.s *= 1.05 - 0.05 * p;
          pose.r += dir * 4 * (1 - p);
        }
      } else if (t >= T && t < T + 0.9) {
        const dt = t - T;
        const k2 = dt < 0.06 ? dt / 0.06 : Math.exp(-(dt - 0.06) * 7);
        pose.x -= dir * knock * k2;
        pose.r -= dir * 2.5 * k2;
      }
    });
    const ko = koAt[side];
    if (ko !== null) {
      const d = outC(seg(t, ko + 0.35, ko + 0.85));
      pose.r -= dir * 6 * d;
      pose.y += 26 * d;
    }
    if (showWin && winner === side) pose.y -= 16 * enter(style, frame, fps, winAt, 0.5);
    return pose;
  };
  const poses = { left: pose("left"), right: pose("right") };
  const striking = hits.findIndex((_, k) => t >= hitT[k]! - 0.4 && t < hitT[k]! + 0.5);
  const topSide: Side = striking >= 0 ? hits[striking]!.from : "right";

  // ---- One card ----
  const pad = Math.round(cw * 0.055);
  const nb = Math.round(cw * 0.15);
  const inner = cw - q * 2 - pad * 2;
  const artTop = q + pad + nb + 12;
  const abilityFs = (narrow ? 32 : 36) * (hand ? 1.15 : 1);
  const renderCard = (side: Side) => {
    const c = props[side];
    const p = poses[side];
    if (!p.visible) return null;
    const col = tone[side];
    const artH = Math.round(c.ability ? ch * 0.42 : ch * 0.56);
    // Handwriting runs narrower and smaller-looking, so it gets more size for the same width.
    const nameFs = hand ? Math.max(34, Math.min(nb * 0.78, (inner - 24) / (c.name.length * 0.46))) : Math.max(30, Math.min(nb * 0.62, (inner - 24) / (c.name.length * 0.6)));
    const Pi = Math.max(4, Math.floor(Math.min(inner, artH) * 0.62 / 12));
    const landed = t >= playAt[side];
    const bobPx = landed && t > playAt[side] + 0.5 ? (Math.floor((ts - playAt[side]) / 0.8) % 2) * -Pi * 0.5 : 0;
    const artColors: Record<string, string> = { o: O, a: col, A: mix(col, 50, light), d: mix(col, 62, O), l: light, m: style.muted, w: mix(style.muted, 78, O) };

    // Struck: a local flash, a damage number, a label tag on the art.
    let flash = 0;
    let dmg = null as { n: number; dt: number; by: Side } | null;
    let tag = null as string | null;
    hits.forEach((hit, k) => {
      if (other(hit.from) !== side) return;
      const T = hitT[k]!;
      if (t >= T) {
        flash = Math.max(flash, 0.55 * Math.exp(-(t - T) * 12));
        if (t < T + 1.25) dmg = { n: hit.amount, dt: t - T, by: hit.from };
        const next = hitT[k + 1];
        if (hit.label && t >= T + 0.12 && (next === undefined || t < next - 0.05)) tag = hit.label;
      }
    });
    const hNow = healthAt(side, t);
    const lastDrop = hits.reduce((acc, hit, k) => (other(hit.from) === side && t >= hitT[k]! + 0.08 ? hitT[k]! + 0.08 : acc), -1);
    const hPop = lastDrop >= 0 ? 1 + 0.4 * Math.exp(-(t - lastDrop) * 9) : 1;
    const ko = koAt[side];
    const koP = ko !== null ? outC(seg(t, ko + 0.3, ko + 0.8)) : 0;
    const crackP = ko !== null ? seg(ts, ko + 0.12, ko + 0.42) : 0;
    const glowP = showWin && winner === side ? enter(style, frame, fps, winAt, 0.5) : 0;

    // Crack: a stepped zig-zag across the art window, seeded per side.
    const crackPts: string[] = [];
    if (crackP > 0) {
      let x = inner * (0.2 + hash(side === "left" ? 1 : 2) * 0.2);
      let y = 0;
      const n = 7;
      crackPts.push(`${x},${y}`);
      for (let i = 1; i <= n; i++) {
        y = (artH * i) / n;
        crackPts.push(`${x},${y}`);
        x = Math.min(inner - u, Math.max(u, x + (hash(i * 3.7 + (side === "left" ? 0 : 9)) - 0.35) * inner * 0.22));
        crackPts.push(`${x},${y}`);
      }
    }
    const badge = (which: "power" | "health") => {
      const val = which === "power" ? c.power : hNow;
      const fill = which === "power" ? col : hNow === 0 ? style.muted : mix(col, 55, O);
      const txt = onTone(which === "power" ? col : style.muted);
      // The live health badge is a darkened tone, so light text; at 0 it turns muted.
      const healthTxt = hNow === 0 ? onTone(style.muted) : light;
      const g = which === "power" ? GLYPH_POWER : GLYPH_HEALTH;
      const gu = Math.max(3, Math.round(bs / 30));
      return (
        <div
          key={which}
          style={{
            position: "absolute",
            left: which === "power" ? -bs * 0.18 : cw - bs * 0.82,
            top: ch - bs * 0.58,
            width: bs,
            height: bs,
            transform: which === "health" ? `scale(${hPop})` : undefined,
          }}
        >
          <PixelBox w={bs} h={bs} q={q} notch={Math.max(q, notch)} fill={fill} border={O} />
          <svg width={7 * gu} height={7 * gu} style={{ position: "absolute", left: (bs - 7 * gu) / 2, top: q + 6 }} shapeRendering="crispEdges">
            <Pixels rows={g} x={0} y={0} unit={gu} colors={{ o: which === "power" ? txt : healthTxt }} />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: q + 6 + 7 * gu, bottom: q + 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.mono, fontWeight: 600, fontSize: bs * 0.46, color: which === "power" ? txt : healthTxt, fontVariantNumeric: "tabular-nums" }}>
            {val}
          </div>
        </div>
      );
    };

    const face = (
      <>
        {glowP > 0.01 ? (
          // Two stepped rings around the winner, the outer one fainter.
          <svg width={cw + q * 12} height={ch + q * 12} style={{ position: "absolute", left: -q * 6, top: -q * 6, overflow: "visible" }} shapeRendering="crispEdges">
            {[
              { d: 2.5, o: 0.6 },
              { d: 4.5, o: 0.25 },
            ].map(({ d, o }) => (
              <rect key={d} x={q * 6 - q * d * glowP} y={q * 6 - q * d * glowP} width={cw + q * 2 * d * glowP} height={ch + q * 2 * d * glowP} fill="none" stroke={col} strokeWidth={q * 1.4} opacity={o * glowP} />
            ))}
          </svg>
        ) : null}
        <PixelBox w={cw} h={ch} q={q} notch={notch} fill={style.surface} border={O} />
        {/* Name banner */}
        <div style={{ position: "absolute", left: q + pad, top: q + pad, width: inner, height: nb }}>
          <PixelBox w={inner} h={nb} q={Math.max(3, Math.round(q / 2))} notch={Math.round(notch / 2)} fill={mix(col, dark ? 30 : 22, style.surface)} border={O} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.display, fontWeight: 700, fontSize: nameFs, color: style.ink, whiteSpace: "nowrap" }}>{c.name}</div>
        </div>
        {/* Art window */}
        <svg width={inner} height={artH} style={{ position: "absolute", left: q + pad, top: artTop }} shapeRendering="crispEdges">
          <rect width={inner} height={artH} fill={mix(col, dark ? 24 : 18, style.surface)} />
          <rect width={inner} height={artH} fill={`url(#kit-cd-dith-${side})`} />
          <rect y={artH * 0.72} width={inner} height={artH * 0.28} fill={mix(col, dark ? 34 : 28, style.surface)} />
          <rect x={inner / 2 - 5 * Pi} y={artH * 0.5 + 6 * Pi - Pi * 0.4} width={10 * Pi} height={Pi * 0.8} fill={O} opacity={0.2} />
          <Pixels rows={ICONS[c.icon]} x={inner / 2 - 6 * Pi} y={artH * 0.5 - 6 * Pi + bobPx} unit={Pi} colors={artColors} />
          {crackP > 0 ? (
            <>
              <polyline points={crackPts.join(" ")} fill="none" stroke={light} strokeWidth={u * 0.6} transform={`translate(${u * 0.5} 0)`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crackP} />
              <polyline points={crackPts.join(" ")} fill="none" stroke={O} strokeWidth={u * 0.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - crackP} />
            </>
          ) : null}
          <rect width={inner} height={artH} fill="none" stroke={O} strokeWidth={Math.max(3, q * 0.7)} />
        </svg>
        {/* Card text */}
        {c.ability ? (
          <div
            style={{
              position: "absolute",
              left: q + pad,
              top: artTop + artH + 14,
              width: inner,
              bottom: bs * 0.6 + 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: style.body,
              fontWeight: 600,
              fontSize: abilityFs,
              lineHeight: 1.2,
              color: style.ink,
              padding: "0 8px",
              boxSizing: "border-box",
              ...({ textWrap: "balance" } as object),
            }}
          >
            {c.ability}
          </div>
        ) : null}
        {/* Struck: flash, defeat tint */}
        {flash > 0.01 ? <div style={{ position: "absolute", left: q, top: q, right: q, bottom: q, background: light, opacity: flash }} /> : null}
        {koP > 0 ? <div style={{ position: "absolute", left: q, top: q, right: q, bottom: q, background: mix(style.bg, 100), opacity: 0.45 * koP }} /> : null}
        {badge("power")}
        {badge("health")}
        {/* Damage number and hit tag sit on the art */}
        {dmg
          ? (() => {
              const d = dmg as { n: number; dt: number; by: Side };
              const sc = d.dt < 0.12 ? 0.4 + 0.8 * (d.dt / 0.12) : 1 + 0.2 * Math.exp(-(d.dt - 0.12) * 10);
              const fs = Math.min(132, artH * 0.5);
              const o = Math.max(4, Math.round(fs / 18));
              const sh = [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]].map(([a, b]) => `${a}px ${b}px 0 ${O}`).join(", ");
              return (
                <div
                  style={{
                    position: "absolute",
                    left: q + pad,
                    width: inner,
                    top: artTop + artH * 0.42 - fs * 0.5 - Math.round((outC(clamp01(d.dt / 0.9)) * artH * 0.12) / u) * u,
                    textAlign: "center",
                    fontFamily: style.mono,
                    fontWeight: 600,
                    fontSize: fs,
                    lineHeight: 1,
                    color: tone[d.by],
                    textShadow: sh,
                    opacity: 1 - seg(d.dt, 0.95, 1.25),
                    transform: `scale(${sc})`,
                  }}
                >
                  -{d.n}
                </div>
              );
            })()
          : null}
        {tag
          ? (() => {
              const s = tag as string;
              const tf = narrow ? 30 : 32;
              const tw = Math.min(inner - 12, s.length * tf * 0.6 + 36);
              const th = Math.round(tf * 1.25 + 14);
              return (
                <div style={{ position: "absolute", left: q + pad + (inner - tw) / 2, top: artTop + artH - th - 10, width: tw, height: th }}>
                  <PixelBox w={tw} h={th} q={4} notch={4} fill={O} border={col} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.mono, fontWeight: 600, fontSize: tf, color: light, whiteSpace: "nowrap" }}>{s}</div>
                </div>
              );
            })()
          : null}
      </>
    );

    const back = (
      <>
        <PixelBox w={cw} h={ch} q={q} notch={notch} fill={col} border={O} />
        <svg width={cw} height={ch} style={{ position: "absolute", left: 0, top: 0 }} shapeRendering="crispEdges">
          <rect x={q * 3} y={q * 3} width={cw - q * 6} height={ch - q * 6} fill={`url(#kit-cd-back-${side})`} stroke={mix(col, 55, O)} strokeWidth={q} />
          <polygon points={`${cw / 2},${ch / 2 - cw * 0.22} ${cw / 2 + cw * 0.22},${ch / 2} ${cw / 2},${ch / 2 + cw * 0.22} ${cw / 2 - cw * 0.22},${ch / 2}`} fill={mix(col, 60, light)} stroke={O} strokeWidth={q} />
        </svg>
      </>
    );

    return (
      <div
        key={`card-${side}`}
        style={{
          position: "absolute",
          left: p.x - cw / 2,
          top: p.y - ch / 2,
          width: cw,
          height: ch,
          transform: `rotate(${p.r}deg) scale(${p.sx * p.s}, ${p.s})`,
          transformOrigin: "50% 60%",
          zIndex: side === topSide ? 3 : 2,
        }}
      >
        {p.front ? face : back}
      </div>
    );
  };

  // Shadows under the cards follow them.
  const shadows = (["left", "right"] as Side[]).map((s) => {
    const p = poses[s];
    if (!p.visible) return null;
    const near = seg(t, playAt[s] - 0.3, playAt[s]);
    return <rect key={`sh${s}`} x={p.x - cw * 0.46} y={cy + ch / 2 - u} width={cw * 0.92} height={u * 3} fill={O} opacity={0.2 * near} />;
  });

  // Sparks: landing dust at the card feet and a burst at each point of contact.
  const sparks: ReactNode[] = [];
  (["left", "right"] as Side[]).forEach((s) => {
    const e = (ts - step(playAt[s])) / 0.35;
    if (e < 0 || e >= 1) return;
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1;
      const d = (0.3 + (i % 3) * 0.35) * 70 * outC(e);
      sparks.push(<rect key={`ds${s}${i}`} x={cx[s] + side * (cw / 2 + d) - u / 2} y={cy + ch / 2 - u * (1 + (i % 3)) - e * 20} width={u} height={u} fill={mix(style.muted, 70, style.bg)} opacity={1 - e} />);
    }
  });
  hits.forEach((hit, k) => {
    const T = hitT[k]!;
    const e = (ts - step(T)) / 0.45;
    if (e < 0 || e >= 1) return;
    const x0 = hit.from === "left" ? cx.right - cw / 2 : cx.left + cw / 2;
    const y0 = cy - ch * 0.08;
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.3;
      const r = (12 + 150 * Easing.out(Easing.quad)(e)) * (0.7 + hash(i + k * 11) * 0.5);
      const sz = u * (e < 0.5 ? 2 : 1);
      sparks.push(<rect key={`hs${k}-${i}`} x={Math.round((x0 + Math.cos(ang) * r) / u) * u - sz / 2} y={Math.round((y0 + Math.sin(ang) * r) / u) * u - sz / 2} width={sz} height={sz} fill={i % 2 ? tone[hit.from] : light} opacity={e < 0.7 ? 1 : 0.5} />);
    }
  });
  if (showWin && winner) {
    const e = (ts - step(winAt)) / 0.5;
    if (e >= 0 && e < 1)
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const r = cw * 0.6 + 120 * outC(e);
        sparks.push(<rect key={`ws${i}`} x={cx[winner] + Math.cos(ang) * r - u} y={cy - 16 + Math.sin(ang) * r * (ch / cw) * 0.8 - u} width={u * 2} height={u * 2} fill={i % 2 ? tone[winner] : light} opacity={1 - e} />);
      }
  }

  // VS emblem on the centre line, slammed in when the second card lands.
  const vsAt = playAt.right + 0.1;
  const vsE = t >= vsAt ? (style.motion === "calm" ? 1 + 0.1 * Math.exp(-(t - vsAt) * 10) : 1 + 0.4 * Math.exp(-(t - vsAt) * 9) * Math.cos((t - vsAt) * 18)) : 0;
  const vsFs = (narrow ? 40 : 56) * (hand ? 1.1 : 1);
  const vsW = Math.min(Math.max(gap - 16, vsFs * 1.6), props.versus.length * vsFs * 0.62 + 36);
  const vsH = vsFs * 1.2 + 16;

  // ---- HUD ----
  const titleChars = props.title ? Math.max(0, Math.floor((t - titleAt) * 26)) : 0;
  const titleTyping = props.title && titleChars > 0 && titleChars < props.title.length;
  const vIn = props.verdict ? enter(style, frame, fps, verdictAt, 0.4) : 0;
  const vChars = props.verdict ? Math.max(0, Math.floor((t - verdictAt - 0.3) * vCps)) : 0;
  const ribbonFill = winner ? tone[winner] : style.ink;
  const ribbonInk = winner ? onTone(ribbonFill) : style.surface;
  const ribbonW = Math.min(W - m * 2, vText.length * vSize * (hand ? 0.48 : 0.56) + 96);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${mix(style.accent2, dark ? 12 : 8, style.bg)} 0%, ${style.bg} 70%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: camT, transformOrigin: "0 0" }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} shapeRendering="crispEdges">
          <defs>
            {(["left", "right"] as Side[]).map((s) => (
              <g key={`df${s}`}>
                <pattern id={`kit-cd-dith-${s}`} width={u * 2} height={u * 2} patternUnits="userSpaceOnUse">
                  <rect width={u} height={u} fill={mix(tone[s], dark ? 16 : 12)} />
                  <rect x={u} y={u} width={u} height={u} fill={mix(tone[s], dark ? 16 : 12)} />
                </pattern>
                <pattern id={`kit-cd-back-${s}`} width={u * 6} height={u * 6} patternUnits="userSpaceOnUse">
                  <rect width={u * 6} height={u * 6} fill={mix(tone[s], 80, O)} />
                  <rect x={u * 2.5} y={0} width={u} height={u * 6} fill={mix(tone[s], 60, light)} opacity={0.5} />
                  <rect x={0} y={u * 2.5} width={u * 6} height={u} fill={mix(tone[s], 60, light)} opacity={0.5} />
                </pattern>
                <radialGradient id={`kit-cd-pool-${s}`}>
                  <stop offset="0%" stopColor={mix(tone[s], dark ? 22 : 16)} />
                  <stop offset="100%" stopColor={mix(tone[s], 0)} />
                </radialGradient>
              </g>
            ))}
          </defs>
          <rect x={-W} y={boardTop} width={W * 3} height={boardBottom - boardTop} fill={mix(style.surface, dark ? 55 : 45, style.bg)} opacity={boardIn} />
          {Array.from({ length: Math.ceil((boardBottom - boardTop) / (u * 4)) }, (_, i) => (
            <rect key={`cl${i}`} x={W / 2 - u / 2} y={boardTop + i * u * 4 + u} width={u} height={u * 2} fill={mix(style.muted, 40, style.bg)} opacity={boardIn} />
          ))}
          {borderTiles}
          {pools}
          {embers}
          {slots}
          {shadows}
        </svg>
        <div style={{ position: "absolute", left: W / 2 - vsW / 2, top: cy - vsH / 2, width: vsW, height: vsH, transform: `scale(${vsE})`, zIndex: 1 }}>
          <PixelBox w={vsW} h={vsH} q={q} notch={q * 2} fill={O} border={mix(style.muted, 60, O)} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.mono, fontWeight: 600, fontSize: vsFs, color: light }}>{props.versus}</div>
        </div>
        {renderCard("left")}
        {renderCard("right")}
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", zIndex: 4 }} shapeRendering="crispEdges">
          {sparks}
        </svg>
      </div>

      {props.title ? (
        <div style={{ position: "absolute", left: m, right: m, top: titleTop, textAlign: "center", fontFamily: style.display, fontWeight: 600, fontSize: titleSize, lineHeight: 1.12, color: style.ink, letterSpacing: "-0.01em" }}>
          {props.title.slice(0, titleChars)}
          {titleTyping ? <span style={{ display: "inline-block", width: titleSize * 0.42, height: titleSize * 0.8, marginLeft: 6, background: style.accent, verticalAlign: "-0.08em" }} /> : null}
          <span style={{ visibility: "hidden" }}>{props.title.slice(titleChars)}</span>
        </div>
      ) : null}
      {props.verdict && vIn > 0.01 ? (
        <div style={{ position: "absolute", left: (W - ribbonW) / 2, top: ribbonTop + Math.round(((1 - vIn) * 70) / q) * q, width: ribbonW, height: ribbonH }}>
          <div style={{ position: "absolute", left: -q * 5, top: q * 3, width: q * 10, height: ribbonH - q * 2 }}>
            <PixelBox w={q * 10} h={ribbonH - q * 2} q={q} notch={0} fill={mix(ribbonFill, 65, O)} border={O} />
          </div>
          <div style={{ position: "absolute", right: -q * 5, top: q * 3, width: q * 10, height: ribbonH - q * 2 }}>
            <PixelBox w={q * 10} h={ribbonH - q * 2} q={q} notch={0} fill={mix(ribbonFill, 65, O)} border={O} />
          </div>
          <PixelBox w={ribbonW} h={ribbonH} q={q} notch={notch} fill={ribbonFill} border={O} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.display, fontWeight: 700, fontSize: vSize, color: ribbonInk, whiteSpace: "nowrap" }}>
            <span>
              {vText.slice(0, vChars)}
              <span style={{ visibility: "hidden" }}>{vText.slice(vChars)}</span>
            </span>
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,${dark ? 0.4 : 0.14}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "card-duel",
  title: "Card duel",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "A playful head-to-head as a pixel-art card battle: two options, habits, products or ideas become trading cards (name ≤ 14 characters, a pixel icon, a power number, a health number, one ≤ 40-character card text) dealt face-down onto a game board, each flipping and slamming down on its word. Then 0–3 strikes on spoken words: a card winds up and smashes into the other, a burst, a '-N' damage number and a ≤ 14-character tag ('Saves money') on the struck card while its health ticks down; a card at 0 cracks and tips over. Optional match title and a verdict ribbon that names the winner (the winner rises and glows). Good for 'X vs Y' with a clear winner, pros knocking down cons, a habit beating an excuse, music-only versus beats. No media.",
  avoid:
    "Serious or sad comparisons (it reads as a game), comparisons with three or more options, nuanced trade-offs with no winner (use compare-split), long text, more than three strikes (split across segments), and using it twice in a row. Cards are generic: never depict a real brand, product logo or person on them.",
  schema,
  example: {
    title: "Dinner showdown",
    titleWord: "dinner",
    left: { name: "Home cooking", icon: "flame", power: 6, health: 8, ability: "Cheap, and you learn a skill", word: "cooking" },
    right: { name: "Delivery", icon: "clock", power: 4, health: 7, ability: "Fast, but the fees add up", word: "delivery" },
    versus: "VS",
    hits: [
      { from: "left", amount: 4, label: "Saves money", word: "money" },
      { from: "right", amount: 3, label: "Takes time", word: "time" },
      { from: "left", amount: 3, label: "Healthier", word: "healthier" },
    ],
    verdict: { text: "Home cooking wins the week", side: "left", word: "wins" },
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.6, word: "Dinner" },
    { at: 0.8, end: 1.2, word: "cooking" },
    { at: 1.9, end: 2.4, word: "delivery" },
    { at: 3.2, end: 3.6, word: "money" },
    { at: 4.5, end: 4.8, word: "time" },
    { at: 5.8, end: 6.3, word: "healthier" },
    { at: 7.1, end: 7.4, word: "wins" },
  ],
  seconds: { min: 4, max: 14, demo: 10 },
  mediaSlots: 0,
  credit: { name: "'Pixel art card battle game' by @aisongman (prompt-motion.com)", url: "https://prompt-motion.com/aisongman-71ffac" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
