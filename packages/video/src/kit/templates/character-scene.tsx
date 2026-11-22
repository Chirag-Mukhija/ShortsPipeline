// Character scene: up to three simple cartoon characters (round-head people or server boxes with faces) act out an idea on spoken words: poses, faces, speech or thought bubbles, walking, and passing an object such as a request envelope.
import type { FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const POSES = ["stand", "wave", "point", "think", "tap", "run", "sit", "celebrate", "panic"] as const;
const FACES = ["happy", "neutral", "worried", "shocked", "proud"] as const;
const KINDS = ["phone", "laptop", "server", "envelope", "book"] as const;
type PoseName = (typeof POSES)[number];
type FaceName = (typeof FACES)[number];
type Kind = (typeof KINDS)[number];

const characterSchema = z.object({
  id: z.string().min(1).max(12).describe("Short id that beats and objects refer to, e.g. 'user'"),
  name: z.string().max(14).optional().describe("Name tag on the floor under them, e.g. 'You' or 'API server'"),
  look: z.enum(["person", "server"]).optional().describe("person (default): round head on a bean body; server: a server box with a face, arms and legs, for a system part acting as a character"),
  colour: z.enum(["ink", "accent", "accent2"]).describe("Body colour, taken from the video's style; give each character a different one"),
  x: z.number().min(0).max(1).describe("Where they stand, 0 = left edge, 1 = right edge; keep characters at least 0.25 apart"),
  facing: z.enum(["left", "right"]).optional().describe("Which way they face at the start; default: toward the middle"),
  pose: z.enum(POSES).optional().describe("Starting pose (default stand). See beats.pose"),
  expression: z.enum(FACES).optional().describe("Starting face (default neutral)"),
});

const objectSchema = z.object({
  id: z.string().min(1).max(12).describe("Short id that beats refer to, e.g. 'req'"),
  kind: z.enum(KINDS).describe("phone, laptop, server (a small rack box), envelope (a request or message), book"),
  label: z.string().max(10).optional().describe("Tiny mono label on it, e.g. 'GET /feed' or 'DB'"),
  heldBy: z.string().max(12).optional().describe("Character id holding it at the start (in their front hand); omit to stand it on the floor"),
  x: z.number().min(0).max(1).optional().describe("Floor position, 0–1 like characters (ignored when held)"),
  y: z.number().min(0).max(0.6).optional().describe("Lift it onto a small table: 0 = on the floor (default), 0.4 ≈ desk height (share of character height)"),
  appearWord: z.string().optional().describe("Spoken word it pops in on; default: there from the start. For a request that leaves a phone, use the word of the give that sends it"),
});

const beatSchema = z.object({
  word: z.string().optional().describe("Spoken word this beat lands on (the picture lands a few frames before it)"),
  who: z.string().max(12).describe("Character id that acts"),
  pose: z
    .enum(POSES)
    .optional()
    .describe("New pose, kept until changed: stand, wave (arm waves), point (arm forward), think (hand to chin), tap (taps a phone held at the chest), run (runs; legs cycle in place if not moving), sit (on a stool), celebrate (arms up, two hops, confetti), panic (arms flail, sweat)"),
  expression: z.enum(FACES).optional().describe("New face: happy, neutral, worried (sweats), shocked (jumps), proud (chin up, smug)"),
  say: z.string().max(28).optional().describe("Bubble text, ≤ 28 characters; stays until the next bubble"),
  bubble: z.enum(["say", "think"]).optional().describe("say (default): speech bubble and the mouth talks; think: thought bubble"),
  moveTo: z.number().min(0).max(1).optional().describe("Walk (or run, in run pose) to this x; they turn to face the way they go"),
  facing: z.enum(["left", "right"]).optional().describe("Turn to face this way (after any move)"),
  give: z
    .object({ object: z.string().max(12).describe("Object id"), to: z.string().max(12).describe("Character id that catches it (the same character = picks it up)") })
    .optional()
    .describe("The object flies in an arc from where it is (a hand or the floor) into this character's hand; giver and catcher face each other"),
});

const schema = z
  .object({
    caption: z.string().max(36).optional().describe("One headline above the scene, ≤ 6 words; often better left out"),
    captionWord: z.string().optional().describe("Spoken word the headline lands on"),
    characters: z.array(characterSchema).min(1).max(3).describe("1–3 characters standing on one floor"),
    objects: z.array(objectSchema).max(3).optional().describe("0–3 simple objects, held or on the floor"),
    beats: z.array(beatSchema).min(1).max(8).describe("What happens, in spoken order; one focal action each, about one per 1.2 s"),
  })
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    p.characters.forEach((c, i) => {
      if (ids.has(c.id)) ctx.addIssue({ code: "custom", message: `Duplicate character id '${c.id}'`, path: ["characters", i, "id"] });
      ids.add(c.id);
    });
    const oids = new Set<string>();
    (p.objects ?? []).forEach((o, i) => {
      if (oids.has(o.id)) ctx.addIssue({ code: "custom", message: `Duplicate object id '${o.id}'`, path: ["objects", i, "id"] });
      oids.add(o.id);
      if (o.heldBy && !ids.has(o.heldBy)) ctx.addIssue({ code: "custom", message: `heldBy '${o.heldBy}' is not a character`, path: ["objects", i, "heldBy"] });
    });
    p.beats.forEach((b, i) => {
      if (!ids.has(b.who)) ctx.addIssue({ code: "custom", message: `Beat who '${b.who}' is not a character`, path: ["beats", i, "who"] });
      if (b.give && !oids.has(b.give.object)) ctx.addIssue({ code: "custom", message: `give.object '${b.give.object}' is not an object`, path: ["beats", i, "give", "object"] });
      if (b.give && !ids.has(b.give.to)) ctx.addIssue({ code: "custom", message: `give.to '${b.give.to}' is not a character`, path: ["beats", i, "give", "to"] });
    });
  });

type Props = z.infer<typeof schema>;
type Pt = { x: number; y: number };

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const rot = (p: Pt, deg: number): Pt => ({ x: p.x * Math.cos(rad(deg)) - p.y * Math.sin(rad(deg)), y: p.x * Math.sin(rad(deg)) + p.y * Math.cos(rad(deg)) });
// Two-segment limb; angles are world-relative from straight down, positive = toward the way the character faces.
const limb = (o: Pt, a1: number, a2: number, l1: number, l2: number): [Pt, Pt, Pt] => {
  const e = { x: o.x + l1 * Math.sin(rad(a1)), y: o.y + l1 * Math.cos(rad(a1)) };
  return [o, e, { x: e.x + l2 * Math.sin(rad(a1 + a2)), y: e.y + l2 * Math.cos(rad(a1 + a2)) }];
};
const lerpRec = <T extends Record<string, number>>(a: T, b: T, p: number): T => {
  const o = { ...a } as Record<string, number>;
  for (const k of Object.keys(b)) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * p;
  return o as T;
};

// Pose = joint angles (front/back arm and leg: [joint, bend]) plus body lean, sink (sitting), head tilt and weights for the pose's own loop.
type Pose = Record<"fa1" | "fa2" | "ba1" | "ba2" | "fl1" | "fl2" | "bl1" | "bl2" | "lean" | "sink" | "tilt" | "wave" | "tap" | "panic" | "run" | "stool", number>;
const STAND: Pose = { fa1: 12, fa2: 8, ba1: -10, ba2: 6, fl1: 5, fl2: -2, bl1: -5, bl2: 2, lean: 0, sink: 0, tilt: 0, wave: 0, tap: 0, panic: 0, run: 0, stool: 0 };
const POSE: Record<PoseName, Pose> = {
  stand: STAND,
  wave: { ...STAND, fa1: 120, fa2: 35, tilt: -3, wave: 1 },
  point: { ...STAND, fa1: 95, fa2: -5, ba1: -18, ba2: 10, lean: 5 },
  think: { ...STAND, fa1: 20, fa2: 165, ba1: 25, ba2: 70, tilt: -8 },
  tap: { ...STAND, fa1: 35, fa2: 95, ba1: 55, ba2: 70, tilt: 12, tap: 1 },
  run: { ...STAND, fa1: 10, fa2: 80, ba1: -10, ba2: 80, lean: 10, run: 1 },
  sit: { ...STAND, fa1: 40, fa2: 10, ba1: 30, ba2: 20, fl1: 88, fl2: -88, bl1: 80, bl2: -82, sink: 15, stool: 1 },
  celebrate: { ...STAND, fa1: 160, fa2: 12, ba1: -160, ba2: -12, fl1: 10, fl2: 0, bl1: -10, bl2: 0, tilt: -6 },
  panic: { ...STAND, fa1: 140, fa2: 45, ba1: -140, ba2: -45, fl1: 10, fl2: -14, bl1: -8, bl2: -10, sink: 2, panic: 1 },
};

type Face = Record<"browY" | "browTilt" | "eye" | "lid" | "mw" | "curve" | "open" | "sweat" | "tilt", number>;
const FACE: Record<FaceName, Face> = {
  neutral: { browY: 0, browTilt: 0, eye: 1, lid: 0, mw: 3.4, curve: 0.5, open: 0, sweat: 0, tilt: 0 },
  happy: { browY: -1.2, browTilt: -2, eye: 1, lid: 0, mw: 5, curve: 4.2, open: 1.8, sweat: 0, tilt: -2 },
  worried: { browY: -0.6, browTilt: 15, eye: 1.05, lid: 0, mw: 3.8, curve: -2.4, open: 0.8, sweat: 1, tilt: 4 },
  shocked: { browY: -3.2, browTilt: 6, eye: 1.45, lid: 0, mw: 3.2, curve: 0, open: 5.5, sweat: 0, tilt: -3 },
  proud: { browY: 0.8, browTilt: -10, eye: 1, lid: 0.5, mw: 4.6, curve: 3, open: 0, sweat: 0, tilt: -7 },
};

// Body plans in character units (100 = a person's height), feet at y = 0, facing right; shoulders are relative to the hip point.
const LOOKS = {
  person: { leg: 15, arm: [14, 14] as const, shF: { x: 5, y: -29 }, shB: { x: -5, y: -29 }, hipF: 3, hipB: -3, top: 100, half: 17 },
  server: { leg: 11, arm: [14, 13] as const, shF: { x: 21, y: -40 }, shB: { x: -21, y: -40 }, hipF: 11, hipB: -11, top: 88, half: 24 },
};

// Objects in character units, centred on their middle.
const OBJ_SIZE: Record<Kind, { w: number; h: number }> = { phone: { w: 9, h: 16 }, laptop: { w: 34, h: 22 }, server: { w: 30, h: 44 }, envelope: { w: 18, h: 12 }, book: { w: 16, h: 20 } };

const ObjectArt: FC<{ kind: Kind; style: Style; t: number; seed: number }> = ({ kind, style, t, seed }) => {
  const ink = style.ink;
  const led = (i: number) => (hash(Math.floor(t * 4 + i * 1.7) + seed) > 0.4 ? 1 : 0.3);
  if (kind === "phone")
    return (
      <g>
        <rect x={-4.5} y={-8} width={9} height={16} rx={2} fill={ink} />
        <rect x={-3.4} y={-6.4} width={6.8} height={11.4} rx={1} fill={style.surface} />
        <circle cx={0} cy={-1} r={1.6} fill={style.accent} />
      </g>
    );
  if (kind === "laptop")
    return (
      <g>
        <rect x={-14} y={-11} width={28} height={18} rx={1.5} fill={ink} />
        <rect x={-12.2} y={-9.4} width={24.4} height={14.6} rx={0.8} fill={style.surface} />
        <path d="M-9.5 -5.5h9M-7 -1.5h12M-9.5 2.5h6" stroke={style.accent} strokeWidth={1.3} strokeLinecap="round" />
        <rect x={-17} y={7} width={34} height={3.6} rx={1.4} fill={ink} />
      </g>
    );
  if (kind === "server")
    return (
      <g>
        <rect x={-15} y={-22} width={30} height={44} rx={3} fill={style.surface} stroke={ink} strokeWidth={1.3} />
        {[-17, -5, 7].map((y, i) => (
          <g key={i}>
            <rect x={-11} y={y} width={22} height={9} rx={1.5} fill="none" stroke={ink} strokeWidth={1} />
            <circle cx={6.5} cy={y + 4.5} r={1.6} fill={style.accent} opacity={led(i)} />
            <path d={`M-7.5 ${y + 4.5}h7`} stroke={mix(ink, 45)} strokeWidth={1} strokeLinecap="round" />
          </g>
        ))}
      </g>
    );
  if (kind === "envelope")
    return (
      <g>
        <rect x={-9} y={-6} width={18} height={12} rx={1.2} fill={style.surface} stroke={ink} strokeWidth={1.2} />
        <path d="M-9 -6L0 1.5L9 -6" fill="none" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
        <circle cx={0} cy={1.5} r={2} fill={style.accent} />
      </g>
    );
  return (
    <g>
      <rect x={-8} y={-10} width={16} height={20} rx={1.5} fill={style.accent2} stroke={ink} strokeWidth={1.2} />
      <path d="M-5.5 -10v20" stroke={ink} strokeWidth={1} />
      <path d="M-2 -5h7M-2 -2h5" stroke={style.surface} strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
};

// Squash (negative) and stretch over time around a beat: anticipation dips before it, a stretch springs after it and settles.
const squashCurve = (dt: number, pre: boolean) => {
  if (dt < -0.16) return 0;
  if (dt < 0) return pre ? -0.09 * Math.sin((Math.PI / 2) * ((dt + 0.16) / 0.16)) : 0;
  const d0 = pre ? -0.09 : -0.06;
  if (dt < 0.12) return d0 + (0.08 - d0) * sine(dt / 0.12);
  const k = dt - 0.12;
  return k > 1.2 ? 0 : 0.08 * Math.exp(-k * 8) * Math.cos((k * 2 * Math.PI) / 0.3);
};
const hopCurve = (dt: number, dur: number, h: number) => (dt > 0 && dt < dur ? 4 * h * (dt / dur) * (1 - dt / dur) : 0);

type Shot = { s: number; x: number; y: number };
type Move = { a: number; b: number; to: Shot; ease: (x: number) => number };

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const chars = props.characters;
  const objects = props.objects ?? [];
  const beats = props.beats;
  const cIndex = new Map(chars.map((c, i) => [c.id, i]));

  // Layout: caption band, bubble room above the heads, one floor line.
  const side = Math.max(72, W * 0.06);
  const capSize = narrow ? 54 : 64;
  const capLines = props.caption ? Math.ceil((props.caption.length * capSize * 0.52) / (W - side * 2)) : 0;
  const capTop = H * 0.07;
  const capBottom = props.caption ? capTop + capLines * capSize * 1.1 + 24 : 0;
  const top = props.caption ? capBottom + 24 : H * 0.06;
  const gy = H * 0.82;
  const bubFont = hand ? (narrow ? 54 : 58) : narrow ? 42 : 46;
  const bubChar = hand ? 0.45 : 0.56;
  const padX = 30;
  const padY = hand ? 12 : 18;
  const bubMaxW = Math.min(W - side * 1.2, 780);
  const bubble = (text: string, think: boolean) => {
    const est = text.length * bubFont * bubChar * 1.06;
    const inner = bubMaxW - padX * 2;
    const lines = Math.max(1, Math.ceil(est / inner));
    const w = Math.min(est, inner) + padX * 2 + 6;
    const h = lines * bubFont * 1.18 + padY * 2 + 6;
    const tail = think ? 44 : 30;
    return { w, h, tail, total: h + tail + 6 };
  };
  const bubSpace = Math.max(40, ...beats.filter((b) => b.say).map((b) => bubble(b.say as string, b.bubble === "think").total + 12));
  // Height is capped by width too, so three characters and their objects still have room in the 1000 px split panel.
  const Hc = Math.max(220, Math.min(H * 0.47, W * 0.3, gy - top - bubSpace));
  const u = Hc / 100;
  const inset = side + Hc * 0.25;
  const xPx = (x: number) => inset + x * (W - inset * 2);

  // Build: floor line draws, characters rise from the floor one by one, objects drop in.
  const charAt = chars.map((_, i) => 0.15 + i * 0.16);
  const buildEnd = charAt[charAt.length - 1]! + 0.6;

  // Beat times: on the spoken word (a few frames early), else spread over the free time; clamped so the last bubble reads before the end.
  const startB = buildEnd + 0.25;
  const endB = Math.max(startB, duration - 0.6 - 1.6);
  const times = beats.map((b, i) => {
    const fb = beats.length === 1 ? startB : startB + (i * (endB - startB)) / (beats.length - 1);
    const at = cueAt(cues, b.word, fb + 0.1) - 0.1;
    return Math.min(Math.max(at, buildEnd * 0.8), duration - 1.2);
  });
  const order = beats.map((b, i) => ({ b, i, T: times[i]! })).sort((p, q) => p.T - q.T);

  // Per-character tracks, built in time order so moves and turns chain.
  type Track = {
    x0: number;
    dir0: number;
    poses: { T: number; pose: PoseName }[];
    faces: { T: number; face: FaceName }[];
    moves: { T: number; dur: number; from: number; to: number }[];
    turns: { T: number; dir: number }[];
    squash: { T: number; amp: number; pre: boolean }[];
    hops: { T: number; dur: number; h: number }[];
    reach: { T: number; len: number }[];
    talk: { T: number; end: number }[];
    shocks: number[];
    party: { T: number; x: number }[];
  };
  const tracks: Track[] = chars.map((c) => {
    const x0 = xPx(c.x);
    const dir0 = c.facing ? (c.facing === "right" ? 1 : -1) : c.x <= 0.5 ? 1 : -1;
    return { x0, dir0, poses: [], faces: [], moves: [], turns: [], squash: [], hops: [], reach: [], talk: [], shocks: [], party: [] };
  });
  const curX = tracks.map((tr) => tr.x0);
  const curDir = tracks.map((tr) => tr.dir0);
  const curPose = chars.map((c) => c.pose ?? "stand");
  const turn = (ci: number, T: number, dir: number) => {
    if (dir !== curDir[ci]) {
      tracks[ci]!.turns.push({ T, dir });
      curDir[ci] = dir;
    }
  };

  // Objects: where each is over time (hidden, floor, held, flying).
  type Flight = { obj: number; from: number | null; to: number; start: number; dur: number; giver: number };
  const flights: Flight[] = [];
  const holder = objects.map((o) => (o.heldBy ? (cIndex.get(o.heldBy) ?? null) : null));
  const objAppear = objects.map((o, i) => (o.appearWord ? cueAt(cues, o.appearWord, buildEnd + 0.3) - 0.1 : buildEnd - 0.25 + i * 0.12));

  for (const { b, T } of order) {
    const ci = cIndex.get(b.who);
    if (ci === undefined) continue;
    const tr = tracks[ci]!;
    tr.squash.push({ T, amp: 1, pre: true });
    if (b.pose) {
      tr.poses.push({ T, pose: b.pose });
      curPose[ci] = b.pose;
      if (b.pose === "celebrate") {
        tr.hops.push({ T: T + 0.06, dur: 0.42, h: 11 }, { T: T + 0.56, dur: 0.42, h: 9 });
        tr.squash.push({ T: T + 0.48, amp: 0.6, pre: false }, { T: T + 0.98, amp: 0.5, pre: false });
        tr.party.push({ T: T + 0.1, x: curX[ci]! });
      }
    }
    if (b.expression) {
      tr.faces.push({ T, face: b.expression });
      if (b.expression === "shocked") {
        tr.hops.push({ T: T + 0.02, dur: 0.34, h: 7 });
        tr.squash.push({ T: T + 0.36, amp: 0.5, pre: false });
        tr.shocks.push(T);
      }
    }
    if (b.say && b.bubble !== "think") tr.talk.push({ T, end: T + 0.35 + b.say.length * 0.05 });
    if (b.moveTo !== undefined) {
      const to = xPx(b.moveTo);
      const from = curX[ci]!;
      if (Math.abs(to - from) > 2) {
        const running = curPose[ci] === "run";
        const dur = Math.min(1.6, Math.max(0.6, 0.45 + Math.abs(to - from) / (Hc * (running ? 3.4 : 2.2))));
        tr.moves.push({ T: T + 0.02, dur, from, to });
        turn(ci, T - 0.04, Math.sign(to - from));
        curX[ci] = to;
        if (b.facing) turn(ci, T + dur, b.facing === "right" ? 1 : -1);
      } else if (b.facing) turn(ci, T, b.facing === "right" ? 1 : -1);
    } else if (b.facing) turn(ci, T, b.facing === "right" ? 1 : -1);
    if (b.give) {
      const oi = objects.findIndex((o) => o.id === b.give!.object);
      const to = cIndex.get(b.give.to);
      if (oi >= 0 && to !== undefined) {
        const fromX = holder[oi] !== null ? curX[holder[oi]!]! : xPx(objects[oi]!.x ?? 0.5);
        const dist = Math.abs(curX[to]! - fromX);
        const dur = Math.min(1.0, 0.55 + dist / W);
        const start = T + 0.12;
        flights.push({ obj: oi, from: holder[oi]!, to, start, dur, giver: ci });
        holder[oi] = to;
        if (!b.pose) tr.reach.push({ T, len: 0.95 });
        if (to !== ci) {
          if (!b.facing && b.moveTo === undefined && Math.abs(curX[to]! - curX[ci]!) > 2) turn(ci, T, Math.sign(curX[to]! - curX[ci]!));
          if (Math.abs(curX[to]! - curX[ci]!) > 2) turn(to, start, Math.sign(curX[ci]! - curX[to]!));
          tracks[to]!.reach.push({ T: start + dur - 0.35, len: 0.75 });
        }
        tracks[to]!.squash.push({ T: start + dur, amp: 0.6, pre: false });
      }
    }
  }

  // A character's full state at time t.
  const stateOf = (ci: number) => {
    const c = chars[ci]!;
    const tr = tracks[ci]!;
    const seed = ci * 13.7 + 1;
    let P = POSE[c.pose ?? "stand"];
    for (const e of tr.poses) {
      const p = enter(style, frame, fps, e.T, 0.4);
      if (p <= 0) break;
      P = lerpRec(P, POSE[e.pose], p);
    }
    let F = FACE[c.expression ?? "neutral"];
    for (const e of tr.faces) {
      const p = enter(style, frame, fps, e.T, 0.32);
      if (p <= 0) break;
      F = lerpRec(F, FACE[e.face], p);
    }
    let px = tr.x0;
    let gW = 0;
    let phi = 0;
    for (const m of tr.moves) {
      if (t < m.T) break;
      const p = clamp01((t - m.T) / m.dur);
      px = m.from + (m.to - m.from) * sine(p);
      if (p < 1) {
        gW = clamp01(p * 5) * clamp01((1 - p) * 5);
        phi = ((Math.abs(m.to - m.from) * sine(p)) / (Hc * 0.42)) * Math.PI * 2;
      }
    }
    if (gW === 0 && P.run > 0.01) {
      gW = P.run;
      phi = t * Math.PI * 2 * 2.4;
    }
    let dir = tr.dir0;
    for (const e of tr.turns) {
      const p = enter(calm, frame, fps, e.T, 0.22);
      if (p <= 0) break;
      dir = dir + (e.dir - dir) * p;
    }
    if (Math.abs(dir) < 0.06) dir = dir < 0 ? -0.06 : 0.06;
    const amp = style.motion === "calm" ? 0.6 : 1;
    const sq = amp * tr.squash.reduce((s, e) => s + e.amp * squashCurve(t - e.T, e.pre), 0);
    const hop = tr.hops.reduce((s, e) => s + hopCurve(t - e.T, e.dur, e.h), 0);
    const reachW = Math.max(0, ...tr.reach.map((e) => clamp01((t - e.T + 0.05) / 0.2) * clamp01((e.T + e.len - t) / 0.3)));
    const talk = Math.max(0, ...tr.talk.map((e) => (t >= e.T && t <= e.end ? clamp01((e.end - t) / 0.15) : 0)));
    // Pose loops (only the character moves, never the frame).
    const A = 24 + 18 * P.run;
    const sw = Math.sin(phi);
    const q = { ...P };
    q.fa2 += 24 * Math.sin(t * Math.PI * 2 * 2.2) * P.wave;
    q.ba2 += 12 * Math.sin(t * Math.PI * 2 * 3) * P.tap;
    q.fa1 += 14 * Math.sin(t * Math.PI * 2 * 2.8) * P.panic;
    q.fa2 += 25 * Math.sin(t * Math.PI * 2 * 3.4 + 1) * P.panic;
    q.ba1 -= 14 * Math.sin(t * Math.PI * 2 * 2.6 + 2) * P.panic;
    q.ba2 -= 25 * Math.sin(t * Math.PI * 2 * 3.1) * P.panic;
    q.fa1 = q.fa1 + (95 - q.fa1) * reachW;
    q.fa2 = q.fa2 + (-5 - q.fa2) * reachW;
    q.fl1 += A * sw * gW;
    q.bl1 -= A * sw * gW;
    q.fl2 -= (28 + 18 * P.run) * Math.max(0, -Math.cos(phi)) * gW;
    q.bl2 -= (28 + 18 * P.run) * Math.max(0, Math.cos(phi)) * gW;
    q.fa1 -= 0.8 * A * sw * gW * (1 - reachW);
    q.ba1 += 0.8 * A * sw * gW;
    q.lean += (4 + 8 * P.run) * gW;
    const bob = (1 + 1.6 * P.run) * Math.abs(sw) * gW;
    const jx = 0.6 * Math.sin(t * Math.PI * 2 * 7) * P.panic;
    // Blink every 2.6–4 s, seeded per character.
    const per = 2.6 + hash(seed) * 1.4;
    const ph = (t + hash(seed + 3) * per) % per;
    const blink = ph < 0.14 ? 1 - 0.92 * Math.sin((Math.PI * ph) / 0.14) : 1;
    const open = Math.max(0, F.open) + 2.2 * talk * Math.abs(Math.sin(t * 14));
    const sweat = Math.max(F.sweat, P.panic);
    const app = enter(style, frame, fps, charAt[ci]!, 0.55);
    return { c, P: q, F, open, sweat, px, dir, sq, hop, bob, jx, blink, app, seed, look: c.look ?? "person" };
  };
  const states = chars.map((_, i) => stateOf(i));

  // The rig in character units, facing right.
  const rigOf = (s: (typeof states)[number]) => {
    const L = LOOKS[s.look];
    const br = 0.018 * Math.sin((2 * Math.PI * t) / 3.2 + s.seed);
    const hipY = -2 * L.leg + (s.P.sink * L.leg) / 15 - s.bob;
    const hip = { x: s.jx, y: hipY };
    const lean = s.look === "server" ? s.P.lean * 0.5 : s.P.lean;
    const shF = add(hip, rot({ x: L.shF.x, y: L.shF.y - br * 30 }, lean));
    const shB = add(hip, rot({ x: L.shB.x, y: L.shB.y - br * 30 }, lean));
    const fa = limb(shF, s.P.fa1, s.P.fa2, L.arm[0], L.arm[1]);
    const ba = limb(shB, s.P.ba1, s.P.ba2, L.arm[0], L.arm[1]);
    const fl = limb({ x: s.jx + L.hipF, y: hipY }, s.P.fl1, s.P.fl2, L.leg, L.leg);
    const bl = limb({ x: s.jx + L.hipB, y: hipY }, s.P.bl1, s.P.bl2, L.leg, L.leg);
    const neck = add(hip, rot({ x: 1, y: -36 - br * 40 }, lean));
    const head = add(neck, rot({ x: 1, y: -17 }, lean + s.P.tilt + s.F.tilt));
    return { L, br, hipY, hip, lean, fa, ba, fl, bl, head, tilt: s.P.tilt + s.F.tilt };
  };
  const rigs = states.map(rigOf);
  const sx = (s: (typeof states)[number]) => s.dir * u * (1 - s.sq * 0.6) * (0.6 + 0.4 * s.app);
  const sy = (s: (typeof states)[number]) => u * (1 + s.sq) * s.app;
  const toWorld = (ci: number, p: Pt): Pt => {
    const s = states[ci]!;
    return { x: s.px + sx(s) * p.x, y: gy - s.hop * u + sy(s) * p.y };
  };
  const handOf = (ci: number, slot: number) => toWorld(ci, slot === 0 ? rigs[ci]!.fa[2] : rigs[ci]!.ba[2]);

  // Object positions now.
  const objPos = objects.map((o, oi) => {
    const fl = flights.filter((f) => f.obj === oi);
    let who: number | null = o.heldBy ? (cIndex.get(o.heldBy) ?? null) : null;
    let caught = -Infinity;
    let flying: Flight | undefined;
    for (const f of fl) {
      if (t >= f.start + f.dur) {
        who = f.to;
        caught = f.start + f.dur;
      } else if (t >= f.start) {
        flying = f;
        break;
      } else break;
    }
    const floor = { x: xPx(o.x ?? 0.5), y: gy - (o.y ?? 0) * Hc - (OBJ_SIZE[o.kind].h / 2) * u };
    const heldAt = (ci: number) => {
      // Second object held by the same character goes in the back hand.
      const slot = objects.filter((_, k) => k < oi && objHolderNow(k) === ci).length > 0 ? 1 : 0;
      const h = handOf(ci, slot);
      return { x: h.x, y: h.y - 2 * u };
    };
    let pos: Pt;
    let spin = 0;
    if (flying) {
      const A = flying.from !== null ? heldAt(flying.from) : floor;
      const B = heldAt(flying.to);
      const p = sine((t - flying.start) / flying.dur);
      const arc = Hc * 0.3 + Math.abs(B.x - A.x) * 0.15;
      pos = { x: A.x + (B.x - A.x) * p, y: A.y + (B.y - A.y) * p - arc * 4 * p * (1 - p) };
      spin = Math.sin(p * Math.PI * 2) * 18;
    } else pos = who !== null ? heldAt(who) : floor;
    const pop = enter(style, frame, fps, objAppear[oi]!, 0.42);
    return { o, pos, spin, pop, held: who !== null && !flying, flying: Boolean(flying), caught, onFloor: who === null && !flying };
  });
  function objHolderNow(oi: number): number | null {
    const o = objects[oi]!;
    let who: number | null = o.heldBy ? (cIndex.get(o.heldBy) ?? null) : null;
    for (const f of flights.filter((x) => x.obj === oi)) {
      if (t >= f.start) who = t >= f.start + f.dur ? f.to : null;
    }
    return who;
  }

  // Bubbles: each stays until the next one pops.
  const bubbles = order
    .filter(({ b }) => b.say)
    .map(({ b, T }) => ({ who: cIndex.get(b.who) ?? 0, T, text: b.say as string, think: b.bubble === "think" }));

  // Camera: world = canvas at scale 1; pushes frame the acting character (with their bubble), the final pull-back answers them.
  const vy0 = capBottom;
  const vc = { x: W / 2, y: (vy0 + H) / 2 };
  const clampShot = (x: number, y: number, s: number): Shot => ({
    s,
    x: Math.min(Math.max(x, vc.x / s), W - (W - vc.x) / s),
    y: Math.min(Math.max(y, vc.y / s), H - (H - vc.y) / s),
  });
  const wide: Shot = { s: 1, x: vc.x, y: vc.y };
  type Rect = { x0: number; y0: number; x1: number; y1: number };
  const charRect = (ci: number, x: number, say?: { text: string; think: boolean }): Rect => {
    const look = LOOKS[chars[ci]!.look ?? "person"];
    const headTop = gy - look.top * u;
    const bub = say ? bubble(say.text, say.think) : null;
    const bw = bub ? bub.w / 2 : 0;
    return { x0: x - Math.max(Hc * 0.42, bw), x1: x + Math.max(Hc * 0.42, bw), y0: bub ? headTop - bub.total : headTop - 20, y1: gy + 70 };
  };
  const frameOn = (r: Rect, maxS: number): Shot => {
    const rw = r.x1 - r.x0 + 80;
    const rh = r.y1 - r.y0 + 80;
    const s = Math.min(maxS, Math.max(1, Math.min((W * 0.86) / rw, ((H - vy0) * 0.86) / rh)));
    return clampShot((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, s);
  };
  const posAfter = tracks.map((tr) => tr.x0);
  const firstWho = cIndex.get(order[0]!.b.who) ?? 0;
  const startShot = clampShot(tracks[firstWho]!.x0 * 0.6 + vc.x * 0.4, vc.y, 1.12);
  const moves: Move[] = [{ a: 0.1, b: Math.max(1, buildEnd), to: wide, ease: Easing.out(Easing.cubic) }];
  let last = wide;
  let lastEnd = Math.max(1, buildEnd);
  order.forEach(({ b, T }, k) => {
    const ci = cIndex.get(b.who) ?? 0;
    const mv = tracks[ci]!.moves.find((m) => Math.abs(m.T - T - 0.02) < 1e-6);
    if (mv) posAfter[ci] = mv.to;
    const to = b.give ? cIndex.get(b.give.to) : undefined;
    const isLast = k === order.length - 1;
    let want: Shot;
    if (to !== undefined && to !== ci) want = wide;
    else if (isLast && duration - 0.6 - T < 1.8) want = wide;
    else {
      const r = charRect(ci, posAfter[ci]!, b.say ? { text: b.say, think: b.bubble === "think" } : undefined);
      want = frameOn(r, b.say || b.expression === "shocked" ? 1.2 : 1.12);
      if (want.s < 1.05) want = wide;
    }
    const same = Math.abs(want.s - last.s) < 0.04 && Math.abs(want.x - last.x) < 30 && Math.abs(want.y - last.y) < 30;
    if (!same) {
      const a = Math.max(lastEnd, T - 0.75);
      const bEnd = Math.max(a + 0.45, T - 0.03);
      moves.push({ a, b: bEnd, to: want, ease: sine });
      lastEnd = bEnd;
      last = want;
    }
  });
  if (last !== wide) {
    const b = duration - 0.6;
    const lastT = order[order.length - 1]!.T;
    const a = Math.min(b - 0.4, Math.max(lastEnd, lastT + 0.9, b - 1.1));
    moves.push({ a, b, to: wide, ease: Easing.out(Easing.cubic) });
  }
  let cam = startShot;
  for (const m of moves) {
    if (t >= m.b) {
      cam = m.to;
      continue;
    }
    if (t > m.a) {
      const p = m.ease((t - m.a) / (m.b - m.a));
      cam = { s: cam.s + (m.to.s - cam.s) * p, x: cam.x + (m.to.x - cam.x) * p, y: cam.y + (m.to.y - cam.y) * p };
    }
    break;
  }
  // Base drift keeps holds alive.
  const s = cam.s * (1 + 0.006 * Math.sin((2 * Math.PI * t) / 9));
  const ox = vc.x - cam.x * s + 3 * Math.sin((2 * Math.PI * t) / 7.3);
  const oy = vc.y - cam.y * s + 2 * Math.sin((2 * Math.PI * t) / 8.7 + 1);

  // Light pool: glides to whoever acts, so the eye knows where to go.
  let focusX = chars.reduce((acc, _, i) => acc + tracks[i]!.x0, 0) / chars.length;
  for (const { b, T } of order) {
    const ci = cIndex.get(b.who) ?? 0;
    const p = enter(calm, frame, fps, T - 0.5, 0.7);
    if (p <= 0) break;
    focusX = focusX + (states[ci]!.px - focusX) * p;
  }

  // Look.
  const lineW = hand ? 3.5 : 3;
  const border = hand ? `3px solid ${style.ink}` : `2.5px solid ${mix(style.ink, 22)}`;
  const strokeC = hand ? style.ink : mix(style.ink, 22);
  const floorDraw = enter(calm, frame, fps, 0.02, 0.6);
  const groundPath = (() => {
    const pts: string[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const x = -W + (3 * W * i) / n;
      const j = hand ? (hash(i * 9.1 + Math.floor(t * 8)) - 0.5) * 4 : 0;
      pts.push(`${i ? "L" : "M"}${x.toFixed(1)} ${(gy + j).toFixed(1)}`);
    }
    return pts.join(" ");
  })();
  const capAt = cueAt(cues, props.captionWord, 0.4) - 0.1;
  const cap = enter(style, frame, fps, capAt, 0.8);
  const nameSize = hand ? 42 : 32;

  const drawChar = (ci: number) => {
    const st = states[ci]!;
    const r = rigs[ci]!;
    if (st.app <= 0.001) return null;
    const colour = style[st.c.colour];
    const limbW = st.look === "server" ? 3.6 : 3.8;
    const line = (pts: [Pt, Pt, Pt]) => `M${pts[0].x} ${pts[0].y}L${pts[1].x} ${pts[1].y}L${pts[2].x} ${pts[2].y}`;
    const limbEl = (pts: [Pt, Pt, Pt], foot: boolean, key: string) => (
      <g key={key}>
        <path d={line(pts)} fill="none" stroke={style.ink} strokeWidth={limbW} strokeLinecap="round" strokeLinejoin="round" />
        {foot ? <ellipse cx={pts[2].x + 2} cy={pts[2].y - 1.2} rx={4.6} ry={2.6} fill={style.ink} /> : <circle cx={pts[2].x} cy={pts[2].y} r={3.1} fill={style.ink} />}
      </g>
    );
    const F = st.F;
    const fx = 4;
    const face = (cy: number, scale: number) => (
      <g transform={`translate(0 ${cy}) scale(${scale})`}>
        {[-1, 1].map((sd) => {
          const ex = fx + sd * 5.2;
          const ry = 2.4 * F.eye * (1 - F.lid * 0.55) * st.blink;
          return (
            <g key={sd}>
              <ellipse cx={ex} cy={-2} rx={2.05 * F.eye} ry={Math.max(0.25, ry)} fill={style.ink} />
              {F.lid > 0.15 ? <path d={`M${ex - 2.8} ${-2 - ry - 0.3}h5.6`} stroke={style.ink} strokeWidth={1.1} strokeLinecap="round" opacity={clamp01(F.lid * 2)} /> : null}
              <path
                d={`M${fx + sd * 2.8} ${-7.6 + F.browY - F.browTilt * 0.1}L${fx + sd * 7.8} ${-7.6 + F.browY + F.browTilt * 0.1}`}
                stroke={style.ink}
                strokeWidth={1.35}
                strokeLinecap="round"
              />
            </g>
          );
        })}
        <path
          d={`M${fx - F.mw} 6.5Q${fx} ${6.5 + F.curve - st.open} ${fx + F.mw} 6.5Q${fx} ${6.5 + F.curve + st.open} ${fx - F.mw} 6.5Z`}
          fill={style.ink}
          stroke={style.ink}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      </g>
    );
    // Sweat drops leave the head on alternating sides; shock lines burst once.
    const headC = st.look === "server" ? { x: 0, y: r.hipY - 45 } : r.head;
    const sweat =
      st.sweat > 0.05
        ? [0, 1].map((k) => {
            const p = ((t + k * 0.35 + st.seed) % 0.7) / 0.7;
            const sd = k ? 1 : -1;
            const x0 = headC.x + sd * (st.look === "server" ? 22 : 16);
            const y0 = headC.y - (st.look === "server" ? 18 : 8);
            return (
              <path
                key={k}
                d="M0 -3.4Q2.8 0.6 0 2.6Q-2.8 0.6 0 -3.4Z"
                transform={`translate(${x0 + sd * 6 * p} ${y0 + 14 * p * p})`}
                fill={mix(style.accent2, 55, style.surface)}
                stroke={style.ink}
                strokeWidth={0.6}
                opacity={st.sweat * Math.sin(Math.PI * p)}
              />
            );
          })
        : null;
    const shock = tracks[ci]!.shocks.map((T, k) => {
      const dt = t - T;
      if (dt < 0 || dt > 0.6) return null;
      const e = Easing.out(Easing.cubic)(clamp01(dt / 0.3));
      const rr = st.look === "server" ? 30 : 21;
      return (
        <g key={k} opacity={1 - clamp01((dt - 0.35) / 0.25)}>
          {[-45, -90, -135].map((a) => (
            <path
              key={a}
              d={`M${headC.x + Math.cos(rad(a)) * rr} ${headC.y + Math.sin(rad(a)) * rr}L${headC.x + Math.cos(rad(a)) * (rr + 7 * e)} ${headC.y + Math.sin(rad(a)) * (rr + 7 * e)}`}
              stroke={style.accent}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          ))}
        </g>
      );
    });
    const legSeat = -r.L.leg;
    const body =
      st.look === "server" ? (
        <g transform={`rotate(${r.lean} 0 ${r.hipY})`}>
          <rect x={-24 + st.jx} y={r.hipY - 64} width={48} height={66} rx={6} fill={colour} stroke={hand ? style.ink : "none"} strokeWidth={1.3} />
          <rect x={-18 + st.jx} y={r.hipY - 60} width={36} height={30} rx={4} fill={style.surface} stroke={style.ink} strokeWidth={1.2} />
          {[-22, -12].map((dy, k) => (
            <g key={k}>
              <path d={`M${-16 + st.jx} ${r.hipY + dy}h22`} stroke={mix(style.surface, 60)} strokeWidth={2.2} strokeLinecap="round" />
              <circle cx={13 + st.jx} cy={r.hipY + dy} r={2.1} fill={st.c.colour === "accent" ? style.accent2 : style.accent} opacity={hash(Math.floor(t * (4 + 6 * st.P.panic)) + k * 3.3 + st.seed) > 0.45 ? 1 : 0.35} />
            </g>
          ))}
          <g transform={`translate(${st.jx} 0) rotate(${r.tilt * 0.4} 0 ${r.hipY - 45})`}>{face(r.hipY - 45, 0.95)}</g>
        </g>
      ) : (
        <>
          <g transform={`rotate(${r.lean} 0 ${r.hipY})`}>
            <ellipse cx={st.jx} cy={r.hipY + 5 - 22 * (1 + r.br)} rx={16} ry={22 * (1 + r.br)} fill={colour} stroke={hand ? style.ink : "none"} strokeWidth={1.3} />
            <path d={`M${st.jx + 8} ${r.hipY - 30}q5 6 4 15`} fill="none" stroke={mix(style.surface, 35)} strokeWidth={2.2} strokeLinecap="round" />
          </g>
          <g transform={`translate(${r.head.x} ${r.head.y}) rotate(${r.lean + r.tilt})`}>
            <circle cx={0} cy={0} r={17} fill={style.surface} stroke={style.ink} strokeWidth={1.4} />
            <path d="M-4 -16.6Q-2.5 -23 2.5 -21.5M1.5 -17Q4.5 -22 8.5 -19.5" fill="none" stroke={style.ink} strokeWidth={1.4} strokeLinecap="round" />
            {face(0, 1)}
          </g>
        </>
      );
    return (
      <g key={ci} transform={`translate(${st.px} ${gy - st.hop * u}) scale(${sx(st)} ${sy(st)})`}>
        {st.P.stool > 0.02 ? (
          <g opacity={clamp01(st.P.stool)}>
            <rect x={-12} y={legSeat + 1} width={24} height={3.5} rx={1.5} fill={style.muted} />
            <path d={`M-9 ${legSeat + 4}L-10.5 0M9 ${legSeat + 4}L10.5 0`} stroke={style.muted} strokeWidth={2} strokeLinecap="round" />
          </g>
        ) : null}
        {limbEl(r.ba, false, "ba")}
        {limbEl(r.bl, true, "bl")}
        {limbEl(r.fl, true, "fl")}
        {body}
        {limbEl(r.fa, false, "fa")}
        {sweat}
        {shock}
      </g>
    );
  };

  // Confetti for celebrate beats, seeded.
  const confetti = tracks.flatMap((tr, ci) =>
    tr.party.flatMap((pt, k) => {
      const dt = t - pt.T;
      if (dt < 0 || dt > 1.5) return [];
      const ox0 = pt.x;
      const oy0 = gy - LOOKS[chars[ci]!.look ?? "person"].top * u;
      return Array.from({ length: 18 }, (_, i) => {
        const sd = ci * 31 + k * 7 + i;
        const a = rad(-90 + (hash(sd * 3.1) - 0.5) * 140);
        const v = (0.9 + 0.7 * hash(sd * 7.7)) * Hc * 2.3;
        const x = ox0 + Math.cos(a) * v * dt;
        const y = oy0 + Math.sin(a) * v * dt + 0.5 * Hc * 5.5 * dt * dt;
        const colors = [style.accent, style.accent2, style.ink];
        return (
          <rect
            key={`cf${ci}-${k}-${i}`}
            x={-Hc * 0.018}
            y={-Hc * 0.01}
            width={Hc * 0.036}
            height={Hc * 0.02}
            fill={colors[i % 3]}
            transform={`translate(${x} ${y}) rotate(${(hash(sd * 1.3) - 0.5) * 900 * dt})`}
            opacity={1 - clamp01((dt - 1.1) / 0.4)}
          />
        );
      });
    }),
  );

  const drawObj = (op: (typeof objPos)[number], oi: number) => {
    if (op.pop <= 0.001) return null;
    return (
      <g key={`o${oi}`} transform={`translate(${op.pos.x} ${op.pos.y}) rotate(${op.spin}) scale(${u * op.pop})`}>
        <ObjectArt kind={op.o.kind} style={style} t={t} seed={oi * 5.1} />
      </g>
    );
  };
  const tables = objects.map((o, oi) => {
    const op = objPos[oi]!;
    if (!op.onFloor || (o.y ?? 0) < 0.05) return null;
    const x = xPx(o.x ?? 0.5);
    const ty = gy - (o.y ?? 0) * Hc;
    const hw = (OBJ_SIZE[o.kind].w / 2 + 10) * u;
    const a = enter(style, frame, fps, Math.min(objAppear[oi]!, buildEnd - 0.3), 0.5);
    return (
      <g key={`tb${oi}`} opacity={a}>
        <rect x={x - hw} y={ty} width={hw * 2} height={3 * u} rx={u} fill={style.surface} stroke={strokeC} strokeWidth={2} />
        <path d={`M${x - hw + 3 * u} ${ty + 3 * u}L${x - hw + 4 * u} ${gy}M${x + hw - 3 * u} ${ty + 3 * u}L${x + hw - 4 * u} ${gy}`} stroke={mix(style.ink, 55)} strokeWidth={lineW} strokeLinecap="round" />
      </g>
    );
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 30% 10%, ${mix(style.surface, 70, style.bg)} 0%, ${style.bg} 70%)`,
        overflow: "hidden",
      }}
    >
      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <radialGradient id="kit-cs-wall">
              <stop offset="0%" stopColor={mix(style.accent, 16)} />
              <stop offset="100%" stopColor={mix(style.accent, 0)} />
            </radialGradient>
            <radialGradient id="kit-cs-floor">
              <stop offset="0%" stopColor={mix(style.accent, 14)} />
              <stop offset="100%" stopColor={mix(style.accent, 0)} />
            </radialGradient>
          </defs>
          {/* Life layer: a soft light pool on the wall and floor that glides to the acting character. */}
          <ellipse cx={focusX} cy={gy - Hc * 0.55} rx={Hc * 1.25} ry={Hc * 0.95} fill="url(#kit-cs-wall)" opacity={floorDraw} />
          <rect x={-W} y={gy} width={W * 3} height={H * 2} fill={mix(style.ink, 4)} opacity={floorDraw} />
          <ellipse cx={focusX} cy={gy + Hc * 0.06} rx={Hc * 0.95} ry={Hc * 0.14} fill="url(#kit-cs-floor)" opacity={floorDraw} />
          <path d={groundPath} fill="none" stroke={hand ? style.ink : mix(style.ink, 45)} strokeWidth={lineW} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - floorDraw} />
          {states.map((st, ci) => (
            <ellipse key={`sh${ci}`} cx={st.px} cy={gy + 2} rx={Hc * 0.2 * (1 - st.hop / 30) * st.app} ry={Hc * 0.028 * st.app} fill="rgba(0,0,0,0.14)" />
          ))}
          {tables}
          {objPos.map((op, oi) => (op.onFloor ? drawObj(op, oi) : null))}
          {chars.map((_, ci) => drawChar(ci))}
          {objPos.map((op, oi) => (!op.onFloor ? drawObj(op, oi) : null))}
          {confetti}
        </svg>

        {/* Name tags on the floor. */}
        {chars.map((c, ci) =>
          c.name ? (
            <div
              key={`n${ci}`}
              style={{
                position: "absolute",
                left: states[ci]!.px - 200,
                top: gy + 20,
                width: 400,
                textAlign: "center",
                fontFamily: hand ? style.display : style.body,
                fontWeight: hand ? 700 : 600,
                fontSize: nameSize,
                color: mix(style.ink, 78, style.bg),
                opacity: enter(style, frame, fps, charAt[ci]! + 0.25, 0.45),
              }}
            >
              {c.name}
            </div>
          ) : null,
        )}

        {/* Object labels: always on floor objects; on a held object until shortly after it is caught. */}
        {objPos.map((op, oi) => {
          if (!op.o.label || op.pop <= 0.001) return null;
          const fade = op.held && op.caught > -Infinity ? 1 - clamp01((t - op.caught - 0.6) / 0.3) : 1;
          if (fade <= 0) return null;
          const hh = (OBJ_SIZE[op.o.kind].h / 2) * u * op.pop;
          return (
            <div
              key={`ol${oi}`}
              style={{
                position: "absolute",
                left: op.pos.x,
                top: op.pos.y - hh - 12,
                transform: "translate(-50%, -100%)",
                fontFamily: style.mono,
                fontWeight: 600,
                fontSize: 30,
                color: style.ink,
                background: mix(style.surface, 92),
                border: `2px solid ${mix(style.ink, 16)}`,
                padding: "2px 12px",
                borderRadius: Math.min(12, style.radius),
                whiteSpace: "nowrap",
                opacity: op.pop * fade,
              }}
            >
              {op.o.label}
            </div>
          );
        })}

        {/* Bubbles: pop from the tail, leave fast when the next one arrives. */}
        {bubbles.map((bb, k) => {
          const pop = enter(style, frame, fps, bb.T, 0.42);
          if (pop <= 0.001) return null;
          const next = bubbles[k + 1];
          const out = next ? clamp01((t - (next.T - 0.06)) / 0.2) : 0;
          if (out >= 1) return null;
          const m = bubble(bb.text, bb.think);
          const st = states[bb.who]!;
          const look = LOOKS[chars[bb.who]!.look ?? "person"];
          const anchorX = st.px + Math.sign(st.dir) * 4 * u;
          const anchorY = gy - look.top * u - (bb.think ? 2 : 6);
          const left = Math.min(Math.max(anchorX - m.w / 2, side * 0.6), W - side * 0.6 - m.w);
          const ax = Math.min(Math.max(anchorX - left, 36), m.w - 36);
          const bw = hand ? 3 : 2.5;
          return (
            <div
              key={`b${k}`}
              style={{
                position: "absolute",
                left,
                top: anchorY,
                width: m.w,
                transform: `translateY(-100%) scale(${pop * (1 - 0.12 * out)})`,
                transformOrigin: `${ax}px 100%`,
                opacity: Math.min(1, pop * 1.5) * (1 - out),
              }}
            >
              <div
                style={{
                  width: m.w,
                  boxSizing: "border-box",
                  padding: `${padY}px ${padX}px`,
                  background: style.surface,
                  border,
                  borderRadius: bb.think ? 999 : Math.max(20, style.radius * 1.3),
                  fontFamily: hand ? style.display : style.body,
                  fontWeight: hand ? 700 : 600,
                  fontStyle: bb.think && !hand ? "italic" : "normal",
                  fontSize: bubFont,
                  lineHeight: 1.18,
                  color: style.ink,
                  textAlign: "center",
                  boxShadow: "0 12px 34px rgba(0,0,0,0.12)",
                }}
              >
                {bb.text}
              </div>
              <svg width={m.w} height={m.tail} style={{ display: "block", marginTop: -bw, overflow: "visible" }}>
                {bb.think ? (
                  <>
                    <circle cx={ax + 14} cy={14} r={10} fill={style.surface} stroke={strokeC} strokeWidth={bw} />
                    <circle cx={ax + 4} cy={34} r={6} fill={style.surface} stroke={strokeC} strokeWidth={bw} />
                  </>
                ) : (
                  <>
                    <path d={`M${ax - 18} 0L${ax} ${m.tail}L${ax + 18} 0Z`} fill={style.surface} />
                    <path d={`M${ax - 18} 0L${ax} ${m.tail}L${ax + 18} 0`} fill="none" stroke={strokeC} strokeWidth={bw} strokeLinejoin="round" />
                  </>
                )}
              </svg>
            </div>
          );
        })}
      </div>

      {/* Outside the rig: headline, its pocket, and the vignette. */}
      {props.caption ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: capBottom + 20, background: `linear-gradient(to bottom, ${mix(style.bg, 85)} 0%, transparent 100%)` }} />
          <div style={{ position: "absolute", left: side, top: capTop, width: W - side * 2, overflow: "hidden", paddingBottom: 8 }}>
            <div
              style={{
                fontFamily: style.display,
                fontWeight: hand ? 700 : 600,
                fontSize: hand ? capSize * 1.15 : capSize,
                lineHeight: 1.08,
                letterSpacing: hand ? 0 : "-0.015em",
                color: style.ink,
                transform: `translateY(${(1 - cap) * 115}%)`,
              }}
            >
              {props.caption}
            </div>
          </div>
        </>
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.16) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "character-scene",
  title: "Character scene",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "Story and system-design beats acted out by 1–3 simple cartoon characters on one floor: a person (round head, bean body) or a server box with a face. Each beat lands on a spoken word: a new pose (wave, point, think, tap a phone, run, sit, celebrate, panic), a new face (happy, worried with sweat, shocked with a jump, proud), a speech or thought bubble (≤ 28 chars), a walk to a new spot, or an object (phone, laptop, server box, envelope, book) passed in an arc from one character to another, e.g. a request leaving a phone for a sweating server. The camera pushes in on whoever acts and pulls back at the end. No media.",
  avoid:
    "More than one beat per ~1.2 s, more than 3 characters, long dialogue (one short line per bubble; split a conversation across segments), and precise diagrams with many parts (use flow-diagram). Characters are generic cartoons: never use them to depict a real, named person.",
  schema,
  example: {
    caption: "What one tap really does",
    captionWord: "tap",
    characters: [
      { id: "you", name: "You", colour: "accent2", x: 0.12, pose: "stand", expression: "neutral" },
      { id: "api", name: "API server", look: "server", colour: "accent", x: 0.66, expression: "neutral" },
    ],
    objects: [
      { id: "phone", kind: "phone", heldBy: "you" },
      { id: "req", kind: "envelope", label: "GET /feed", heldBy: "you", appearWord: "send" },
      { id: "db", kind: "server", label: "DB", x: 0.96 },
    ],
    beats: [
      { word: "tap", who: "you", pose: "tap", expression: "happy" },
      { word: "send", who: "you", give: { object: "req", to: "api" } },
      { word: "server", who: "api", pose: "wave", expression: "happy", say: "Got it, on it!" },
      { word: "thousands", who: "api", pose: "panic", expression: "worried", say: "Too many requests!" },
      { word: "wait", who: "you", pose: "think", expression: "worried", moveTo: 0.3, say: "Why is it so slow?", bubble: "think" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.3, end: 0.5, word: "You" },
    { at: 0.8, end: 1.1, word: "tap" },
    { at: 1.9, end: 2.2, word: "send" },
    { at: 3.4, end: 3.8, word: "server" },
    { at: 4.8, end: 5.3, word: "thousands" },
    { at: 6.5, end: 6.8, word: "wait" },
  ],
  seconds: { min: 4, max: 12, demo: 9 },
  mediaSlots: 0,
  credit: {
    name: "'Animated agent session story' by @jake11moran, 'Animated short about a bug' by @KamStudioLabs and 'Sketchbook animals come alive' by @abderrahmen_g (prompt-motion.com)",
    url: "https://prompt-motion.com/jake11moran-a269c4",
  },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
