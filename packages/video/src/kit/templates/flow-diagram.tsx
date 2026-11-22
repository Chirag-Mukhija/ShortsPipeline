// Flow diagram: a system-design diagram whose components draw on, then requests travel the arrows on spoken words while the camera glides to the active part; a component can light up, fail or scale out.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const KINDS = ["client", "user", "server", "service", "lb", "cache", "db", "queue"] as const;
type Kind = (typeof KINDS)[number];

const nodeSchema = z.object({
  id: z.string().min(1).max(16).describe("Short id that edges and steps refer to, e.g. 'api'"),
  label: z.string().min(1).max(16).describe("1–2 word name under the box, e.g. 'Load balancer'"),
  kind: z.enum(KINDS).describe("Icon drawn in the box: client (screen), user (person), server (rack), service (hexagon), lb (load balancer fork), cache (bolt), db (cylinder), queue (slots)"),
  col: z.number().int().min(0).max(4).describe("Grid column 0–4; the flow reads left to right"),
  row: z.number().int().min(0).max(2).describe("Grid row 0–2; one box per cell"),
});

const edgeSchema = z.object({
  id: z.string().max(16).optional().describe("Optional id so a step can target this edge by name"),
  from: z.string().max(16).describe("Node id the arrow starts at"),
  to: z.string().max(16).describe("Node id the arrow points to"),
  label: z.string().max(12).optional().describe("Tiny label on the arrow, e.g. 'read' or 'on miss'"),
});

const stepSchema = z.object({
  action: z.enum(["flow", "highlight", "fail", "scale"]).describe("flow: packets travel an edge; highlight: a node lights up; fail: a node shakes once and turns red-accent with an X (later packets to it burst short of it); scale: a node duplicates into a stack"),
  target: z
    .string()
    .max(34)
    .describe("flow: an edge as 'from>to' (write 'to>from' to send a response back along the same arrow), an edge id, or a node id to fan out along all its outgoing edges. highlight/fail/scale: a node id"),
  word: z.string().optional().describe("Spoken word the step lands on"),
  count: z.number().int().min(1).max(6).optional().describe("flow: packets sent (default 1); scale: copies in total (default 3, max 4)"),
});

type Node = z.infer<typeof nodeSchema>;
type Edge = z.infer<typeof edgeSchema>;
type Step = z.infer<typeof stepSchema>;
type Path = { edge: number; rev: boolean };

// Turns a step target into the edges packets travel and/or the node it acts on.
const resolveTarget = (target: string, nodes: Node[], edges: Edge[]): { paths: Path[]; node?: string } => {
  const named = edges.findIndex((e) => e.id === target);
  if (named >= 0) return { paths: [{ edge: named, rev: false }] };
  const [a, b] = target.split(">").map((s) => s.trim());
  if (b !== undefined) {
    const fwd = edges.findIndex((e) => e.from === a && e.to === b);
    if (fwd >= 0) return { paths: [{ edge: fwd, rev: false }] };
    const back = edges.findIndex((e) => e.from === b && e.to === a);
    return { paths: back >= 0 ? [{ edge: back, rev: true }] : [] };
  }
  if (!nodes.some((n) => n.id === target)) return { paths: [] };
  return { node: target, paths: edges.flatMap((e, i) => (e.from === target ? [{ edge: i, rev: false }] : [])) };
};

const schema = z
  .object({
    caption: z.string().max(36).optional().describe("One headline above the diagram, ≤ 6 words, e.g. 'When the cache goes down'"),
    captionWord: z.string().optional().describe("Spoken word the headline lands on"),
    nodes: z.array(nodeSchema).min(2).max(7).describe("The components (3–7 read best), placed on a coarse grid"),
    edges: z.array(edgeSchema).max(10).describe("Arrows between components"),
    steps: z.array(stepSchema).max(8).describe("What happens, in spoken order; one focal action each"),
  })
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    const cells = new Set<string>();
    p.nodes.forEach((n, i) => {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `Duplicate node id '${n.id}'`, path: ["nodes", i, "id"] });
      ids.add(n.id);
      const cell = `${n.col},${n.row}`;
      if (cells.has(cell)) ctx.addIssue({ code: "custom", message: `Two nodes share grid cell ${cell}`, path: ["nodes", i] });
      cells.add(cell);
    });
    p.edges.forEach((e, i) => {
      if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) ctx.addIssue({ code: "custom", message: `Edge ${e.from}>${e.to} must join two different existing nodes`, path: ["edges", i] });
    });
    p.steps.forEach((s, i) => {
      const r = resolveTarget(s.target, p.nodes, p.edges);
      const ok = s.action === "flow" ? r.paths.length > 0 : Boolean(r.node);
      if (!ok) ctx.addIssue({ code: "custom", message: `Step target '${s.target}' doesn't resolve for '${s.action}'`, path: ["steps", i, "target"] });
    });
  });

type Pt = { x: number; y: number };
type Rect = { x0: number; y0: number; x1: number; y1: number };
type Geo = { x: number; y: number; tw: number; th: number; labelTop: number; labelW: number; labelH: number };
type Shot = { s: number; x: number; y: number };

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Grid cells to canvas positions. The wide shot IS the canvas (world = screen at scale 1), so text sizes are true on-screen sizes and the camera only ever pushes in.
// On a narrow canvas the grid may be transposed (flow reads top to bottom) when that gives clearly bigger boxes.
const layout = (nodes: Node[], edges: Edge[], W: number, H: number, top: number, labelSize: number) => {
  const side = Math.max(72, W * 0.06);
  const areaW = W - side * 2;
  const areaH = H - top - H * 0.07;
  const cs = nodes.map((n) => n.col);
  const rs = nodes.map((n) => n.row);
  const c0 = Math.min(...cs);
  const r0 = Math.min(...rs);
  const C = Math.max(...cs) - c0 + 1;
  const R = Math.max(...rs) - r0 + 1;
  const longest = Math.max(...nodes.map((n) => n.label.length)) * labelSize * 0.56;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // Does any arrow join two boxes stacked in one column of the drawn grid? Then the cell must leave room for that arrow.
  const stacked = (flip: boolean) =>
    edges.some((e) => {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      return a && b && (flip ? a.row === b.row : a.col === b.col);
    });
  const fit = (cc: number, rr: number, flip: boolean) => {
    const cw = areaW / cc;
    const ch = areaH / rr;
    // Reserve a second label line only when the longest label won't fit on one.
    const block = labelSize * (longest > Math.min(cw * 0.86, 380) ? 2.4 : 1.25) + 14;
    return { cw, ch, tw: Math.max(70, Math.min(cw * 0.58, (ch * (stacked(flip) ? 0.64 : 0.9) - block) / 0.8, 240)) };
  };
  const normal = fit(C, R, false);
  const flipped = fit(R, C, true);
  const flip = flipped.tw > normal.tw * 1.15;
  const { cw, ch, tw } = flip ? flipped : normal;
  const th = tw * 0.8;
  // Labels wrap before they reach 86% of the cell, so neighbouring labels never touch.
  const maxLW = Math.min(cw * 0.86, 380);
  const twoLines = nodes.some((n) => n.label.length * labelSize * 0.56 > maxLW);
  // One label height for every box, so boxes in a row stay aligned.
  const groupH = th + 14 + (twoLines ? 2 : 1) * labelSize * 1.15;
  const geo = new Map<string, Geo>();
  for (const n of nodes) {
    const ci = flip ? n.row - r0 : n.col - c0;
    const ri = flip ? n.col - c0 : n.row - r0;
    const est = n.label.length * labelSize * 0.56;
    const lines = est > maxLW ? 2 : 1;
    const labelH = lines * labelSize * 1.15;
    const y = top + ch * (ri + 0.5) - groupH / 2 + th / 2;
    geo.set(n.id, { x: side + cw * (ci + 0.5), y, tw, th, labelTop: y + th / 2 + 14, labelW: lines === 2 ? maxLW : est, labelH });
  }
  return { geo, tw, th, maxLW };
};

// Distance from a tile's centre to the edge of its tile-plus-label box along u, so arrows never cross a label.
const exitT = (g: Geo, u: Pt, gap: number) => {
  const tx = u.x > 1e-6 ? (g.tw / 2 + gap) / u.x : u.x < -1e-6 ? (g.tw / 2 + gap) / -u.x : Infinity;
  const ty = u.y > 1e-6 ? (g.labelTop + g.labelH + gap * 0.4 - g.y) / u.y : u.y < -1e-6 ? (g.th / 2 + gap) / -u.y : Infinity;
  return Math.min(tx, ty);
};

const GLYPHS: Record<Kind, string[]> = {
  client: ["M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z", "M12 16.5v4M8.5 20.5h7"],
  user: ["M12 3.5a4 4 0 1 1 0 8a4 4 0 1 1 0-8z", "M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"],
  server: ["M4 4h16v6.5H4z", "M4 13.5h16V20H4z", "M7.5 7.2h.01M7.5 16.8h.01", "M11 7.2h5.5M11 16.8h5.5"],
  service: ["M12 2.8l8 4.6v9.2l-8 4.6l-8-4.6V7.4z", "M12 9.2a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 1 1 0-5.6z"],
  lb: ["M5 9.8a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4z", "M7.4 11L17 5.2M7.6 12H17M7.4 13L17 18.8", "M19 3.6a1.7 1.7 0 1 1 0 3.4a1.7 1.7 0 1 1 0-3.4zM19 10.3a1.7 1.7 0 1 1 0 3.4a1.7 1.7 0 1 1 0-3.4zM19 17a1.7 1.7 0 1 1 0 3.4a1.7 1.7 0 1 1 0-3.4z"],
  cache: ["M13.5 2.5L5 13.5h6.5l-1 8l8.5-11h-6.5z"],
  db: ["M4.5 5.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3s-3.4 3-7.5 3s-7.5-1.3-7.5-3z", "M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13", "M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"],
  queue: ["M2.5 7h19v10h-19z", "M8.8 7v10M15.2 7v10"],
};

const Glyph: FC<{ kind: Kind; size: number; color: string; draw: number; weight: number }> = ({ kind, size, color, draw, weight }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
    {GLYPHS[kind].map((d, i) => {
      const p = clamp01(draw * 1.35 - i * 0.15);
      return <path key={i} d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={p > 0.001 ? 1 : 0} />;
    })}
  </svg>
);

const flowDur = (count: number, travel: number) => travel + (count - 1) * 0.18 + 0.1;
const travelFor = (len: number) => Math.min(1.05, Math.max(0.55, 0.42 + len / 1400));
const PACKET_GAP = 0.18;
// Packets to a failed node stop at this share of the arrow and burst; BLOCK_U is when (in 0–1 travel time) the sine-eased packet reaches it.
const BLOCK_AT = 0.8;
const BLOCK_U = Math.acos(1 - 2 * BLOCK_AT) / Math.PI;

const Diagram: FC<{ props: z.infer<typeof schema>; style: Style; W: number; H: number; duration: number; cues: { at: number; end: number; word: string }[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const { nodes, edges, steps } = props;

  // Headline and the band it needs at the top.
  const capSize = narrow ? 54 : 64;
  const side = Math.max(72, W * 0.06);
  const capLines = props.caption ? Math.ceil((props.caption.length * capSize * 0.5) / (W - side * 2)) : 0;
  const capTop = H * 0.07;
  const top = props.caption ? capTop + capLines * capSize * 1.12 + 56 : H * 0.08;
  const labelSize = hand ? (narrow ? 40 : 44) : narrow ? 32 : 34;
  const { geo, tw, th } = layout(nodes, edges, W, H, top, labelSize);
  const G = (id: string) => geo.get(id) as Geo;

  // Edge geometry: straight arrows between tile centres, trimmed to each box.
  const eg = edges.map((e) => {
    const A = G(e.from);
    const B = G(e.to);
    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
    const ta = exitT(A, u, 14);
    const tb = exitT(B, { x: -u.x, y: -u.y }, 14);
    const a = { x: A.x + u.x * ta, y: A.y + u.y * ta };
    const b = { x: B.x - u.x * tb, y: B.y - u.y * tb };
    let n = { x: -u.y, y: u.x };
    if (n.y > 0.01 || (Math.abs(n.y) <= 0.01 && n.x < 0)) n = { x: -n.x, y: -n.y };
    return { a, b, u, n, len: Math.max(1, L - ta - tb) };
  });

  // Build: components draw on in reading order, each arrow once both its ends exist.
  const order = [...nodes].sort((p, q) => p.col - q.col || p.row - q.row);
  const stagger = Math.min(0.26, 1.4 / nodes.length);
  const nodeAt = new Map(order.map((n, i) => [n.id, 0.15 + i * stagger]));
  const edgeAt = edges.map((e) => Math.max(nodeAt.get(e.from) ?? 0, nodeAt.get(e.to) ?? 0) + 0.32);
  const buildEnd = Math.max(0.15 + (nodes.length - 1) * stagger + 0.55, ...edgeAt.map((x) => x + 0.45));

  // Steps: resolved targets, durations, and times (spoken word, else spread over the free time), clamped so everything settles 0.6 s before the end.
  const pullDur = duration >= 7 ? 1.0 : 0.6;
  const resolved = steps.map((s: Step) => {
    const r = resolveTarget(s.target, nodes, edges);
    const travel = Math.max(0.55, ...r.paths.map((p) => travelFor(eg[p.edge]!.len)));
    const count = s.action === "scale" ? Math.min(4, Math.max(2, s.count ?? 3)) : Math.max(1, s.count ?? 1);
    const dur = s.action === "flow" ? flowDur(count, travel) : s.action === "scale" ? 0.5 + (count - 1) * 0.12 + 0.3 : 0.7;
    return { ...s, ...r, count, dur, at: 0 };
  });
  const startF = buildEnd + 0.15;
  const lastDur = resolved.length ? resolved[resolved.length - 1]!.dur : 0;
  const endF = Math.max(startF, duration - 0.6 - pullDur - lastDur);
  resolved.forEach((s, i) => {
    const fb = resolved.length === 1 ? startF : startF + (i * (endF - startF)) / (resolved.length - 1);
    // Land a few frames before the word, so the picture is moving as it is spoken.
    const at = cueAt(cues, s.word, fb + 0.1) - 0.1;
    s.at = Math.min(Math.max(at, buildEnd * 0.85), duration - 0.6 - s.dur);
  });
  const timeline = [...resolved].sort((p, q) => p.at - q.at);
  const failAt = (id: string) => Math.min(Infinity, ...resolved.filter((s) => s.action === "fail" && s.node === id).map((s) => s.at));

  // Packets, their arrivals (for the receive pulse) and each edge's busy windows.
  const packets: { path: Path; launch: number; T: number; blocked: boolean }[] = [];
  const arrivals = new Map<string, number[]>();
  const busy: [number, number][][] = edges.map(() => []);
  for (const s of resolved) {
    if (s.action !== "flow") continue;
    for (const path of s.paths) {
      const T = travelFor(eg[path.edge]!.len);
      const dest = path.rev ? edges[path.edge]!.from : edges[path.edge]!.to;
      for (let k = 0; k < s.count; k++) {
        const launch = s.at + k * PACKET_GAP;
        const blocked = failAt(dest) < launch + T * BLOCK_U;
        packets.push({ path, launch, T, blocked });
        if (!blocked) arrivals.set(dest, [...(arrivals.get(dest) ?? []), launch + T]);
      }
      busy[path.edge]!.push([s.at, s.at + (s.count - 1) * PACKET_GAP + T]);
    }
  }

  // Camera: world = canvas at scale 1. Shots frame the step's components inside the viewport below the headline band.
  const vy0 = props.caption ? top - 40 : 0;
  const vc = { x: W / 2, y: (vy0 + H) / 2 };
  const vw = W;
  const vh = H - vy0;
  // The viewport never shows world above the headline band, so a pushed-in shot can't slide content under the headline.
  const clampShot = (x: number, y: number, s: number): Shot => ({
    s,
    x: Math.min(Math.max(x, vc.x / s), W - (W - vc.x) / s),
    y: Math.min(Math.max(y, vy0 + (vc.y - vy0) / s), H - (H - vc.y) / s),
  });
  const wide: Shot = { s: 1, x: vc.x, y: vc.y };
  const nodeRect = (id: string, extra = 0): Rect => {
    const g = G(id);
    const hw = Math.max(g.tw, g.labelW) / 2;
    return { x0: g.x - hw, y0: g.y - g.th / 2 - extra, x1: g.x + hw + extra, y1: g.labelTop + g.labelH };
  };
  const union = (rs: Rect[]): Rect => ({ x0: Math.min(...rs.map((r) => r.x0)), y0: Math.min(...rs.map((r) => r.y0)), x1: Math.max(...rs.map((r) => r.x1)), y1: Math.max(...rs.map((r) => r.y1)) });
  const visible = (sh: Shot): Rect => ({ x0: sh.x - vc.x / sh.s, x1: sh.x + (W - vc.x) / sh.s, y0: sh.y - (vc.y - vy0) / sh.s, y1: sh.y + (H - vc.y) / sh.s });
  const inside = (r: Rect, v: Rect) => r.x0 >= v.x0 && r.x1 <= v.x1 && r.y0 >= v.y0 && r.y1 <= v.y1;
  const frameOn = (r: Rect, maxS: number): Shot => {
    const pad = 56;
    const rw = r.x1 - r.x0 + pad * 2;
    const rh = r.y1 - r.y0 + pad * 2;
    const s = Math.min(maxS, Math.max(1, Math.min((vw * 0.8) / rw, (vh * 0.8) / rh)));
    return clampShot((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, s);
  };

  type Move = { a: number; b: number; to: Shot; ease: (x: number) => number };
  const first = G(order[0]!.id);
  const startShot = clampShot(first.x * 0.6 + vc.x * 0.4, first.y * 0.6 + vc.y * 0.4, 1.14);
  const pull = Easing.out(Easing.cubic);
  const moves: Move[] = [{ a: 0.1, b: Math.max(1, buildEnd), to: wide, ease: pull }];
  let last = wide;
  let lastEnd = Math.max(1, buildEnd);
  let actionsEnd = buildEnd;
  for (const s of timeline) {
    const ids = s.node ? (s.action === "flow" ? [s.node, ...s.paths.map((p) => edges[p.edge]!.to)] : [s.node]) : s.paths.flatMap((p) => [edges[p.edge]!.from, edges[p.edge]!.to]);
    const r = union(ids.map((id) => nodeRect(id, s.action === "scale" && id === s.node ? (s.count - 1) * tw * 0.12 : 0)));
    const want = frameOn(r, s.node && s.action !== "flow" ? 1.4 : 1.5);
    // Hold when the action is already in frame and a push would add little; every move is a glide or push that the final pull-back answers.
    if (!(inside(r, visible(last)) && want.s < last.s * 1.25)) {
      const a = Math.max(lastEnd, s.at - 0.8);
      const b = Math.max(a + 0.45, s.at - 0.02);
      moves.push({ a, b, to: want, ease: sine });
      lastEnd = b;
      last = want;
    }
    actionsEnd = Math.max(actionsEnd, s.at + s.dur);
  }
  if (last !== wide) {
    const b = duration - 0.6;
    const a = Math.min(b - 0.3, Math.max(lastEnd, actionsEnd - 0.1, b - pullDur));
    moves.push({ a, b, to: wide, ease: pull });
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
  // Base drift keeps holds alive; small enough to read as breathing, not motion.
  const s = cam.s * (1 + 0.007 * Math.sin((2 * Math.PI * t) / 9));
  const ox = vc.x - cam.x * s + 3.5 * Math.sin((2 * Math.PI * t) / 7.3);
  const oy = vc.y - cam.y * s + 2.5 * Math.sin((2 * Math.PI * t) / 8.7 + 1);
  const zoomed = clamp01((cam.s - 1) / 0.12);

  // Look.
  const lineColor = hand ? mix(style.ink, 72) : mix(style.ink, 34);
  const lineW = hand ? 3.5 : 3;
  const border = hand ? `3px solid ${style.ink}` : `2px solid ${mix(style.ink, 14)}`;
  const radius = Math.min(style.radius * 1.1, tw * 0.2);
  const pr = Math.max(10, tw * 0.07);
  const capAt = cueAt(cues, props.captionWord, 0.4) - 0.1;
  const cap = enter(style, frame, fps, capAt, 0.8);
  const edgeFont = narrow ? 30 : 30;

  const lastStepBefore = (time: number) => timeline.find((x) => x.at > time + 0.01)?.at ?? Infinity;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(55% 55% at 88% 96%, ${mix(style.accent, 9)} 0%, transparent 70%), radial-gradient(120% 95% at 28% 12%, ${mix(style.surface, 75, style.bg)} 0%, ${style.bg} 68%)`,
        overflow: "hidden",
      }}
    >
      {/* Life layer: a dot grid at 0.6 parallax, so camera moves read as depth. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${(ox - 0) * 0.6}px, ${(oy - 0) * 0.6}px) scale(${1 + (s - 1) * 0.6})`, transformOrigin: "0 0" }}>
        <svg width={W * 3} height={H * 3} style={{ position: "absolute", left: -W, top: -H }}>
          <defs>
            <pattern id="kit-flow-dots" width={44} height={44} patternUnits="userSpaceOnUse">
              <circle cx={22} cy={22} r={2.2} fill={style.muted} />
            </pattern>
          </defs>
          <rect width={W * 3} height={H * 3} fill="url(#kit-flow-dots)" opacity={0.26 + 0.06 * Math.sin((2 * Math.PI * t) / 6)} />
        </svg>
      </div>

      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {edges.map((e, i) => {
            const { a, b, u, n } = eg[i]!;
            const d = enter(calm, frame, fps, edgeAt[i]!, 0.45);
            if (d <= 0.001) return null;
            const fa = Math.min(failAt(e.from), failAt(e.to));
            const dead = t >= fa + 0.2;
            const end = { x: b.x - u.x * 12, y: b.y - u.y * 12 };
            // Hand temperament boils the line (never the frame): the midpoint wobbles a few px, re-drawn 8 times a second.
            const j = hand ? (hash(i * 17 + Math.floor(t * 8)) - 0.5) * 7 : 0;
            const path = `M${a.x} ${a.y} Q${(a.x + end.x) / 2 + n.x * j} ${(a.y + end.y) / 2 + n.y * j} ${end.x} ${end.y}`;
            const act = Math.max(0, ...busy[i]!.map(([w0, w1]) => clamp01((t - w0) / 0.2) * clamp01((w1 + 0.25 - t) / 0.25)));
            const head = clamp01((d - 0.8) / 0.2);
            const ang = (Math.atan2(u.y, u.x) * 180) / Math.PI;
            const color = dead ? mix(style.muted, 70) : lineColor;
            return (
              <g key={i}>
                {dead ? (
                  <path d={path} fill="none" stroke={color} strokeWidth={lineW} strokeLinecap="round" strokeDasharray="10 14" />
                ) : (
                  <path d={path} fill="none" stroke={color} strokeWidth={lineW} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - d} />
                )}
                {act > 0 ? <path d={path} fill="none" stroke={style.accent} strokeWidth={lineW + 3} strokeLinecap="round" opacity={act * 0.75} /> : null}
                <g transform={`translate(${b.x} ${b.y}) rotate(${ang}) scale(${head})`} opacity={head}>
                  {hand ? (
                    <path d="M-17 -9 L0 0 L-17 9" fill="none" stroke={act > 0.5 ? style.accent : color} strokeWidth={lineW} strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M-18 -9.5 L0 0 L-18 9.5 Z" fill={act > 0.5 ? style.accent : color} />
                  )}
                </g>
              </g>
            );
          })}
        </svg>

        {nodes.map((nd, idx) => {
          const g = G(nd.id);
          const at = nodeAt.get(nd.id) ?? 0;
          const a = enter(style, frame, fps, at, 0.55);
          const draw = enter(calm, frame, fps, at + 0.12, 0.6);
          const lab = enter(style, frame, fps, at + 0.14, 0.5);
          const fT = failAt(nd.id);
          const f = fT < Infinity ? enter(calm, frame, fps, fT, 0.35) : 0;
          const fx = t > fT && t < fT + 0.6 ? 16 * Math.sin(((t - fT) * 2 * Math.PI) / 0.12) * Math.exp(-(t - fT) * 7) : 0;
          const xb = fT < Infinity ? enter(style, frame, fps, fT + 0.18, 0.45) : 0;
          const hls = resolved.filter((x) => x.action === "highlight" && x.node === nd.id && x.at <= t);
          const hl = hls.length ? hls[hls.length - 1] : undefined;
          const next = hl ? lastStepBefore(hl.at) : Infinity;
          const h = hl ? enter(style, frame, fps, hl.at, 0.5) * (next < Infinity ? 1 - 0.55 * enter(calm, frame, fps, next, 0.4) : 1) : 0;
          const sc = resolved.find((x) => x.action === "scale" && x.node === nd.id);
          const bumpOf = (x: number) => (x >= 0 && x <= 0.42 ? Math.sin((Math.PI * x) / 0.42) : 0);
          const arr = arrivals.get(nd.id) ?? [];
          const bump = Math.max(0, ...arr.map((ta) => bumpOf(t - ta)));
          const ring = arr.filter((ta) => t >= ta && t <= ta + 0.5).pop();
          const rot = hand ? (hash(idx * 7.3) - 0.5) * 2.4 : 0;
          const iconBase = mix(style.accent, h * 100, style.ink);
          const iconColor = mix(style.bg, f * 100, iconBase);
          const fill = mix(style.accent, f * 100, style.surface);
          const dOff = tw * 0.12;
          const tile = (extra: object, key: string, children?: ReactNode) => (
            <div
              key={key}
              style={{
                position: "absolute",
                left: g.x - tw / 2,
                top: g.y - th / 2,
                width: tw,
                height: th,
                borderRadius: radius,
                border,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...extra,
              }}
            >
              {children}
            </div>
          );
          return (
            <div key={nd.id} style={{ position: "absolute", left: 0, top: 0, opacity: a, transform: `translate(${fx}px, ${(1 - a) * 22}px)` }}>
              {sc
                ? Array.from({ length: sc.count - 1 }, (_, k) => {
                    const c = enter(style, frame, fps, sc.at + k * 0.12, 0.5);
                    const o = (sc.count - 1 - k) * dOff * c;
                    return tile({ background: mix(style.surface, 100, style.bg), opacity: c, transform: `translate(${o}px, ${-o}px) rotate(${rot}deg)`, boxShadow: "0 10px 30px rgba(0,0,0,0.10)" }, `copy${k}`);
                  })
                : null}
              {ring !== undefined
                ? tile({ border: `3px solid ${style.accent}`, background: "transparent", opacity: (1 - (t - ring) / 0.5) * 0.8, transform: `rotate(${rot}deg) scale(${1 + ((t - ring) / 0.5) * 0.28})` }, "ring")
                : null}
              {tile(
                {
                  background: fill,
                  transform: `rotate(${rot}deg) scale(${(0.72 + 0.28 * a) * (1 + 0.06 * bump)})`,
                  boxShadow: `0 ${tw * 0.07}px ${tw * 0.2}px rgba(0,0,0,0.12), 0 0 ${48 * h}px ${mix(style.accent, 45 * h)}`,
                  outline: h > 0.01 ? `${4}px solid ${mix(style.accent, h * 100)}` : undefined,
                  outlineOffset: 8 + (1 - h) * 14,
                },
                "tile",
                <Glyph kind={nd.kind} size={tw * 0.46} color={iconColor} draw={draw} weight={hand ? 1.9 : 1.7} />,
              )}
              {fT < Infinity && xb > 0.001 ? (
                <svg
                  width={Math.max(46, tw * 0.3)}
                  height={Math.max(46, tw * 0.3)}
                  viewBox="0 0 24 24"
                  style={{ position: "absolute", left: g.x + tw / 2 - Math.max(46, tw * 0.3) * 0.6, top: g.y - th / 2 - Math.max(46, tw * 0.3) * 0.4, transform: `scale(${xb})` }}
                >
                  <circle cx={12} cy={12} r={11} fill={style.ink} />
                  <path d="M8 8l8 8M16 8l-8 8" stroke={style.bg} strokeWidth={2.6} strokeLinecap="round" />
                </svg>
              ) : null}
              {sc ? (
                <div
                  style={{
                    position: "absolute",
                    left: g.x - tw / 2 - 18,
                    top: g.y - th / 2 - 26,
                    padding: "2px 14px",
                    borderRadius: 999,
                    background: style.accent,
                    color: style.bg,
                    fontFamily: style.mono,
                    fontWeight: 600,
                    fontSize: 30,
                    transform: `scale(${enter(style, frame, fps, sc.at + (sc.count - 1) * 0.12 + 0.2, 0.4)})`,
                  }}
                >
                  ×{sc.count}
                </div>
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: g.x - g.labelW / 2 - 10,
                  top: g.labelTop,
                  width: g.labelW + 20,
                  textAlign: "center",
                  fontFamily: hand ? style.display : style.body,
                  fontWeight: hand ? 700 : 600,
                  fontSize: labelSize,
                  lineHeight: 1.15,
                  color: style.ink,
                  opacity: lab,
                  transform: `translateY(${(1 - lab) * 12}px)`,
                }}
              >
                {nd.label}
              </div>
            </div>
          );
        })}

        {edges.map((e, i) => {
          if (!e.label) return null;
          const { a, b, n } = eg[i]!;
          const l = enter(style, frame, fps, edgeAt[i]! + 0.35, 0.45);
          const est = e.label.length * edgeFont * 0.62;
          const off = Math.abs(n.y) * (edgeFont * 0.85) + Math.abs(n.x) * (est / 2 + 16);
          return (
            <div
              key={`el${i}`}
              style={{
                position: "absolute",
                left: (a.x + b.x) / 2 + n.x * off,
                top: (a.y + b.y) / 2 + n.y * off,
                transform: `translate(-50%, -50%) translateY(${(1 - l) * 10}px)`,
                opacity: l,
                fontFamily: style.mono,
                fontSize: edgeFont,
                color: mix(style.ink, 72, style.bg),
                background: mix(style.bg, 85),
                padding: "0 8px",
                borderRadius: 8,
                whiteSpace: "nowrap",
              }}
            >
              {e.label}
            </div>
          );
        })}

        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {packets.map((pk, i) => {
            const u = (t - pk.launch) / pk.T;
            if (u <= 0) return null;
            const { a, b } = eg[pk.path.edge]!;
            const [p0, p1] = pk.path.rev ? [b, a] : [a, b];
            const at = (p: number) => ({ x: p0.x + (p1.x - p0.x) * p, y: p0.y + (p1.y - p0.y) * p });
            if (pk.blocked && u >= BLOCK_U) {
              const bt = (t - pk.launch - pk.T * BLOCK_U) / 0.35;
              if (bt > 1) return null;
              const q = at(BLOCK_AT);
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r={pr * (1 + bt * 2.4)} fill="none" stroke={style.accent} strokeWidth={4} opacity={1 - bt} />
                  <circle cx={q.x} cy={q.y} r={pr * (1 - bt)} fill={style.accent} />
                </g>
              );
            }
            if (u > 1) return null;
            const p = sine(u);
            const q = at(p);
            const tail = at(Math.max(0, sine(u - 0.12)));
            const vis = clamp01(u / 0.08) * clamp01((1 - u) / 0.06 + 0.25);
            return (
              <g key={i} opacity={vis}>
                <line x1={tail.x} y1={tail.y} x2={q.x} y2={q.y} stroke={style.accent} strokeWidth={pr * 1.1} strokeLinecap="round" opacity={0.35} />
                <circle cx={q.x} cy={q.y} r={pr * 2} fill={style.accent} opacity={0.16} />
                <circle cx={q.x} cy={q.y} r={pr} fill={style.accent} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Outside the rig: a soft pocket behind the headline (the camera clamp keeps content out of it; this only calms the dot grid), the headline, and the vignette. */}
      {props.caption ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: top - 30, background: `linear-gradient(to bottom, ${mix(style.bg, 80)} 0%, transparent 100%)`, opacity: zoomed }} />
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
  id: "flow-diagram",
  title: "Flow diagram",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "System design and 'how it works' beats: 2–7 components (client, load balancer, service, cache, DB, queue…) on a grid of up to 5 columns × 3 rows, joined by arrows. They draw on, then each step lands on a spoken word: packets flow along an arrow (or back along it as a response, or fan out from a node), a component lights up, fails (shakes once, turns accent with an X; later packets to it burst short), or scales into a stack. The camera frames the active part and pulls back to the whole system at the end. In the split panel keep it to 3 columns or fewer for roomy arrows. No media.",
  avoid:
    "More than ~6 steps in under 8 s (each needs about 1 s), labels longer than two words, diagrams that need crossing arrows or more than 7 boxes (split into two segments), and plain lists that have no flow between items (use a list template).",
  schema,
  example: {
    caption: "When the cache goes down",
    captionWord: "request",
    nodes: [
      { id: "app", label: "Mobile app", kind: "client", col: 0, row: 1 },
      { id: "lb", label: "Load balancer", kind: "lb", col: 1, row: 1 },
      { id: "api", label: "API server", kind: "server", col: 2, row: 1 },
      { id: "cache", label: "Redis cache", kind: "cache", col: 3, row: 0 },
      { id: "db", label: "Postgres", kind: "db", col: 3, row: 2 },
    ],
    edges: [
      { from: "app", to: "lb" },
      { from: "lb", to: "api" },
      { from: "api", to: "cache", label: "read" },
      { from: "api", to: "db", label: "on miss" },
    ],
    steps: [
      { action: "flow", target: "app>lb", word: "hits", count: 3 },
      { action: "flow", target: "lb>api", word: "hands", count: 3 },
      { action: "flow", target: "api>cache", word: "checks", count: 2 },
      { action: "fail", target: "cache", word: "dies" },
      { action: "flow", target: "api>db", word: "falls", count: 3 },
      { action: "highlight", target: "db", word: "Postgres" },
      { action: "scale", target: "api", word: "scale", count: 3 },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.4, end: 0.8, word: "Every" },
    { at: 0.8, end: 1.3, word: "request" },
    { at: 2.3, end: 2.6, word: "hits" },
    { at: 3.5, end: 3.9, word: "hands" },
    { at: 4.8, end: 5.2, word: "checks" },
    { at: 6.4, end: 6.8, word: "dies" },
    { at: 7.4, end: 7.8, word: "falls" },
    { at: 8.7, end: 9.3, word: "Postgres" },
    { at: 9.8, end: 10.2, word: "scale" },
  ],
  seconds: { min: 5, max: 14, demo: 12 },
  mediaSlots: 0,
  credit: { name: "'Token bucket rate limiter' by @ParkerRex and 'Celld job ownership explainer' by @0xnfrith (prompt-motion.com)", url: "https://prompt-motion.com/parkerrex-1a54fe" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Diagram props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
