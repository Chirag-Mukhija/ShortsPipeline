// Shadow story: paper cut-out shadow theatre for myths and fables: a backlit screen with a moving light, scenery on three depth layers, hinged rod puppets (hero, heroine, sage, king, demon, monkey, deer, bird) acting on spoken words, sets that slide to change the scene, and a narration caption on the stage ledge.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const ACTIONS = ["still", "walk", "bow", "raise", "point"] as const;
const ARCHETYPES = ["hero", "heroine", "sage", "king", "demon", "monkey", "deer", "bird"] as const;
const PIECES = ["tree", "forest", "palace", "hut", "mountain", "river", "boat"] as const;
const HOLDS = ["none", "bow", "staff", "sword", "lamp"] as const;
type Action = (typeof ACTIONS)[number];
type Archetype = (typeof ARCHETYPES)[number];
type Piece = (typeof PIECES)[number];
type Hold = (typeof HOLDS)[number];

const pieceSchema = z.object({
  piece: z
    .enum(PIECES)
    .describe("tree, forest (a cluster of trees), palace (domes and towers), hut (thatched), mountain (far peaks), river (water along the floor), boat (bobs on the floor line; pair with river)"),
  x: z.number().min(0).max(1).optional().describe("Where it stands, 0 = left, 1 = right; default: spread evenly. Keep tall pieces at least 0.25 apart"),
});

const characterSchema = z.object({
  id: z.string().min(1).max(12).describe("Short id the beats refer to, e.g. 'prince'"),
  archetype: z
    .enum(ARCHETYPES)
    .describe("hero (pointed crown), heroine (hair bun, draped sari), sage (top-knot, beard, staff), king (tall crown, robe), demon (horned crown, big), monkey (long arms, tail), deer (antlers, spotted), bird (flies above the floor)"),
  x: z.number().min(0).max(1).describe("Where the puppet stands, 0 = left, 1 = right; keep puppets at least 0.2 apart"),
  facing: z.enum(["left", "right"]).optional().describe("Which way it faces at the start; default: toward the middle"),
  action: z.enum(ACTIONS).optional().describe("Starting action (default still); see beats.action"),
  holds: z.enum(HOLDS).optional().describe("What it holds in its front hand (people and monkey only): an archer's bow, a staff, a sword, an oil lamp, or none. Default: hero bow, sage staff, demon sword, others none"),
  enterWord: z.string().optional().describe("Spoken word the puppet is lifted into view on; default: it rises in at the start"),
});

const beatSchema = z.object({
  word: z.string().optional().describe("Spoken word this beat lands on (the puppet moves a few frames before it)"),
  who: z.string().max(12).describe("Character id that acts"),
  action: z
    .enum(ACTIONS)
    .optional()
    .describe("New action, kept until changed: still (stands, bobbing on its rod), walk (with moveTo: walks there and stops; without: walks in place, which reads as a journey while the set slides), bow (bows low, hands joined; a deer grazes, a bird dips), raise (raises the front arm or what it holds; a deer rears, a bird climbs), point (arm straight out; a deer turns alert)"),
  moveTo: z.number().min(0).max(1).optional().describe("Walk (or fly) to this x; it turns to face the way it goes"),
  facing: z.enum(["left", "right"]).optional().describe("Turn to face this way (after any move); a turn is a quick flip, like a real puppet"),
});

const schema = z
  .object({
    caption: z.string().max(48).optional().describe("Narration line on the stage ledge, ≤ 48 characters, sentence case"),
    captionWord: z.string().optional().describe("Spoken word the caption lands on"),
    light: z.enum(["warm", "moon", "fire"]).optional().describe("The light behind the screen: warm (a lamp, default), moon (cool, a moon disc in the sky), fire (low and flickering, embers rise)"),
    set: z.array(pieceSchema).max(6).describe("Scenery that slides in at the start: 0–6 pieces; mountains go on the far layer, the rest on the middle layer"),
    nextSet: z.array(pieceSchema).max(6).optional().describe("A second set: on nextSetWord the first set slides off and this one slides on, like a stage scrolling past; give the travellers action walk (no moveTo) so they walk on the spot through it"),
    nextSetWord: z.string().optional().describe("Spoken word the scene change lands on"),
    characters: z.array(characterSchema).min(1).max(3).describe("1–3 puppets on one floor"),
    beats: z.array(beatSchema).max(8).describe("What the puppets do, in spoken order; one focal action each, about one per 1.2 s"),
  })
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    p.characters.forEach((c, i) => {
      if (ids.has(c.id)) ctx.addIssue({ code: "custom", message: `Duplicate character id '${c.id}'`, path: ["characters", i, "id"] });
      ids.add(c.id);
    });
    p.beats.forEach((b, i) => {
      if (!ids.has(b.who)) ctx.addIssue({ code: "custom", message: `Beat who '${b.who}' is not a character`, path: ["beats", i, "who"] });
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
// Two-segment limb; angles are from straight down, positive = toward the way the puppet faces.
const limb = (o: Pt, a1: number, a2: number, l1: number, l2: number): [Pt, Pt, Pt] => {
  const e = { x: o.x + l1 * Math.sin(rad(a1)), y: o.y + l1 * Math.cos(rad(a1)) };
  return [o, e, { x: e.x + l2 * Math.sin(rad(a1 + a2)), y: e.y + l2 * Math.cos(rad(a1 + a2)) }];
};
const lerpRec = <T extends Record<string, number>>(a: T, b: T, p: number): T => {
  const o = { ...a } as Record<string, number>;
  for (const k of Object.keys(b)) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * p;
  return o as T;
};
// Relative luminance of a #rrggbb token (0.5 if it isn't one), so the template can tell the shadow colour from the light colour in any style.
const lum = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1]!, 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
const warmth = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  return ((n >> 16) & 255) - (n & 255);
};

// A tapered cut-out limb segment with rounded ends.
const seg = (key: string, a: Pt, b: Pt, wa: number, wb: number, fill: string) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = `M${a.x + (nx * wa) / 2} ${a.y + (ny * wa) / 2}L${b.x + (nx * wb) / 2} ${b.y + (ny * wb) / 2}L${b.x - (nx * wb) / 2} ${b.y - (ny * wb) / 2}L${a.x - (nx * wa) / 2} ${a.y - (ny * wa) / 2}Z`;
  return (
    <g key={key}>
      <path d={d} fill={fill} />
      <circle cx={a.x} cy={a.y} r={wa / 2} fill={fill} />
      <circle cx={b.x} cy={b.y} r={wb / 2} fill={fill} />
    </g>
  );
};

// People and the monkey share one hinged rig; proportions, costume and headgear change per archetype (units: 100 = a hero's height).
type Robe = "dhoti" | "sari" | "robe" | "none";
type Head = "crown" | "bun" | "jata" | "tallcrown" | "horns" | "monkey";
type HCfg = { k: number; thigh: number; shin: number; torso: number; upper: number; fore: number; sh: number; waist: number; b: number; robe: Robe; head: Head; beard: boolean; lean0: number; tail: boolean };
const BASE = { k: 1, thigh: 22, shin: 22, torso: 30, upper: 17, fore: 16, sh: 7, waist: 4.6, b: 1, robe: "dhoti" as Robe, head: "crown" as Head, beard: false, lean0: 0, tail: false };
const HUMAN: Record<Exclude<Archetype, "deer" | "bird">, HCfg> = {
  hero: BASE,
  heroine: { ...BASE, k: 0.93, sh: 6, waist: 4, b: 0.85, robe: "sari", head: "bun" },
  sage: { ...BASE, k: 0.95, sh: 6.5, waist: 5.6, b: 0.9, robe: "robe", head: "jata", beard: true, lean0: 8 },
  king: { ...BASE, k: 1.03, sh: 8.6, waist: 7.2, b: 1.1, robe: "robe", head: "tallcrown", beard: true },
  demon: { ...BASE, k: 1.14, sh: 10.5, waist: 8, b: 1.35, head: "horns" },
  monkey: { ...BASE, k: 0.85, thigh: 15, shin: 15, torso: 26, upper: 21, fore: 20, sh: 7.5, waist: 5.5, robe: "none", head: "monkey", lean0: 16, tail: true },
};
const DEFAULT_HOLD: Partial<Record<Archetype, Hold>> = { hero: "bow", sage: "staff", demon: "sword" };

type HPose = Record<"fa1" | "fa2" | "ba1" | "ba2" | "fl1" | "fl2" | "bl1" | "bl2" | "lean" | "head" | "dip", number>;
const HSTILL: HPose = { fa1: 10, fa2: 12, ba1: -8, ba2: 10, fl1: 4, fl2: -2, bl1: -4, bl2: 1, lean: 0, head: 0, dip: 0 };
const HP: Record<Action, HPose> = {
  still: HSTILL,
  walk: HSTILL,
  bow: { fa1: 55, fa2: 75, ba1: 48, ba2: 80, fl1: 2, fl2: -4, bl1: -10, bl2: 2, lean: 34, head: 22, dip: 1.5 },
  raise: { fa1: 168, fa2: 6, ba1: -18, ba2: 22, fl1: 6, fl2: -2, bl1: -8, bl2: 2, lean: -5, head: -12, dip: 0 },
  point: { fa1: 92, fa2: -2, ba1: -22, ba2: 18, fl1: 10, fl2: -4, bl1: -12, bl2: 2, lean: 5, head: -3, dip: 0 },
};
// Deer: neck from vertical (+ = forward), head pitch (+ = down), body tilt about the back hip (− = front up).
type DPose = Record<"neck" | "head" | "tilt" | "fl1" | "fl2" | "bl1" | "bl2" | "ear", number>;
const DSTILL: DPose = { neck: 28, head: 25, tilt: 0, fl1: 0, fl2: 0, bl1: 0, bl2: 0, ear: 0 };
const DP: Record<Action, DPose> = {
  still: DSTILL,
  walk: DSTILL,
  bow: { neck: 120, head: 70, tilt: 4, fl1: -6, fl2: 4, bl1: 4, bl2: -2, ear: -0.5 },
  raise: { neck: 8, head: 10, tilt: -24, fl1: 70, fl2: -110, bl1: -14, bl2: 10, ear: 0.5 },
  point: { neck: 6, head: 5, tilt: -3, fl1: 2, fl2: 0, bl1: 0, bl2: 0, ear: 1 },
};
type BPose = Record<"alt" | "pitch" | "amp" | "dipHead", number>;
const BP: Record<Action, BPose> = {
  still: { alt: 0, pitch: 0, amp: 20, dipHead: 0 },
  walk: { alt: 0, pitch: 0, amp: 20, dipHead: 0 },
  bow: { alt: -14, pitch: 16, amp: 10, dipHead: 1 },
  raise: { alt: 26, pitch: -14, amp: 36, dipHead: 0 },
  point: { alt: 0, pitch: 12, amp: 16, dipHead: 0 },
};
const PUPPET_K: Record<Archetype, number> = { hero: 1, heroine: 0.93, sage: 0.95, king: 1.03, demon: 1.14, monkey: 0.85, deer: 0.95, bird: 1.15 };
const BIRD_ALT = 62;

// Headgear and faces in head units (centre 0,0, facing +x, radius ≈ 7.5).
const headArt = (h: Head, beard: boolean, fill: string, pin: string, demon: boolean) => {
  const eye = <ellipse cx={3.4} cy={-1.4} rx={demon ? 1.7 : 1.3} ry={demon ? 0.8 : 0.6} fill={pin} />;
  if (h === "monkey")
    return (
      <g>
        <circle r={6.6} fill={fill} />
        <ellipse cx={5.6} cy={2.2} rx={5} ry={3.8} fill={fill} />
        <path d="M-1 -6.2 Q4 -8.6 8 -4.6 L7.5 -3.6 Q4 -6.2 -0.6 -5 Z" fill={fill} />
        <circle cx={-2.2} cy={-0.6} r={2.6} fill={fill} />
        <circle cx={-2.2} cy={-0.6} r={1.2} fill={pin} />
        <ellipse cx={3.2} cy={-2} rx={1.2} ry={0.6} fill={pin} />
      </g>
    );
  const nose = <path d="M5.5 -2.8 L9.8 1.4 L6.2 2.8 Z" fill={fill} />;
  const hair = <path d="M-6 -3 C-11 2 -10 10 -6 13 L-4 6 Z" fill={fill} />;
  const gear: Record<Exclude<Head, "monkey">, ReactNode> = {
    crown: (
      <>
        {hair}
        <path d="M-6.5 -4 L6.5 -4 L5 -11 L1.5 -13 L0 -22 L-1.5 -13 L-5 -11 Z" fill={fill} />
        <circle cx={0} cy={-22.6} r={1.3} fill={fill} />
        <path d="M0 -10.5 L1 -8.5 L0 -6.5 L-1 -8.5 Z" fill={pin} />
      </>
    ),
    bun: (
      <>
        <circle cx={-7.6} cy={-3.4} r={4.2} fill={fill} />
        <path d="M-7 0 C-10 8 -9 16 -6 22 L-4.5 21 C-6 14 -6 7 -4 2 Z" fill={fill} />
        <path d="M-6 -5.5 Q0 -9.6 5.6 -5 L5 -4 Q0 -7.6 -5.4 -4.2 Z" fill={fill} />
        {[-3, 0, 3].map((x) => (
          <circle key={x} cx={x} cy={-6.6} r={0.55} fill={pin} />
        ))}
      </>
    ),
    jata: (
      <>
        <path d="M-6 -2 C-10 6 -9 14 -6 18 L-4 10 Z" fill={fill} />
        <ellipse cx={-1} cy={-10} rx={3.6} ry={5.6} fill={fill} />
        <circle cx={-1} cy={-11} r={0.8} fill={pin} />
      </>
    ),
    tallcrown: (
      <>
        {hair}
        <path d="M-7 -4 L7 -4 L6.5 -12 L4 -15 L2.5 -25 L0 -18 L-2.5 -25 L-4 -15 L-6.5 -12 Z" fill={fill} />
        {[-3.4, -1.2, 1.2, 3.4].map((x) => (
          <circle key={x} cx={x} cy={-9} r={0.65} fill={pin} />
        ))}
      </>
    ),
    horns: (
      <>
        <path d="M-6 -3 L-13 0 L-8 3 L-13 7 L-7 8 L-10 13 L-4 9 Z" fill={fill} />
        <path d="M-7 -4 L7 -4 L6 -10 L4 -8 L2 -14 L0 -9 L-2 -14 L-4 -8 L-6 -10 Z" fill={fill} />
        <path d="M4 -8 C9 -12 11 -18 9 -25 C8 -18 6 -14 2.5 -11 Z" fill={fill} />
        <path d="M-4 -8 C-9 -12 -12 -17 -10 -24 C-8 -17 -6 -13 -2.5 -10 Z" fill={fill} />
        <path d="M1.5 -3.6 L6.8 -2.4" stroke={fill} strokeWidth={1.4} strokeLinecap="round" />
      </>
    ),
  };
  return (
    <g>
      <circle r={7.2} fill={fill} />
      {nose}
      {gear[h]}
      {beard ? <path d={h === "jata" ? "M2.5 4 C6.5 6 6.5 11 3 21 C1 15 -1 9 -2 5 Z" : "M2 4 C5.5 5 6.5 8 4 12 C2 10 0 7 -1 5 Z"} fill={fill} /> : null}
      {eye}
    </g>
  );
};

// Things held in the front hand, drawn at the hand; `fore` is the forearm's angle from straight down.
const heldArt = (hold: Hold, fore: number, fill: string, flame: string, t: number) => {
  if (hold === "bow")
    return (
      <g transform={`rotate(${-Math.max(0, fore - 90) * 0.6})`}>
        <path d="M-1 -31 Q10 0 -1 31" fill="none" stroke={fill} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M-1 -31 L-1 31" stroke={fill} strokeWidth={0.5} />
      </g>
    );
  if (hold === "staff")
    return (
      <g transform={`rotate(${-Math.min(25, Math.max(-10, (fore - 20) * 0.25))})`}>
        <path d="M0 -56 L0 42" stroke={fill} strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={0} cy={-57} r={2.6} fill="none" stroke={fill} strokeWidth={1.4} />
      </g>
    );
  if (hold === "sword")
    return (
      <g transform={`rotate(${-fore})`}>
        <path d="M-4 3 L4 3" stroke={fill} strokeWidth={1.8} strokeLinecap="round" />
        <path d="M-1.4 3 L1.4 3 L0.4 33 L-0.4 33 Z" fill={fill} />
      </g>
    );
  if (hold === "lamp") {
    const f = 1 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 21 + 1);
    return (
      <g>
        <path d="M-5 -2.5 Q0 3 5 -2.5 Z" fill={fill} />
        <path d="M0 -3 C2.2 -6 1.4 -9 0 -12 C-1.4 -9 -2.2 -6 0 -3 Z" fill={flame} transform={`translate(0 -3) scale(${f}) translate(0 3)`} />
      </g>
    );
  }
  return null;
};

// Set pieces in puppet units, base centred at 0,0: solid shapes plus cut-out holes the light shows through.
const pieceArt = (kind: Piece, seed: number): { solid: ReactNode; holes: ReactNode } => {
  const roundTree = (dx: number, s: number, k: string) => (
    <g key={k} transform={`translate(${dx} 0) scale(${s})`}>
      <path d="M-6 0 C-4 -20 -3 -40 -4 -58 L-14 -74 L-11 -76 L-2 -64 L0 -80 L3 -80 L4 -66 L14 -78 L16 -75 L6 -58 C5 -40 6 -20 8 0 Z" />
      {[
        [-24, -86, 18],
        [-6, -104, 22],
        [16, -108, 20],
        [28, -86, 17],
        [4, -84, 20],
      ].map(([x, y, r]) => (
        <circle key={`${x}`} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
  const pine = (dx: number, s: number, k: string) => (
    <g key={k} transform={`translate(${dx} 0) scale(${s})`}>
      <path d="M-3 0 L-3 -24 L3 -24 L3 0 Z" />
      <path d="M-26 -20 L0 -62 L26 -20 Z M-21 -46 L0 -90 L21 -46 Z M-15 -72 L0 -112 L15 -72 Z" />
    </g>
  );
  const leafHoles = (dx: number, s: number, k: string, n = 9) => (
    <g key={k} transform={`translate(${dx} 0) scale(${s})`}>
      {Array.from({ length: n }, (_, i) => {
        const a = hash(seed * 7 + i * 3.3) * Math.PI * 2;
        const r = 6 + hash(seed * 3 + i * 1.7) * 18;
        return <ellipse key={i} cx={2 + Math.cos(a) * r * 1.3} cy={-96 + Math.sin(a) * r * 0.8} rx={2.4} ry={1.1} transform={`rotate(${(hash(i + seed) - 0.5) * 120} ${2 + Math.cos(a) * r * 1.3} ${-96 + Math.sin(a) * r * 0.8})`} />;
      })}
    </g>
  );
  const arch = (x: number, y: number, w: number, h: number, k: string) => <path key={k} d={`M${x - w / 2} ${y} L${x - w / 2} ${y - h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${y - h + w / 2} L${x + w / 2} ${y} Z`} />;
  switch (kind) {
    case "tree":
      return { solid: roundTree(0, 1, "t"), holes: leafHoles(0, 1, "h") };
    case "forest":
      return {
        solid: (
          <>
            {pine(-62, 0.85, "a")}
            {roundTree(-22, 0.95, "b")}
            {pine(22, 1.05, "c")}
            {roundTree(60, 0.8, "d")}
          </>
        ),
        holes: (
          <>
            {leafHoles(-22, 0.95, "hb", 6)}
            {leafHoles(60, 0.8, "hd", 5)}
          </>
        ),
      };
    case "palace":
      return {
        solid: (
          <>
            <path d="M-88 0 L88 0 L84 -8 L-84 -8 Z" />
            <path d="M-70 -8 L70 -8 L70 -60 L-70 -60 Z" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={-68 + i * 12} y={-66} width={6} height={7} />
            ))}
            <path d="M-30 -60 C-36 -80 -12 -92 0 -110 C12 -92 36 -80 30 -60 Z" />
            <path d="M0 -110 L0 -124" stroke="currentColor" strokeWidth={1.6} />
            <path d="M0 -124 L11 -120 L0 -116 Z" />
            {[-1, 1].map((sd) => (
              <g key={sd}>
                <path d={`M${sd * 52} -8 L${sd * 72} -8 L${sd * 72} -84 L${sd * 52} -84 Z`} />
                <path d={`M${sd * 50} -84 C${sd * 50} -94 ${sd * 58} -98 ${sd * 62} -106 C${sd * 66} -98 ${sd * 74} -94 ${sd * 74} -84 Z`} />
              </g>
            ))}
          </>
        ),
        holes: (
          <>
            {arch(0, -8, 18, 36, "door")}
            {[-38, -20, 20, 38].map((x) => arch(x, -22, 9, 24, `w${x}`))}
            {[-62, 62].map((x) => arch(x, -50, 7, 18, `t${x}`))}
            {[-62, 62].map((x) => (
              <circle key={`c${x}`} cx={x} cy={-70} r={2.2} />
            ))}
            <circle cx={0} cy={-80} r={3.4} />
          </>
        ),
      };
    case "hut":
      return {
        solid: (
          <>
            <path d="M-30 0 L-30 -30 L30 -30 L30 0 Z" />
            <path d="M-42 -27 L0 -64 L42 -27 L38 -24 L32 -27 L26 -23 L20 -27 L14 -23 L8 -27 L2 -23 L-4 -27 L-10 -23 L-16 -27 L-22 -23 L-28 -27 L-34 -23 Z" />
          </>
        ),
        holes: (
          <>
            {arch(-6, 0, 14, 22, "door")}
            <circle cx={16} cy={-17} r={4} />
            <path d="M-12 -40 L12 -40" stroke="black" strokeWidth={1} />
          </>
        ),
      };
    case "mountain":
      return {
        solid: <path d="M-160 0 L-64 -112 L-38 -90 L4 -152 L62 -72 L84 -86 L160 0 Z" />,
        holes: <path d="M4 -152 L-10 -130 L-2 -134 L6 -126 L14 -134 L20 -128 Z" />,
      };
    case "river":
      return { solid: null, holes: null };
    case "boat":
      return {
        solid: (
          <>
            <path d="M-38 -14 L36 -14 Q28 2 0 2 Q-26 2 -38 -14 Z" />
            <path d="M36 -14 Q44 -18 42 -26 Q38 -22 34 -20 Z" />
            <path d="M0 -14 L0 -52" stroke="currentColor" strokeWidth={1.6} />
            <path d="M2 -50 L2 -18 L24 -20 Z" />
          </>
        ),
        holes: (
          <>
            {[-22, -10, 2, 14].map((x) => (
              <circle key={x} cx={x} cy={-8} r={1.4} />
            ))}
          </>
        ),
      };
  }
};

type Shot = { s: number; x: number };

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const E = (at: number, sec: number) => enter(style, frame, fps, at, sec);
  const calm: Style = { ...style, motion: "calm" };
  const C = (at: number, sec: number) => enter(calm, frame, fps, at, sec);
  const hand = style.motion === "hand";

  // Colours: the shadow is the darkest token, the light the brightest; warm light takes the warmer accent, moon the cooler.
  const tokens = [style.bg, style.surface, style.ink];
  const S = tokens.reduce((a, b) => (lum(b) < lum(a) ? b : a));
  const L = tokens.reduce((a, b) => (lum(b) > lum(a) ? b : a));
  const warmTok = warmth(style.accent) >= warmth(style.accent2) ? style.accent : style.accent2;
  const coolTok = warmTok === style.accent ? style.accent2 : style.accent;
  const light = props.light ?? "warm";
  const tint = light === "moon" ? coolTok : warmTok;
  const core = mix(tint, light === "fire" ? 34 : light === "moon" ? 22 : 18, L);
  const midC = mix(tint, light === "fire" ? 52 : 36, mix(S, light === "moon" ? 45 : 24, L));
  const edge = mix(S, light === "moon" ? 88 : 80, tint);
  const pin = core;

  // Stage geometry.
  const side = W * 0.08;
  const gy = H * 0.79;
  const valH = H * 0.065;
  const Hc = Math.min(H * 0.45, (gy - valH - 30) / 1.28);
  const u = Hc / 100;
  const xPx = (x: number) => side + x * (W - side * 2);
  const chars = props.characters;
  const cIndex = new Map(chars.map((c, i) => [c.id, i]));

  // Build order: lights come up, set slides on, puppets are lifted in.
  const enterAt = chars.map((c, i) => cueAt(cues, c.enterWord, 0.35 + i * 0.15) - (c.enterWord ? 0.12 : 0));
  const buildEnd = 0.35 + (chars.length - 1) * 0.15 + 0.6;
  const startB = buildEnd + 0.2;
  const endB = Math.max(startB, duration - 2.2);
  const beats = props.beats;
  const times = beats.map((b, i) => {
    const fb = beats.length === 1 ? startB : startB + (i * (endB - startB)) / (beats.length - 1);
    return Math.min(Math.max(cueAt(cues, b.word, fb + 0.1) - 0.1, 0.5), duration - 1.2);
  });
  const order = beats.map((b, i) => ({ b, T: times[i]! })).sort((p, q) => p.T - q.T);
  const Tn = props.nextSet ? Math.min(cueAt(cues, props.nextSetWord, duration * 0.45) - 0.1, duration - 2.4) : Infinity;

  // Per-puppet tracks in time order.
  type Track = { x0: number; dir0: number; acts: { T: number; a: Action; inPlace: boolean }[]; moves: { T: number; dur: number; from: number; to: number }[]; turns: { T: number; dir: number }[] };
  const tracks: Track[] = chars.map((c) => ({ x0: xPx(c.x), dir0: c.facing ? (c.facing === "right" ? 1 : -1) : c.x <= 0.5 ? 1 : -1, acts: [], moves: [], turns: [] }));
  const curX = tracks.map((tr) => tr.x0);
  const curDir = tracks.map((tr) => tr.dir0);
  const turn = (ci: number, T: number, dir: number) => {
    if (dir !== curDir[ci]) {
      tracks[ci]!.turns.push({ T, dir });
      curDir[ci] = dir;
    }
  };
  const posAfter: number[] = [];
  for (const { b, T } of order) {
    const ci = cIndex.get(b.who);
    if (ci === undefined) {
      posAfter.push(W / 2);
      continue;
    }
    const tr = tracks[ci]!;
    if (b.action) tr.acts.push({ T, a: b.action, inPlace: b.action === "walk" && b.moveTo === undefined });
    const want = b.facing ? (b.facing === "right" ? 1 : -1) : undefined;
    if (b.moveTo !== undefined && Math.abs(xPx(b.moveTo) - curX[ci]!) > 2) {
      const to = xPx(b.moveTo);
      const from = curX[ci]!;
      const bird = chars[ci]!.archetype === "bird";
      const dur = Math.min(bird ? 1.4 : 2.4, Math.max(0.7, 0.5 + Math.abs(to - from) / (Hc * (bird ? 3 : 1.4))));
      turn(ci, T - 0.05, Math.sign(to - from));
      tr.moves.push({ T: T + 0.08, dur, from, to });
      curX[ci] = to;
      if (want) turn(ci, T + 0.08 + dur, want);
    } else if (want) turn(ci, T, want);
    posAfter.push(curX[ci]!);
  }
  // Scenery scrolls against the travellers' heading at the scene change.
  const travel = (() => {
    if (!props.nextSet) return -1;
    const walker = chars.findIndex((c, i) => {
      const last = [...tracks[i]!.acts].reverse().find((a) => a.T <= Tn + 0.01);
      return last ? last.inPlace : c.action === "walk";
    });
    const ci = walker >= 0 ? walker : 0;
    const dirAt = [...tracks[ci]!.turns].reverse().find((e) => e.T <= Tn)?.dir ?? tracks[ci]!.dir0;
    return dirAt >= 0 ? -1 : 1;
  })();

  // A puppet's state now.
  const states = chars.map((c, ci) => {
    const tr = tracks[ci]!;
    const seed = ci * 13.7 + 2;
    const init: Action = c.action ?? "still";
    const chain = <P extends Record<string, number>>(table: Record<Action, P>, delay: number) => {
      let P = table[init];
      for (const e of tr.acts) {
        const p = E(e.T + delay, 0.45);
        if (p <= 0) break;
        P = lerpRec(P, table[e.a], p);
      }
      return P;
    };
    let inPlace = init === "walk" ? 1 : 0;
    for (const e of tr.acts) {
      const p = C(e.T, 0.3);
      if (p <= 0) break;
      inPlace += ((e.inPlace ? 1 : 0) - inPlace) * p;
    }
    let px = tr.x0;
    let gMove = 0;
    let phi = 0;
    for (const m of tr.moves) {
      if (t < m.T) break;
      const p = clamp01((t - m.T) / m.dur);
      px = m.from + (m.to - m.from) * sine(p);
      if (p < 1) {
        gMove = clamp01(p * 6) * clamp01((1 - p) * 6);
        phi = ((Math.abs(m.to - m.from) * sine(p)) / (Hc * 0.5)) * Math.PI * 2;
      }
    }
    const g = Math.max(gMove, inPlace);
    if (gMove === 0) phi = t * Math.PI * 2 * 1.5 + seed;
    let dir = tr.dir0;
    for (const e of tr.turns) {
      const p = C(e.T, 0.26);
      if (p <= 0) break;
      dir += (e.dir - dir) * p;
    }
    if (Math.abs(dir) < 0.05) dir = dir < 0 ? -0.05 : 0.05;
    // Anticipation: a small crouch and counter-lean just before each action lands.
    const bump = tr.acts.reduce((s, e) => {
      const dt = t - e.T;
      return dt > -0.16 && dt < 0 ? s + Math.sin((Math.PI * (dt + 0.16)) / 0.16) : s;
    }, 0);
    const rise = E(enterAt[ci]!, 0.7);
    const bob = 0.9 * Math.sin(2 * Math.PI * 0.55 * t + seed * 2);
    return { c, ci, seed, chain, g, phi, px, dir, bump, rise, bob, hold: c.holds ?? DEFAULT_HOLD[c.archetype] ?? "none" };
  });

  // Camera: bottom-anchored so the ledge never shrinks; pushes in on the actor, glides between actors, goes wide for a scene change and the ending.
  const wide: Shot = { s: 1, x: W / 2 };
  type Move = { a: number; b: number; to: Shot };
  const moves: Move[] = [];
  let last = wide;
  let lastEnd = 0;
  const go = (a: number, b: number, to: Shot) => {
    if (Math.abs(to.s - last.s) < 0.01 && Math.abs(to.x - last.x) < 24) return;
    const a2 = Math.max(a, lastEnd);
    const b2 = Math.max(b, a2 + 0.45);
    moves.push({ a: a2, b: b2, to });
    last = to;
    lastEnd = b2;
  };
  const wants: Move[] = [];
  order.forEach(({ T }, k) => {
    if (T > Tn - 1 && T < Tn + 1.8) return;
    if (T > duration - 2) return;
    wants.push({ a: T - 0.75, b: T - 0.05, to: { s: 1.08, x: posAfter[k]! } });
  });
  // The scene change pulls wide before the set moves, leaving a still gap so the two moves never run as one long whole-frame change.
  if (Tn < Infinity) wants.push({ a: Tn - 0.95, b: Tn - 0.25, to: wide });
  wants.sort((p, q) => p.a - q.a).forEach((m) => go(m.a, m.b, m.to));
  {
    const endA = Math.max(lastEnd, duration - 1.8);
    go(endA, duration - 0.6, wide);
  }
  let cam = wide;
  for (const m of moves) {
    if (t >= m.b) {
      cam = m.to;
      continue;
    }
    if (t > m.a) {
      const p = sine((t - m.a) / (m.b - m.a));
      cam = { s: cam.s + (m.to.s - cam.s) * p, x: cam.x + (m.to.x - cam.x) * p };
    }
    break;
  }
  const s = cam.s * (1 + 0.004 * Math.sin((2 * Math.PI * t) / 9));
  const ox = Math.min(0, Math.max(W - W * s, W / 2 - cam.x * s));
  const oy = H - H * s;

  // The light: comes up at the start, then glides toward whoever acts.
  const up = C(0, 0.9);
  let lx = W * 0.46;
  order.forEach(({ T }, k) => {
    const p = C(T - 0.5, 0.9);
    if (p > 0) lx += (W * 0.5 + (posAfter[k]! - W * 0.5) * 0.55 - lx) * p;
  });
  lx += W * 0.02 * Math.sin((2 * Math.PI * t) / 7);
  const ly = H * (light === "fire" ? 0.66 : light === "moon" ? 0.36 : 0.44);
  const flick = light === "fire" ? 1 + 0.018 * (Math.sin(t * 9.1) + Math.sin(t * 14.3 + 1)) : 1;
  const R = Math.max(W, H) * (light === "moon" ? 0.5 : 0.62) * flick;

  // Set pieces with their slide offsets.
  type Placed = { kind: Piece; x: number; off: number; vis: boolean; key: string };
  const place = (list: Props["set"], which: 0 | 1): Placed[] =>
    list.map((p, i) => {
      const x = xPx(p.x ?? (i + 0.5) / list.length);
      const far = p.piece === "mountain";
      let off = 0;
      let vis = true;
      if (which === 0) {
        if (!far) off = (p.x ?? 0.5) < 0.5 ? -W * 0.75 * (1 - E(0.1 + i * 0.08, 0.8)) : W * 0.75 * (1 - E(0.1 + i * 0.08, 0.8));
        if (Tn < Infinity) {
          const q = clamp01((t - Tn - i * 0.05) / (far ? 1.1 : 0.75));
          off += travel * W * 1.3 * Easing.in(Easing.cubic)(q);
          if (q >= 1) vis = false;
        }
      } else {
        off = -travel * W * 1.3 * (1 - E(Tn + 0.3 + i * 0.08, far ? 1.1 : 0.9));
        vis = t >= Tn;
      }
      return { kind: p.piece, x, off, vis, key: `${which}-${i}` };
    });
  const placed = [...place(props.set, 0), ...(props.nextSet ? place(props.nextSet, 1) : [])].filter((p) => p.vis);
  const farShift = Tn < Infinity ? travel * W * 0.12 * sine((t - Tn) / 1.4) : 0;

  const drawPiece = (p: Placed, k: number, layer: string) => {
    const art = pieceArt(p.kind, k + 3);
    const id = `kit-ss-${layer}-${p.key}`;
    const bobY = p.kind === "boat" ? 1.2 * Math.sin(t * 1.8 + k) : 0;
    const tilt = p.kind === "boat" ? 2 * Math.sin(t * 1.3 + k) : 0;
    return (
      <g key={p.key} transform={`translate(${p.x + p.off} ${gy}) scale(${u}) translate(0 ${bobY}) rotate(${tilt})`} color={S}>
        <mask id={id} maskUnits="userSpaceOnUse" x={-400} y={-400} width={800} height={800}>
          <rect x={-400} y={-400} width={800} height={800} fill="white" />
          <g fill="black">{art.holes}</g>
        </mask>
        <g mask={`url(#${id})`}>{art.solid}</g>
      </g>
    );
  };
  const rivers = placed.filter((p) => p.kind === "river");

  // Far hills: a seeded range wider than the frame, so the parallax shift never shows its end.
  const hills = (() => {
    const pts: string[] = [`M${-W * 0.6} ${gy}`];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const x = -W * 0.6 + (W * 2.2 * i) / n;
      const y = gy - H * (0.07 + 0.09 * hash(i * 3.7 + 11)) * (0.6 + 0.4 * Math.sin(i * 0.9));
      pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    pts.push(`L${W * 1.6} ${gy} Z`);
    return pts.join(" ");
  })();

  // Puppets.
  const rodEnd = (oyLocal: number, k: number) => (H + 60 - oyLocal) / (u * k);
  const drawPuppet = (st: (typeof states)[number]) => {
    if (st.rise <= 0.001) return null;
    const a = st.c.archetype;
    const k = PUPPET_K[a];
    const sink = (1 - st.rise) * Hc * 1.3;
    const wob = (1 - clamp01(st.rise)) * 6 * Math.sin(st.rise * 9);
    const fill = S;
    const rodW = 0.75;
    const rodC = mix(S, 80);

    if (a === "deer") {
      const P = st.chain(DP, 0);
      const sw = Math.sin(st.phi);
      const A = 24 * st.g;
      const lift = 1.4 * Math.abs(sw) * st.g + 0.5 * st.bob;
      const oyL = gy + sink - lift * u * k;
      const pivot = { x: -15, y: -40 };
      const R2 = (p: Pt) => add(pivot, rot({ x: p.x - pivot.x, y: p.y - pivot.y }, P.tilt));
      const fh = R2({ x: 12, y: -38 });
      const bh = R2({ x: -15, y: -38 });
      const knee = (s0: number) => 26 * Math.max(0, s0) * st.g;
      const legs = [
        { o: { x: fh.x + 3, y: fh.y }, a1: P.fl1 - A * sw, a2: P.fl2 - knee(sw), key: "ff" },
        { o: { x: bh.x + 3, y: bh.y }, a1: P.bl1 + A * sw, a2: P.bl2 + 8, key: "bf" },
        { o: fh, a1: P.fl1 + A * sw, a2: P.fl2 - knee(-sw), key: "fn" },
        { o: bh, a1: P.bl1 - A * sw, a2: P.bl2 + 8, key: "bn" },
      ];
      const neckBase = R2({ x: 15, y: -46 });
      const neckEnd = add(neckBase, { x: 20 * Math.sin(rad(P.neck + P.tilt)), y: -20 * Math.cos(rad(P.neck + P.tilt)) });
      return (
        <g key={st.ci} transform={`translate(${st.px} ${oyL}) scale(${st.dir * u * k} ${u * k}) rotate(${wob})`}>
          {[fh, bh].map((h, i) => (
            <path key={`r${i}`} d={`M${h.x} ${h.y - 4} L${h.x - 6} ${rodEnd(oyL, k)}`} stroke={rodC} strokeWidth={rodW} />
          ))}
          {legs.map((l) => {
            const [o, e, f] = limb(l.o, l.a1, l.a2, 18, 21);
            return (
              <g key={l.key}>
                {seg(`${l.key}1`, o, e, 3.6, 2.4, fill)}
                {seg(`${l.key}2`, e, f, 2.4, 1.6, fill)}
                <circle cx={e.x} cy={e.y} r={0.7} fill={pin} />
              </g>
            );
          })}
          <g transform={`rotate(${P.tilt} ${pivot.x} ${pivot.y})`}>
            <path d="M-22 -44 C-20 -53 10 -55 18 -48 C22 -45 22 -38 16 -35 C6 -31 -12 -31 -20 -36 C-23 -38 -24 -41 -22 -44 Z" fill={fill} />
            <path d="M-21 -46 L-28 -49 L-23 -42 Z" fill={fill} />
            {[
              [-12, -45],
              [-5, -47],
              [2, -46],
              [-8, -40],
              [6, -41],
            ].map(([x, y]) => (
              <circle key={`${x}`} cx={x} cy={y} r={1.1} fill={pin} />
            ))}
          </g>
          {seg("neck", neckBase, neckEnd, 7.5, 4.5, fill)}
          <g transform={`translate(${neckEnd.x} ${neckEnd.y}) rotate(${P.head + P.tilt * 0.5})`}>
            <path d="M-3 -3 C2 -5.5 8 -4 11.5 -1 C12.5 1 10.5 2.4 7 2.4 C3 3 -2 2.4 -3 -3 Z" fill={fill} />
            <path d={`M-1 -3 L${-4 + P.ear} ${-9 - P.ear * 2} L1.5 -4 Z`} fill={fill} />
            <path d="M0 -4 C-1 -10 -4 -14 -6 -21 M-2 -11 L-8 -13 M-4 -16 L-3 -22 M1.5 -5 C2.5 -11 3.5 -15 1.5 -22 M2.6 -12 L7.5 -15" fill="none" stroke={fill} strokeWidth={1.2} strokeLinecap="round" />
            <ellipse cx={4.2} cy={-1.2} rx={1.1} ry={0.55} fill={pin} />
          </g>
        </g>
      );
    }

    if (a === "bird") {
      const P = st.chain(BP, 0);
      const amp = P.amp + 18 * st.g;
      const flap = amp * Math.sin(t * Math.PI * 2 * 2.2 + st.seed);
      const alt = BIRD_ALT + P.alt + 2 * st.bob;
      const oyL = gy + sink;
      const pitch = P.pitch + 6 * st.g;
      const wing = "M0 0 C-4 -10 -14 -18 -26 -20 C-19 -14 -12 -8 -8 1 Z";
      return (
        <g key={st.ci} transform={`translate(${st.px} ${oyL}) scale(${st.dir * u * k} ${u * k})`}>
          <path d={`M0 ${-alt + 3} L-5 ${rodEnd(oyL, k)}`} stroke={rodC} strokeWidth={rodW} />
          <g transform={`translate(0 ${-alt}) rotate(${pitch + wob})`}>
            <g transform={`translate(1 -3) rotate(${flap * 0.8 + 10})`}>
              <path d={wing} fill={mix(S, 85)} />
            </g>
            <path d="M-12 0 C-6 -6 6 -6 10 -2 C12 0 8 4 2 4 C-4 5 -10 3 -12 0 Z" fill={fill} />
            <path d="M-11 0 L-23 -5 L-20 1 L-24 5 L-11 2 Z" fill={fill} />
            <g transform={`rotate(${P.dipHead * 25} 9 -2)`}>
              <circle cx={11} cy={-4} r={3.8} fill={fill} />
              <path d="M14 -5.4 L20 -3.6 L14 -2.4 Z" fill={fill} />
              <circle cx={12} cy={-4.6} r={0.8} fill={pin} />
            </g>
            <g transform={`translate(1 -3) rotate(${flap})`}>
              <path d={wing} fill={fill} />
              {[-8, -14, -19].map((x, i) => (
                <circle key={x} cx={x} cy={-9 - i * 3} r={0.7} fill={pin} />
              ))}
            </g>
          </g>
        </g>
      );
    }

    // People and the monkey.
    const cfg = HUMAN[a];
    const P = st.chain(HP, 0);
    const Pl = st.chain(HP, 0.08); // forearms and head follow a beat late: follow-through.
    const sw = Math.sin(st.phi);
    const A = 24 * st.g;
    const q: HPose = { ...P, fa2: Pl.fa2, ba2: Pl.ba2, head: Pl.head };
    q.fl1 += A * sw;
    q.bl1 -= A * sw;
    q.fl2 -= 32 * Math.max(0, -Math.cos(st.phi)) * st.g;
    q.bl2 -= 32 * Math.max(0, Math.cos(st.phi)) * st.g;
    q.fa1 -= 16 * sw * st.g * (P.fa1 < 60 ? 1 : 0.2);
    q.ba1 += 16 * sw * st.g;
    q.lean += 4 * st.g - 3 * st.bump;
    q.dip += 1.8 * st.bump;
    const rock = 2.5 * sw * st.g;
    const lift = 2.2 * Math.abs(sw) * st.g + st.bob;
    const oyL = gy + sink - lift * u * k;
    const legL = cfg.thigh + cfg.shin;
    const hip = { x: 0, y: -legL - 1 + q.dip };
    const lean = cfg.lean0 + q.lean;
    const T = cfg.torso;
    const shF = add(hip, rot({ x: 1.5, y: -T + 3 }, lean));
    const shB = add(hip, rot({ x: -1.5, y: -T + 3 }, lean));
    const neck = add(hip, rot({ x: 1, y: -T }, lean));
    const head = add(neck, rot({ x: 1.5, y: -9.5 }, lean + q.head));
    const fa = limb(shF, q.fa1, q.fa2, cfg.upper, cfg.fore);
    const ba = limb(shB, q.ba1, q.ba2, cfg.upper, cfg.fore);
    const fl = limb({ x: hip.x + 1.5, y: hip.y }, q.fl1, q.fl2, cfg.thigh, cfg.shin);
    const bl = limb({ x: hip.x - 1.5, y: hip.y }, q.bl1, q.bl2, cfg.thigh, cfg.shin);
    // Cut-out puppets read best chunkier than real proportions.
    const b = cfg.b * 1.35;
    const arm = (pts: [Pt, Pt, Pt], key: string) => (
      <g key={key}>
        {seg(`${key}u`, pts[0], pts[1], 4.4 * b, 3.4 * b, fill)}
        {seg(`${key}f`, pts[1], pts[2], 3.4 * b, 2.6 * b, fill)}
        <circle cx={pts[2].x} cy={pts[2].y} r={2.2 * b} fill={fill} />
        <circle cx={pts[1].x} cy={pts[1].y} r={0.8} fill={pin} />
      </g>
    );
    const leg = (pts: [Pt, Pt, Pt], key: string) => (
      <g key={key}>
        {seg(`${key}t`, pts[0], pts[1], 5.6 * b, 4.2 * b, fill)}
        {seg(`${key}s`, pts[1], pts[2], 4.2 * b, 3 * b, fill)}
        <ellipse cx={pts[2].x + 2.6} cy={pts[2].y - 0.6} rx={4.2 * b} ry={1.8} fill={fill} />
        <circle cx={pts[1].x} cy={pts[1].y} r={0.8} fill={pin} />
      </g>
    );
    const w = cfg.waist * 1.3;
    const sh = cfg.sh * 1.3;
    const sway = 2.2 * sw * st.g;
    const torso = `M${-w} 0 C${-w - 1} ${-T * 0.35} ${-sh * 0.95} ${-T * 0.6} ${-sh * 0.9} ${-T} L${sh * 0.7} ${-T} C${sh * 1.05} ${-T * 0.75} ${sh} ${-T * 0.45} ${w} 0 Z`;
    const hem = legL - 3;
    const robe =
      cfg.robe === "dhoti" ? (
        <path d={`M${-w - 0.5} -1 L${w + 0.5} -1 L${w + 3 + sway} 17 Q${sway} 20 ${-w - 3 + sway} 17 Z`} fill={fill} />
      ) : cfg.robe === "sari" || cfg.robe === "robe" ? (
        <path d={`M${-w} -2 L${w} -2 C${w + 3} 12 ${w + 6 + sway} ${hem * 0.7} ${w + 7 + sway} ${hem} L${-w - 6 + sway} ${hem} C${-w - 4} ${hem * 0.7} ${-w - 2} 12 ${-w} -2 Z`} fill={fill} />
      ) : null;
    const pallu =
      cfg.robe === "sari" ? <path d={`M${sh * 0.5} ${-T} Q${-sh * 2} ${-T * 0.6} ${-sh * 1.7 - sway * 0.5} ${-4} L${-sh * 0.9} ${-6} Q${-sh} ${-T * 0.5} ${sh * 0.2} ${-T + 2} Z`} fill={fill} /> : null;
    const tail = cfg.tail ? (
      <path
        d={`M${-w} -3 C${-w - 14} 0 ${-w - 19 - sway} -22 ${-w - 9} ${-27 - 1.5 * Math.sin(t * 2 + st.seed)} C${-w - 4} -28 ${-w - 2} -24 ${-w - 5} -22`}
        fill="none"
        stroke={fill}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    ) : null;
    const fore = q.fa1 + q.fa2;
    const flame = mix(tint, 70, L);
    // Bowing joins the hands: the back hand meets the front one.
    return (
      <g key={st.ci} transform={`translate(${st.px} ${oyL}) rotate(${rock + wob}) scale(${st.dir * u * k} ${u * k})`}>
        <path d={`M${fa[2].x} ${fa[2].y} L${fa[2].x - 8} ${rodEnd(oyL, k)}`} stroke={rodC} strokeWidth={rodW} />
        <path d={`M${ba[2].x} ${ba[2].y} L${ba[2].x - 12} ${rodEnd(oyL, k)}`} stroke={rodC} strokeWidth={rodW} />
        {arm(ba, "ba")}
        {leg(bl, "bl")}
        {leg(fl, "fl")}
        {tail}
        <g transform={`translate(${hip.x} ${hip.y})`}>
          {robe}
          {cfg.robe === "dhoti" ? [-2, 1, 4].map((x) => <circle key={x} cx={x + sway * 0.5} cy={13} r={0.7} fill={pin} />) : null}
          <g transform={`rotate(${lean})`}>
            <path d={torso} fill={fill} />
            {seg("neck", { x: 0.5, y: -T + 1 }, { x: 1, y: -T - 5 }, 4.2 * b, 3.6 * b, fill)}
            {pallu}
            {[0.32, 0.5, 0.68].map((f) => (
              <circle key={f} cx={sh * 0.35} cy={-T * f} r={0.75} fill={pin} />
            ))}
          </g>
        </g>
        <g transform={`translate(${head.x} ${head.y}) rotate(${lean * 0.6 + q.head}) scale(1.22)`}>{headArt(cfg.head, cfg.beard, fill, pin, a === "demon")}</g>
        <circle cx={shF.x} cy={shF.y} r={0.8} fill={pin} />
        {arm(fa, "fa")}
        <g transform={`translate(${fa[2].x} ${fa[2].y})`}>{a === "monkey" && st.hold === "none" ? null : heldArt(st.hold, fore, fill, flame, t)}</g>
        <circle cx={hip.x} cy={hip.y} r={0.8} fill={pin} />
      </g>
    );
  };

  // Life: embers rise in firelight.
  const embers =
    light === "fire"
      ? Array.from({ length: 18 }, (_, i) => {
          const sp = 0.12 + 0.1 * hash(i * 5.1);
          const p = (t * sp + hash(i * 2.3)) % 1;
          const x = W * (0.1 + 0.8 * hash(i * 9.7)) + 26 * Math.sin(t * 1.3 + i);
          const y = gy - p * H * 0.62;
          return <circle key={`e${i}`} cx={x} cy={y} r={2.5 + 2.5 * hash(i * 1.9)} fill={mix(tint, 70, L)} opacity={0.75 * Math.sin(Math.PI * p) * up} />;
        })
      : null;

  // Valance scallops and the ledge's cut-paper lace.
  const valance = (() => {
    const n = Math.max(6, Math.round(W / 130));
    const step = W / n;
    let d = `M-40 -40 L${W + 40} -40 L${W + 40} ${valH * 0.62}`;
    for (let i = n; i > 0; i--) d += ` Q${(i - 0.5) * step} ${valH * 1.3} ${(i - 1) * step} ${valH * 0.62}`;
    return `${d} L-40 ${valH * 0.62} Z`;
  })();
  const lace = (() => {
    const step = 28;
    const n = Math.ceil(W / step) + 2;
    let d = `M-40 ${gy + 2}`;
    for (let i = -1; i < n; i++) d += ` L${i * step + step / 2} ${gy - 11} L${(i + 1) * step} ${gy + 2}`;
    return `${d} L${W + 40} ${H + 60} L-40 ${H + 60} Z`;
  })();

  const capAt = cueAt(cues, props.captionWord, 0.8) - 0.1;
  const cap = E(capAt, 0.8);
  const capSize = hand ? 66 : 56;
  const ledgeH = H - gy;

  return (
    <AbsoluteFill style={{ background: S, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        {/* The backlit screen. */}
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, background: `radial-gradient(circle ${R}px at ${lx}px ${ly}px, ${core} 0%, ${midC} 42%, ${edge} 100%)` }} />
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <filter id="kit-ss-paper" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <filter id="kit-ss-far" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={3.2} />
            </filter>
            <filter id="kit-ss-mid" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={1.1} />
            </filter>
            <radialGradient id="kit-ss-halo">
              <stop offset="0%" stopColor={core} stopOpacity={0.9} />
              <stop offset="100%" stopColor={core} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={W} height={H} filter="url(#kit-ss-paper)" opacity={0.07} style={{ mixBlendMode: "multiply" }} />
          {light === "moon" ? (
            <g transform={`translate(${farShift * 0.5} 0)`}>
              <circle cx={W * 0.76} cy={H * 0.24} r={H * 0.16} fill="url(#kit-ss-halo)" />
              <circle cx={W * 0.76} cy={H * 0.24} r={H * 0.055} fill={mix(L, 92, tint)} />
            </g>
          ) : null}
          {/* Far layer: hills and mountains, soft and pale. */}
          <g filter="url(#kit-ss-far)" opacity={0.34}>
            <path d={hills} fill={S} transform={`translate(${farShift} 0)`} />
            {placed.filter((p) => p.kind === "mountain").map((p, k) => drawPiece(p, k, "far"))}
          </g>
          {/* Middle layer: the set. */}
          <g filter="url(#kit-ss-mid)" opacity={0.6}>
            {rivers.map((p) => (
              <path
                key={`rv${p.key}`}
                d={(() => {
                  const x0 = p.x + p.off - W * 0.8;
                  const n = 32;
                  let d = `M${x0} ${gy + 4}`;
                  for (let i = 0; i <= n; i++) {
                    const x = x0 + (W * 1.6 * i) / n;
                    d += ` L${x.toFixed(1)} ${(gy - 3 * u - 2.4 * u * Math.sin(i * 1.3 + t * 1.6)).toFixed(1)}`;
                  }
                  return `${d} L${x0 + W * 1.6} ${gy + 4} Z`;
                })()}
                fill={S}
              />
            ))}
            {placed.filter((p) => p.kind !== "mountain" && p.kind !== "river").map((p, k) => drawPiece(p, k, "mid"))}
          </g>
          {embers}
          {/* Puppets, pressed to the screen: sharp and darkest. */}
          {states.map((st) => drawPuppet(st))}
          <path d={lace} fill={S} />
          {/* Dim the screen until the lamp is up. */}
          <rect width={W} height={H} fill={S} opacity={0.55 * (1 - up)} />
        </svg>
      </div>

      {/* The proscenium valance stays put while the camera moves: it is the theatre, not the world. */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
        <path d={valance} fill={S} />
        {Array.from({ length: Math.ceil(W / 64) }, (_, i) => (
          <circle key={`vp${i}`} cx={32 + i * 64} cy={valH * 0.32} r={3} fill={pin} opacity={0.5} />
        ))}
      </svg>

      {/* Outside the rig: the caption on the ledge, then the vignette. */}
      {props.caption ? (
        <div style={{ position: "absolute", left: side, width: W - side * 2, top: gy + (ledgeH - capSize * 1.2) / 2 + 6, overflow: "hidden", textAlign: "center" }}>
          <div
            style={{
              fontFamily: style.display,
              fontWeight: hand ? 700 : 600,
              fontSize: capSize,
              lineHeight: 1.2,
              letterSpacing: hand ? 0 : "-0.01em",
              color: mix(L, 90, tint),
              whiteSpace: "nowrap",
              transform: `translateY(${(1 - cap) * 110}%)`,
            }}
          >
            {props.caption}
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 55%, ${mix(S, 55)} 100%)`, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "shadow-story",
  title: "Shadow story",
  mode: "graphic",
  layouts: ["full"],
  useFor:
    "Telling a myth, fable or historical story as paper cut-out shadow theatre: a backlit screen (warm lamp, moonlight or firelight) with far hills, a middle set (tree, forest, palace, hut, mountain, river, boat) and 1–3 hinged rod puppets drawn as archetypes (hero, heroine, sage, king, demon, monkey, deer, bird). Each beat lands on a spoken word: walk (to a spot, or on the spot), bow, raise an arm or what it holds (bow, staff, sword, lamp), point, or stand still; a puppet can be lifted into view on a word. Give nextSet and the scenery slides past for a journey or a change of place. One narration caption sits on the stage ledge. No media.",
  avoid:
    "Tech explainers and anything needing labels, numbers or diagrams (use flow-diagram or character-scene). More than one beat per ~1.2 s, more than 3 puppets, or a scene change in a segment under 7 s. Puppets are respectful archetypes: never caricature a real person or a deity's sacred iconography, and keep demons dignified, not gory.",
  schema,
  example: {
    caption: "They left the palace for the forest",
    captionWord: "left",
    light: "warm",
    set: [
      { piece: "mountain", x: 0.3 },
      { piece: "palace", x: 0.78 },
      { piece: "tree", x: 0.08 },
    ],
    nextSet: [
      { piece: "mountain", x: 0.75 },
      { piece: "forest", x: 0 },
      { piece: "river", x: 0.5 },
      { piece: "hut", x: 0.92 },
    ],
    nextSetWord: "forest",
    characters: [
      { id: "prince", archetype: "hero", x: 0.42, facing: "right", holds: "bow" },
      { id: "princess", archetype: "heroine", x: 0.24, facing: "right" },
      { id: "deer", archetype: "deer", x: 0.74, facing: "left", enterWord: "deer" },
    ],
    beats: [
      { word: "prince", who: "prince", action: "raise" },
      { word: "left", who: "prince", action: "walk" },
      { word: "palace", who: "princess", action: "walk" },
      { word: "until", who: "prince", action: "still" },
      { word: "stopped", who: "princess", action: "still" },
      { word: "golden", who: "deer", action: "bow" },
      { word: "appeared", who: "princess", action: "point" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.5, end: 0.9, word: "prince" },
    { at: 1.9, end: 2.2, word: "left" },
    { at: 2.5, end: 3.0, word: "palace" },
    { at: 3.7, end: 4.2, word: "forest" },
    { at: 5.6, end: 5.9, word: "until" },
    { at: 6.1, end: 6.6, word: "stopped" },
    { at: 6.9, end: 7.3, word: "deer" },
    { at: 7.4, end: 7.8, word: "golden" },
    { at: 8.0, end: 8.5, word: "appeared" },
  ],
  seconds: { min: 5, max: 15, demo: 10 },
  mediaSlots: 0,
  credit: { name: "'Shadow theatre home story' by @x4b47x (prompt-motion.com)", url: "https://prompt-motion.com/x4b47x-9cc84f" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
