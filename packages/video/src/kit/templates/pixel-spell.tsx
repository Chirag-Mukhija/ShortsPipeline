// Pixel spell: a pixel-art wizard on a retro game stage casts a spell per spoken word, and each bolt lands on a pedestal and conjures a pixel item with its label; optional quest title, XP-style meter and an RPG dialog box that types itself.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const ITEMS = ["coin", "gem", "heart", "star", "key", "potion", "scroll", "chest", "bolt"] as const;
type Item = (typeof ITEMS)[number];

const schema = z.object({
  title: z.string().max(30).optional().describe("Quest title typed in at the top, ≤ 5 words, e.g. 'Three habits, one week'"),
  titleWord: z.string().optional().describe("Spoken word the title starts typing on"),
  hero: z
    .object({
      name: z.string().max(12).optional().describe("Who the wizard stands for, e.g. 'You' or 'Morning you'; shown on the dialog tab (or on the ground)"),
      robe: z.enum(["accent", "accent2"]).default("accent").describe("Robe and hat colour from the style; the staff gem and spells take the other accent"),
    })
    .default({ robe: "accent" })
    .describe("The pixel wizard on the left"),
  spells: z
    .array(
      z.object({
        item: z.enum(ITEMS).describe("Pixel item the spell conjures: coin, gem, heart, star, key, potion, scroll, chest, bolt"),
        label: z.string().min(1).max(12).describe("What the item stands for, ≤ 12 characters, typed on the pedestal, e.g. 'Drink water'"),
        tag: z.string().max(5).optional().describe("Tiny badge on the item, e.g. '+10', 'x2', 'LV 3'"),
        word: z.string().optional().describe("Spoken word the item lands on (the cast starts half a second before)"),
      }),
    )
    .min(1)
    .max(3)
    .describe("1–3 casts in spoken order, one item each, at least ~1.2 s apart"),
  meter: z
    .object({
      label: z.string().min(1).max(10).describe("Meter name, e.g. 'Energy', 'XP', 'Savings'"),
      from: z.number().min(0).max(100).default(0).describe("Start fill, 0–100"),
      to: z.number().min(0).max(100).describe("End fill, 0–100"),
      word: z.string().optional().describe("Spoken word it fills on; default: after the last cast"),
    })
    .optional()
    .describe("A segmented game meter in the HUD that fills in steps"),
  dialog: z
    .object({
      text: z.string().min(1).max(72).describe("One line the hero says, ≤ 72 characters, typed out RPG-style"),
      word: z.string().optional().describe("Spoken word the box opens on; default: after the last cast"),
    })
    .optional()
    .describe("RPG dialog box at the bottom with the hero's name tab"),
});

type Props = z.infer<typeof schema>;

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// Pixel art moves on 12 fps steps; the camera and UI stay smooth.
const step = (t: number) => Math.floor(t * 12) / 12;

// Is the style's background dark? Reads hex or rgb(); anything else counts as light.
const isDark = (c: string) => {
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
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

// The wizard's body, 15 × 26, facing right; arm, staff and gem are drawn per pose on top.
// o outline · h hat · g hat band (gem colour) · s skin · e eye · b beard · r robe · d robe shade
const BODY = [
  "...oo..........",
  "..ohho.........",
  "...ohho........",
  "....ohho.......",
  "....ohhho......",
  "...ohhhhho.....",
  "...ohhhhhho....",
  "..ohggggggho...",
  "oooooooooooooo.",
  "...osssssssso..",
  "...ossssssesso.",
  "...ossssssssso.",
  "..obbbbbbbbbbo.",
  "..obbbbbbbbbbo.",
  "..orbbbbbbbbro.",
  ".ordrbbbbbbrro.",
  ".orddrbbbbrrro.",
  ".orddrrbbrrrro.",
  ".orddrrrrrrrro.",
  "orrddrrrrrrrrro",
  "orrddrrrrrrrrro",
  "orrddrrrrrrrrro",
  "orrddrrrrrrrrro",
  ".ooooooooooooo.",
  "..ooo.....ooo..",
  "..oooo....oooo.",
];

type Pose = { staff: [number, number, number, number]; gem: [number, number]; hand: [number, number]; sleeve: [number, number, number, number] };
const POSES: Record<"idle" | "charge" | "release", Pose> = {
  idle: { staff: [17, 25, 17, 6], gem: [17, 4], hand: [16, 13], sleeve: [12, 14, 15, 13] },
  charge: { staff: [17, 19, 17, 1], gem: [17, -1], hand: [16, 8], sleeve: [12, 13, 15, 9] },
  release: { staff: [13, 22, 21, 6], gem: [22, 4], hand: [16, 13], sleeve: [12, 14, 15, 14] },
};
// The sprite's grid box: columns 0–23, rows −3–25.
const GRID_W = 24;
const GRID_TOP = -3;
const GRID_ROWS = 29;

const line = (x0: number, y0: number, x1: number, y1: number, put: (x: number, y: number) => void) => {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    put(x, y);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
};

type Px = { x: number; y: number; c: string };
const wizardPixels = (pose: Pose, blink: boolean, bob: number): Px[] => {
  const map = new Map<string, Px>();
  const put = (x: number, y: number, c: string) => map.set(`${x},${y}`, { x, y, c });
  BODY.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let c = row[x]!;
      if (c === ".") continue;
      if (c === "e" && blink) c = "s";
      put(x, y < 23 ? y + bob : y, c);
    }
  });
  const [sx0, sy0, sx1, sy1] = pose.staff;
  line(sx0, sy0 + bob, sx1, sy1 + bob, (x, y) => (y <= 25 ? put(x, y, "w") : undefined));
  const [gx, gy] = [pose.gem[0], pose.gem[1] + bob];
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2], [-2, 0], [2, 0]] as const) put(gx + dx, gy + dy, "o");
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) put(gx + dx, gy + dy, "g");
  put(gx, gy, "G");
  const [a0, b0, a1, b1] = pose.sleeve;
  line(a0, b0 + bob, a1, b1 + bob, (x, y) => {
    put(x, y, "d");
    put(x, y + 1, "d");
  });
  const [hx, hy] = [pose.hand[0], pose.hand[1] + bob];
  put(hx, hy, "s");
  put(hx + 1, hy, "s");
  put(hx, hy + 1, "s");
  put(hx + 1, hy + 1, "o");
  return [...map.values()];
};

// Items, 12 × 12. o outline · a accent · A accent light · d accent dark · b accent2 · B accent2 light · e accent2 dark · l light · m muted · w wood
const ICONS: Record<Item, string[]> = {
  coin: ["...oooooo...", ".ooaaaaaaoo.", ".oaAAaaaaao.", "oaAaddddaado", "oaAdaaaadado", "oaadaAAadado", "oaadaAAadado", "oaadaaaadado", "oaaaddddaddo", ".oaaaaaaddo.", ".oodaaaddoo.", "...oooooo..."],
  gem: ["............", "...oooooo...", "..oBBbbbbo..", ".oBBbbbbeeo.", "oeeeeeeeeeeo", "oBbbbbbbbeeo", ".oBbbbbbeeo.", "..obbbbbeo..", "...obbbeo...", "....obeo....", ".....oo.....", "............"],
  heart: ["............", ".ooo....ooo.", "oAAao..oaaao", "oAaaaooaaado", "oAaaaaaaaado", "oaaaaaaaaado", ".oaaaaaaado.", "..oaaaaado..", "...oaaado...", "....oado....", ".....oo.....", "............"],
  star: [".....oo.....", "....oAao....", "....oAao....", "ooooAaaaoooo", "oAAaaaaaaado", ".oaaaaaaado.", "..oaaaaaao..", "..oaaaaaao..", ".oaaaooaaao.", ".oaaoo.oaao.", "oaao....oado", "ooo......ooo"],
  key: ["............", "............", "............", ".oooo.......", "obbbbo......", "oBoobooooooo", "oBoobBbbbbbo", "obbbbooooeeo", ".oooo....oeo", ".........ooo", "............", "............"],
  potion: ["....oooo....", "....owwo....", "....oooo....", "....ollo....", "...oolloo...", "..ollllllo..", ".oBbbbbbbbo.", "oBbbbbbbbbeo", "oBbbbbbbbbeo", "obbbbbbbbeeo", ".obbbbbbeeo.", "..oooooooo.."],
  scroll: ["............", ".oooooooooo.", "owwwwwwwwwwo", ".oooooooooo.", ".ollllllllo.", ".olmmmmmmlo.", ".ollllllllo.", ".olmmmmlllo.", ".ollllllllo.", ".oooooooooo.", "owwwwwwwwwwo", ".oooooooooo."],
  chest: ["............", "............", "..oooooooo..", ".owwwwwwwwo.", "owwwwwwwwwwo", "oaaaaooaaaao", "oooooAAooooo", "owwwwaawwwwo", "owwwwwwwwwwo", "oaaaaaaaaaao", "oooooooooooo", "............"],
  bolt: ["......oooo..", ".....oAao...", "....oAao....", "...oAao.....", "..oAaooooo..", ".oAaaaaaao..", ".ooooaaao...", "....oaao....", "...oaao.....", "..oado......", ".odo........", ".oo........."],
};

// A box with stepped (pixel) corners and a thick border, as one SVG.
const PixelBox: FC<{ w: number; h: number; q: number; notch: number; fill: string; border: string }> =({ w, h, q, notch, fill, border }) => {
  const poly = (i: number, n: number) => {
    const x0 = i;
    const y0 = i;
    const x1 = w - i;
    const y1 = h - i;
    return `${x0 + n},${y0} ${x1 - n},${y0} ${x1 - n},${y0 + n} ${x1},${y0 + n} ${x1},${y1 - n} ${x1 - n},${y1 - n} ${x1 - n},${y1} ${x0 + n},${y1} ${x0 + n},${y1 - n} ${x0},${y1 - n} ${x0},${y0 + n} ${x0 + n},${y0 + n}`;
  };
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }} shapeRendering="crispEdges">
      <polygon points={poly(0, notch)} fill={border} />
      <polygon points={poly(q, notch > 0 ? Math.max(0, notch - q / 2) : 0)} fill={fill} />
    </svg>
  );
};

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const calm: Style = { ...style, motion: "calm" };
  const dark = isDark(style.bg);
  const narrow = W < 1400;
  const spells = props.spells;
  const n = spells.length;

  // Palette from tokens: dark themes get a dark-grey outline so sprites keep a rim against the background.
  const O = dark ? mix(style.bg, 82, style.ink) : style.ink;
  const light = dark ? style.ink : style.surface;
  const robe = style[props.hero.robe];
  const gemC = props.hero.robe === "accent" ? style.accent2 : style.accent;
  const WIZ: Record<string, string> = {
    o: O,
    h: robe,
    g: gemC,
    G: mix(gemC, 40, light),
    s: mix(light, 80, style.accent),
    e: O,
    b: light,
    r: robe,
    d: mix(robe, 62, O),
    w: mix(style.muted, 78, O),
  };
  const ICON: Record<string, string> = {
    o: O,
    a: style.accent,
    A: mix(style.accent, 50, light),
    d: mix(style.accent, 62, O),
    b: style.accent2,
    B: mix(style.accent2, 50, light),
    e: mix(style.accent2, 62, O),
    l: light,
    m: style.muted,
    w: mix(style.muted, 78, O),
  };

  // ---- Layout ----
  const m = narrow ? 56 : 84;
  const titleSize = (narrow ? 54 : 64) * (style.motion === "hand" ? 1.2 : 1);
  const meterW = narrow ? W - m * 2 : 470;
  const titleW = narrow || !props.meter ? W - m * 2 : W - m * 2 - meterW - 48;
  const titleLines = props.title ? Math.max(1, Math.ceil((props.title.length * titleSize * 0.52) / titleW)) : 0;
  const hudTop = H * 0.065;
  const titleBottom = props.title ? hudTop + titleLines * titleSize * 1.12 : hudTop;
  const meterTop = narrow ? (props.title ? titleBottom + 18 : hudTop) : hudTop + (props.title ? (titleSize * 1.12 - 44) / 2 : 0);
  const hudBottom = Math.max(props.title ? titleBottom : 0, props.meter ? meterTop + 44 : 0, H * 0.05);

  const dlgFont = narrow ? 42 : 46;
  const dlgPad = narrow ? 30 : 36;
  const q = narrow ? 6 : 8;
  const dlgInner = W - m * 2 - dlgPad * 2 - q * 2;
  const dlgLines = props.dialog ? Math.max(1, Math.ceil((props.dialog.text.length * dlgFont * 0.54 * 1.08) / dlgInner)) : 0;
  const dlgH = dlgLines * dlgFont * 1.3 + dlgPad * 2 + q * 2;
  const dlgTop = H - (narrow ? 44 : 52) - dlgH;
  const stageBottom = props.dialog ? dlgTop - (props.hero.name ? 64 : 30) : H - 40;
  const groundH = narrow ? 64 : 76;
  const gy = stageBottom - groundH;
  const stageTop = hudBottom + 36;
  const stageH = gy - stageTop;

  const P = Math.max(6, Math.floor(Math.min((stageH * 0.86) / GRID_ROWS, (W * 0.25) / GRID_W)));
  const wizX = m;
  const wizY0 = gy - 26 * P; // top of grid row 0
  const wizRight = wizX + GRID_W * P;
  const regionX0 = wizRight + (narrow ? 16 : 56);
  const slotW = (W - m - regionX0) / n;
  const slotX = (k: number) => regionX0 + slotW * (k + 0.5);

  const pw = Math.min(slotW * 0.86, P * 24);
  const labInner = pw - q * 4 - 12;
  const maxLen = Math.max(...spells.map((s) => s.label.length));
  const lf = Math.max(28, Math.min(narrow ? 34 : 38, labInner / (maxLen * 0.6)));
  const labLines = lf * maxLen * 0.6 > labInner ? 2 : 1;
  const faceH = labLines * lf * 1.2 + 22;
  const capH = q * 2;
  const pedH = capH + faceH + q * 2;
  const pedTop = gy - pedH;
  const Pi = Math.max(5, Math.floor(Math.min((slotW * 0.56) / 12, P * 0.9, (pedTop - 22 - stageTop - 46) / 12)));
  const itemCY = pedTop - 22 - 6 * Pi;

  // ---- Timing ----
  const dialogText = props.dialog?.text ?? "";
  const typeCps = 30;
  const dlgNeed = props.dialog ? 0.3 + dialogText.length / typeCps + 0.3 : 0;
  const firstT = 1.05;
  const lastFall = Math.max(firstT, duration - 0.6 - 0.75 - dlgNeed);
  const times: number[] = [];
  spells.forEach((s, k) => {
    const fb = n === 1 ? firstT : firstT + (k * (lastFall - firstT)) / (n - 1);
    let T = cueAt(cues, s.word, fb + 0.08) - 0.08;
    T = Math.min(Math.max(T, 0.85), duration - 1.3);
    if (k > 0) T = Math.max(T, times[k - 1]! + 0.75);
    times.push(Math.min(T, duration - 1.3));
  });
  const lastT = times[n - 1]!;
  const titleAt = cueAt(cues, props.titleWord, 0.3) - 0.05;
  const meterAt = props.meter ? Math.min(cueAt(cues, props.meter.word, lastT + 0.5) - 0.08, duration - 1.5) : 0;
  const dlgAt = props.dialog ? Math.min(cueAt(cues, props.dialog.word, lastT + 0.8) - 0.1, duration - 0.6 - 0.6) : 0;
  const dlgCps = props.dialog ? Math.max(typeCps, dialogText.length / Math.max(0.3, duration - 0.6 - (dlgAt + 0.3))) : typeCps;

  // Wizard pose now: charge (staff up, gem glows) → release (staff thrust) → idle.
  let poseName: keyof typeof POSES = "idle";
  let glow = 0;
  for (const T of times) {
    if (t >= T - 0.55 && t < T - 0.3) poseName = "charge";
    else if (t >= T - 0.3 && t < T + 0.18) poseName = "release";
    glow = Math.max(glow, clamp01((t - (T - 0.55)) / 0.25) * (1 - clamp01((t - (T - 0.2)) / 0.4)));
  }
  const ts = step(t);
  const bob = poseName === "idle" && t > 0.7 ? Math.floor(ts / 0.75) % 2 : 0;
  const blinkPh = (ts + 0.4) % 3.3;
  const blink = blinkPh < 0.13 && t > 0.8;
  const pose = POSES[poseName];
  const wizPx = wizardPixels(pose, blink, bob);
  const wizReveal = clamp01((ts - 0.12) / 0.5);
  const gemAt = (pname: keyof typeof POSES) => ({ x: wizX + (POSES[pname].gem[0] + 0.5) * P, y: wizY0 + (POSES[pname].gem[1] + 0.5 + (pname === "idle" ? bob : 0)) * P });

  // ---- Camera: born close on the wizard, pulls back, glides a little toward each target, a small impact on each landing. ----
  type Shot = { s: number; x: number; y: number };
  const wide: Shot = { s: 1, x: W / 2, y: H / 2 };
  const open: Shot = { s: 1.1, x: wizX + 12 * P, y: wizY0 + 10 * P };
  const moves: { a: number; b: number; to: Shot; ease: (x: number) => number }[] = [{ a: 0.25, b: 1.15, to: wide, ease: Easing.out(Easing.cubic) }];
  let lastEnd = 1.15;
  times.forEach((T, k) => {
    const a = Math.max(lastEnd, T - 0.75);
    const b = Math.max(a + 0.4, T - 0.15);
    moves.push({ a, b, to: { s: 1.06, x: Math.min(W / 2 + (slotX(k) - W / 2) * 0.12, W / (2 * 1.06) + wizX - m * 0.6), y: (stageTop + gy) / 2 + 40 }, ease: Easing.inOut(Easing.sin) });
    lastEnd = b;
  });
  {
    const b = Math.min(duration - 0.6, Math.max(lastEnd + 0.9, lastT + 1.4));
    const a = Math.max(lastEnd, Math.min(lastT + 0.55, b - 0.6));
    moves.push({ a, b, to: wide, ease: Easing.out(Easing.cubic) });
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
  const impact = times.reduce((acc, T) => acc + (t >= T ? 0.022 * Math.exp(-(t - T) * 7) : 0), 0);
  const cs = cam.s * (1 + impact) * (1 + 0.005 * Math.sin((2 * Math.PI * t) / 8));
  const cx = Math.min(Math.max(cam.x + 3 * Math.sin((2 * Math.PI * t) / 7), W / (2 * cs)), W - W / (2 * cs));
  const cy = Math.min(Math.max(cam.y, H / (2 * cs)), H - H / (2 * cs));
  const camT = `translate(${W / 2 - cx * cs}px, ${H / 2 - cy * cs}px) scale(${cs})`;

  // ---- World pieces ----
  const unit = Math.max(4, Math.round(P / 3));
  const stars = Array.from({ length: narrow ? 16 : 26 }, (_, i) => {
    const x = hash(i * 3.1 + 1) * W;
    const y = stageTop * 0.2 + hash(i * 7.3 + 2) * (gy - stageTop * 0.2 - P * 4);
    const on = hash(Math.floor(t * 2.5) * 0.37 + i * 11.1) > 0.35;
    const big = hash(i * 5.7) > 0.7;
    const a = enter(calm, frame, fps, 0.1 + hash(i) * 0.5, 0.4);
    return (
      <g key={`st${i}`} opacity={a * (on ? 0.75 : 0.3)} fill={mix(style.ink, dark ? 55 : 40, style.bg)}>
        <rect x={x} y={y} width={unit} height={unit} />
        {big ? (
          <>
            <rect x={x - unit} y={y} width={unit} height={unit} />
            <rect x={x + unit} y={y} width={unit} height={unit} />
            <rect x={x} y={y - unit} width={unit} height={unit} />
            <rect x={x} y={y + unit} width={unit} height={unit} />
          </>
        ) : null}
      </g>
    );
  });

  // Ground: a row of blocks that lays itself left to right, then a dithered earth below.
  const tile = P * 2;
  const groundReveal = step(clamp01(t / 0.55));
  const nTiles = Math.ceil((W * 3) / tile);
  const tiles = Array.from({ length: nTiles }, (_, i) => {
    const x = -W + i * tile;
    if (x >= 0 && groundReveal < 1 && x >= W * groundReveal) return null;
    const alt = i % 2 === 0;
    return (
      <g key={`tl${i}`}>
        <rect x={x} y={gy} width={tile} height={P} fill={alt ? mix(style.muted, 55, style.bg) : mix(style.muted, 42, style.bg)} />
        <rect x={x} y={gy} width={tile} height={Math.max(2, P / 3)} fill={mix(light, 55, style.muted)} opacity={0.7} />
        {hash(i * 2.3) > 0.6 ? <rect x={x + P * 0.5} y={gy + P * 1.6} width={unit} height={unit} fill={mix(style.muted, 40, style.bg)} /> : null}
      </g>
    );
  });

  // Pedestals rise out of the ground in pixel steps.
  const pedestals = spells.map((_, k) => {
    const rise = enter(calm, frame, fps, 0.3 + k * 0.1, 0.5);
    const off = Math.round(((1 - rise) * pedH) / q) * q;
    const x = slotX(k) - pw / 2;
    const stone = mix(style.muted, dark ? 40 : 30, style.surface);
    return (
      <g key={`pd${k}`} transform={`translate(0 ${off})`}>
        <rect x={x - q} y={pedTop} width={pw + q * 2} height={capH} fill={O} />
        <rect x={x} y={pedTop + q * 0.5} width={pw} height={capH - q} fill={mix(light, 70, stone)} />
        <rect x={x + q} y={pedTop + capH} width={pw - q * 2} height={faceH} fill={O} />
        <rect x={x + q * 2} y={pedTop + capH} width={pw - q * 4} height={faceH} fill={stone} />
        <rect x={x + q * 2} y={pedTop + capH} width={q} height={faceH} fill={mix(light, 35, stone)} />
        <rect x={x} y={pedTop + capH + faceH} width={pw} height={q * 2} fill={O} />
        <rect x={x + q} y={pedTop + capH + faceH + q * 0.5} width={pw - q * 2} height={q} fill={mix(O, 50, stone)} />
      </g>
    );
  });

  // Items: dither in on the landing, drop a pixel and bounce, then float on a slow 1-pixel bob.
  const items = spells.map((s, k) => {
    const T = times[k]!;
    if (t < T) return null;
    const dt = ts - step(T);
    const p = clamp01(dt / 0.25);
    const drop = [-3, -2, -1, 0, 1, 0][Math.min(5, Math.floor(dt * 12))]!;
    const float = dt > 0.6 ? (Math.floor((dt - 0.6) / 0.8 + k * 0.5) % 2) * -1 : 0;
    const ox = slotX(k) - 6 * Pi;
    const oy = itemCY - 6 * Pi + (drop + float) * Math.max(2, Math.round(Pi / 2));
    const rects: ReactNode[] = [];
    ICONS[s.item].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x]!;
        if (c === ".") continue;
        if (p < 1 && hash(x * 13.1 + y * 7.7 + k * 31.3) > p) continue;
        rects.push(<rect key={`${x}-${y}`} x={ox + x * Pi} y={oy + y * Pi} width={Pi + 0.5} height={Pi + 0.5} fill={ICON[c]} />);
      }
    });
    return (
      <g key={`it${k}`}>
        <rect x={slotX(k) - 4 * Pi} y={pedTop - Pi * 0.6} width={8 * Pi} height={Pi * 0.6} fill={O} opacity={0.22 * p} />
        {rects}
      </g>
    );
  });

  // Projectiles: a 3×3 orb on 12 fps steps from the gem to the pedestal, with a fading trail.
  const projectiles = spells.map((_, k) => {
    const T = times[k]!;
    const a = T - 0.3;
    const dur = 0.28;
    if (t < a || t >= T) return null;
    const from = gemAt("release");
    const to = { x: slotX(k), y: itemCY };
    const at = (tt: number) => {
      const p = clamp01((tt - a) / dur);
      const arc = Math.abs(to.x - from.x) * 0.22;
      return { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - arc * 4 * p * (1 - p) };
    };
    const snap = (v: number) => Math.round(v / unit) * unit;
    const out: ReactNode[] = [];
    [3, 2, 1].forEach((back) => {
      const tt = ts - back / 12;
      if (tt < a) return;
      const pt = at(tt);
      const sz = unit * (back === 1 ? 2 : 1);
      out.push(<rect key={`tr${back}`} x={snap(pt.x) - sz / 2} y={snap(pt.y) - sz / 2} width={sz} height={sz} fill={gemC} opacity={1 - back * 0.25} />);
    });
    const pt = at(ts);
    const x = snap(pt.x);
    const y = snap(pt.y);
    out.push(
      <g key="orb">
        <rect x={x - unit * 1.5} y={y - unit * 1.5} width={unit * 3} height={unit * 3} fill={gemC} />
        <rect x={x - unit * 0.5} y={y - unit * 0.5} width={unit} height={unit} fill={light} />
        <rect x={x - unit * 2.5} y={y - unit * 2.5} width={unit * 5} height={unit * 5} fill={gemC} opacity={0.25} />
      </g>,
    );
    return <g key={`pj${k}`}>{out}</g>;
  });

  // Sparks: converge on the gem while charging; burst from the item on landing.
  const sparks = spells.flatMap((_, k) => {
    const T = times[k]!;
    const out: ReactNode[] = [];
    const ch = (ts - (T - 0.55)) / 0.25;
    if (ch >= 0 && ch < 1) {
      const g = gemAt("charge");
      [45, 135, 225, 315, 0, 180].forEach((deg, i) => {
        const r = (1 - ch) * P * (i < 4 ? 6 : 8);
        const x = g.x + Math.cos((deg * Math.PI) / 180) * r;
        const y = g.y + Math.sin((deg * Math.PI) / 180) * r;
        out.push(<rect key={`c${k}-${i}`} x={Math.round(x / unit) * unit - unit / 2} y={Math.round(y / unit) * unit - unit / 2} width={unit} height={unit} fill={i % 2 ? light : gemC} />);
      });
    }
    const bt = ts - step(T);
    if (bt >= 0 && bt < 0.42) {
      const e = bt / 0.42;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const r = (2.5 + 7 * Easing.out(Easing.quad)(e)) * Pi;
        const sz = Pi * (e < 0.5 ? 1 : 0.6);
        const x = slotX(k) + Math.cos(ang) * r;
        const y = itemCY + Math.sin(ang) * r;
        out.push(<rect key={`b${k}-${i}`} x={x - sz / 2} y={y - sz / 2} width={sz} height={sz} fill={i % 2 ? gemC : light} opacity={e < 0.7 ? 1 : 0.5} />);
      }
    }
    return out;
  });

  // Gem halo while charging (glow lives on the object only).
  const gNow = gemAt(poseName);
  const halo = glow > 0.02 ? (
    <g opacity={Math.round(glow * 4) / 4}>
      <rect x={gNow.x - P * 3.5} y={gNow.y - P * 3.5} width={P * 7} height={P * 7} fill={gemC} opacity={0.12} />
      <rect x={gNow.x - P * 2.5} y={gNow.y - P * 2.5} width={P * 5} height={P * 5} fill={gemC} opacity={0.2} />
    </g>
  ) : null;

  const wizard = wizPx
    .filter((px) => wizReveal >= 1 || hash(px.x * 17.3 + px.y * 5.9) < wizReveal)
    .map((px) => <rect key={`w${px.x},${px.y}`} x={wizX + px.x * P} y={wizY0 + px.y * P} width={P + 0.5} height={P + 0.5} fill={WIZ[px.c] ?? O} />);

  // Labels typed onto the pedestal faces; tags pop on the item.
  const labels = spells.map((s, k) => {
    const T = times[k]!;
    const chars = Math.max(0, Math.floor((t - (T + 0.12)) * 30));
    if (chars <= 0) return null;
    const x = slotX(k) - pw / 2 + q * 2;
    return (
      <div
        key={`lb${k}`}
        style={{
          position: "absolute",
          left: x,
          top: pedTop + capH,
          width: pw - q * 4,
          height: faceH,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: style.mono,
          fontWeight: 600,
          fontSize: lf,
          lineHeight: 1.2,
          color: style.ink,
          padding: "0 6px",
          boxSizing: "border-box",
        }}
      >
        <span>
          {s.label.slice(0, chars)}
          <span style={{ visibility: "hidden" }}>{s.label.slice(chars)}</span>
        </span>
      </div>
    );
  });
  const tags = spells.map((s, k) => {
    if (!s.tag) return null;
    const T = times[k]!;
    const pop = enter(style, frame, fps, T + 0.22, 0.35);
    if (pop <= 0.01) return null;
    const tf = narrow ? 30 : 34;
    const tw = s.tag.length * tf * 0.6 + 28;
    const th = tf * 1.25 + 10;
    return (
      <div
        key={`tg${k}`}
        style={{
          position: "absolute",
          left: slotX(k) + 3 * Pi,
          top: itemCY - 6 * Pi - th * 0.55,
          width: tw,
          height: th,
          transform: `scale(${Math.round(pop * 8) / 8})`,
          transformOrigin: "0% 100%",
        }}
      >
        <PixelBox w={tw} h={th} q={4} notch={4} fill={O} border={gemC} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.mono, fontWeight: 600, fontSize: tf, color: light }}>{s.tag}</div>
      </div>
    );
  });

  // ---- HUD (outside the camera) ----
  const titleChars = props.title ? Math.max(0, Math.floor((t - titleAt) * 26)) : 0;
  const titleTyping = props.title && titleChars > 0 && titleChars < props.title.length;
  const notch = Math.min(q * 2, Math.round(style.radius / 2));

  const meterFill = props.meter ? props.meter.from + (props.meter.to - props.meter.from) * (Math.floor(clamp01((t - meterAt) / 0.8) * 10) / 10) : 0;
  const meterIn = props.meter ? enter(style, frame, fps, 0.45, 0.45) : 0;
  const meterLabelW = props.meter ? props.meter.label.length * 30 * 0.6 + 24 : 0;
  const barW = meterW - meterLabelW;

  const dlgIn = props.dialog ? enter(style, frame, fps, dlgAt, 0.35) : 0;
  const dlgChars = props.dialog ? Math.max(0, Math.floor((t - dlgAt - 0.3) * dlgCps)) : 0;
  const dlgDone = props.dialog ? dlgChars >= dialogText.length : false;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${style.bg} 0%, ${mix(style.accent2, dark ? 14 : 10, style.bg)} 100%)`, overflow: "hidden" }}>
      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: camT, transformOrigin: "0 0" }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} shapeRendering="crispEdges">
          <defs>
            <pattern id="kit-ps-dither" width={unit * 2} height={unit * 2} patternUnits="userSpaceOnUse">
              <rect width={unit} height={unit} fill={mix(style.accent2, dark ? 22 : 16, style.bg)} />
              <rect x={unit} y={unit} width={unit} height={unit} fill={mix(style.accent2, dark ? 22 : 16, style.bg)} />
            </pattern>
            <pattern id="kit-ps-earth" width={tile * 2} height={tile} patternUnits="userSpaceOnUse">
              <rect width={tile * 2} height={tile} fill={mix(style.muted, 20, style.bg)} />
              <rect width={tile * 2} height={unit} fill={mix(style.muted, 32, style.bg)} />
              <rect x={tile * 0.5} y={0} width={unit} height={tile / 2} fill={mix(style.muted, 32, style.bg)} />
              <rect x={0} y={tile / 2} width={tile * 2} height={unit} fill={mix(style.muted, 32, style.bg)} />
              <rect x={tile * 1.5} y={tile / 2} width={unit} height={tile / 2} fill={mix(style.muted, 32, style.bg)} />
              <rect x={tile * 0.5 + unit} y={unit} width={unit} height={unit} fill={mix(style.muted, 12, style.bg)} />
            </pattern>
            <radialGradient id="kit-ps-pool">
              <stop offset="0%" stopColor={mix(style.accent, dark ? 16 : 12)} />
              <stop offset="100%" stopColor={mix(style.accent, 0)} />
            </radialGradient>
          </defs>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="transparent" />
          {stars}
          <ellipse cx={W * 0.5} cy={gy - stageH * 0.3} rx={W * 0.55} ry={stageH * 0.75} fill="url(#kit-ps-pool)" />
          <rect x={-W} y={gy - unit * 6} width={W * 3} height={unit * 6} fill="url(#kit-ps-dither)" opacity={0.55 * groundReveal} />
          <rect x={-W} y={gy - unit * 2} width={W * 3} height={unit * 2} fill="url(#kit-ps-dither)" opacity={groundReveal} />
          <rect x={-W} y={gy + P} width={W * 3} height={H * 2} fill="url(#kit-ps-earth)" opacity={groundReveal} />
          {tiles}
          <svg x={-W} y={-H} width={W * 3} height={H + gy} viewBox={`${-W} ${-H} ${W * 3} ${H + gy}`} overflow="hidden">
            {pedestals}
          </svg>
          <rect x={wizX - 2 * P} y={gy - P * 0.6} width={18 * P} height={P * 0.6} fill={O} opacity={0.22 * wizReveal} />
          {halo}
          {wizard}
          {items}
          {projectiles}
          {sparks}
        </svg>
        {labels}
        {tags}
        {!props.dialog && props.hero.name ? (
          <div
            style={{
              position: "absolute",
              left: wizX - 40,
              width: 15 * P + 80,
              top: gy + P + 10,
              textAlign: "center",
              fontFamily: style.mono,
              fontWeight: 600,
              fontSize: 30,
              color: style.ink,
              opacity: enter(style, frame, fps, 0.6, 0.4),
            }}
          >
            {props.hero.name}
          </div>
        ) : null}
      </div>

      {/* HUD: quest title, meter, dialog box. */}
      {props.title ? (
        <div style={{ position: "absolute", left: m, top: hudTop, width: titleW, fontFamily: style.display, fontWeight: 600, fontSize: titleSize, lineHeight: 1.12, color: style.ink, letterSpacing: "-0.01em" }}>
          {props.title.slice(0, titleChars)}
          {titleTyping ? <span style={{ display: "inline-block", width: titleSize * 0.42, height: titleSize * 0.8, marginLeft: 6, background: style.accent, verticalAlign: "-0.08em" }} /> : null}
          <span style={{ visibility: "hidden" }}>{props.title.slice(titleChars)}</span>
        </div>
      ) : null}
      {props.meter ? (
        <div style={{ position: "absolute", left: narrow ? m : W - m - meterW, top: meterTop, width: meterW, height: 44, opacity: meterIn, display: "flex", alignItems: "center" }}>
          <div style={{ width: meterLabelW, fontFamily: style.mono, fontWeight: 600, fontSize: 30, color: style.ink }}>{props.meter.label}</div>
          <div style={{ position: "relative", width: barW, height: 40 }}>
            <PixelBox w={barW} h={40} q={4} notch={4} fill={mix(style.ink, 10, style.bg)} border={style.ink} />
            {Array.from({ length: 10 }, (_, i) => {
              const segW = (barW - 8 - 4 * 11) / 10;
              const on = (i + 1) * 10 <= Math.round(meterFill);
              return <div key={i} style={{ position: "absolute", left: 4 + 4 + i * (segW + 4), top: 8, width: segW, height: 24, background: on ? style.accent : "transparent", boxShadow: on ? `inset 0 -6px 0 ${mix(style.accent, 70, O)}` : undefined }} />;
            })}
          </div>
        </div>
      ) : null}
      {props.dialog ? (
        <div style={{ position: "absolute", left: m, top: dlgTop + Math.round(((1 - dlgIn) * 60) / q) * q, width: W - m * 2, height: dlgH, opacity: dlgIn > 0.01 ? 1 : 0 }}>
          {props.hero.name ? (
            <div style={{ position: "absolute", left: q * 4, top: -54 + q, height: 54, width: props.hero.name.length * 32 * 0.6 + 44 }}>
              <PixelBox w={props.hero.name.length * 32 * 0.6 + 44} h={54} q={q} notch={notch ? q : 0} fill={style.ink} border={style.ink} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: style.mono, fontWeight: 600, fontSize: 32, color: style.surface }}>{props.hero.name}</div>
            </div>
          ) : null}
          <PixelBox w={W - m * 2} h={dlgH} q={q} notch={notch} fill={style.surface} border={style.ink} />
          <div
            style={{
              position: "absolute",
              left: q + dlgPad,
              top: q + dlgPad,
              width: dlgInner,
              fontFamily: style.body,
              fontWeight: 600,
              fontSize: dlgFont,
              lineHeight: 1.3,
              color: style.ink,
            }}
          >
            {dialogText.slice(0, dlgChars)}
            <span style={{ visibility: "hidden" }}>{dialogText.slice(dlgChars)}</span>
          </div>
          {dlgDone ? (
            <svg width={28} height={20} style={{ position: "absolute", right: q + 22, bottom: q + 16 + (Math.floor(ts / 0.4) % 2) * 6 }} shapeRendering="crispEdges">
              <path d="M0 0H28V5H24V10H19V15H9V10H4V5H0Z" fill={style.accent} />
            </svg>
          ) : null}
        </div>
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${dark ? 0.35 : 0.14}) 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "pixel-spell",
  title: "Pixel spell",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "A playful game-world beat: a pixel-art wizard (standing for the viewer, the creator or 'you') casts a spell on each spoken word and conjures 1–3 pixel items on pedestals (coin, gem, heart, star, key, potion, scroll, chest, bolt), each with a ≤ 12-character label typed on its pedestal and an optional '+10'-style badge. Optional quest title typed at the top, a segmented game meter that fills in steps (energy, XP, savings), and an RPG dialog box with the hero's line. Good for habits and rewards, 'three things you unlock', levelling up a skill, gains and costs, gamified tips, music-only retro montages. No media.",
  avoid:
    "Serious or sad topics (it reads as a game), more than 3 items (split across segments), long text (labels ≤ 12 characters, one dialog line), and using it twice in a row. The wizard is a generic sprite: never use it to depict a real person or a brand mascot.",
  schema,
  example: {
    title: "Three habits, one week",
    titleWord: "habits",
    hero: { name: "Morning you", robe: "accent" },
    spells: [
      { item: "potion", label: "Drink water", tag: "+10", word: "water" },
      { item: "heart", label: "Short walk", tag: "+20", word: "walk" },
      { item: "scroll", label: "Read 5 pages", tag: "+15", word: "read" },
    ],
    meter: { label: "Energy", from: 20, to: 80, word: "energy" },
    dialog: { text: "Small habits stack up. By Friday you feel the difference.", word: "small" },
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.2, end: 0.4, word: "Three" },
    { at: 0.45, end: 0.8, word: "habits" },
    { at: 1.7, end: 2.0, word: "water" },
    { at: 3.1, end: 3.4, word: "walk" },
    { at: 4.5, end: 4.8, word: "read" },
    { at: 5.5, end: 5.9, word: "energy" },
    { at: 6.5, end: 6.8, word: "small" },
  ],
  seconds: { min: 4, max: 14, demo: 10 },
  mediaSlots: 0,
  credit: { name: "'Pixel wizard crypto animation' by @0xevinho (prompt-motion.com)", url: "https://prompt-motion.com/0xevinho-3777d8" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
