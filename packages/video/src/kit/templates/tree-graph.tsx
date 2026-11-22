// Tree graph: a binary tree, general tree or graph laid out automatically and driven by a real traversal trace; visits draw a ring and fill the node, the current edge glows with a travelling pulse, a path lights up node by node, and a stack or queue strip pushes and pops node chips that fly between the graph and the strip.
import type { FC } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { z } from "zod";
import { type Cue, defineTemplate, type Style } from "../contract";
import { clamp01, cueAt, enter, useT } from "../motion";

const MAX = 15;
const MAX_LEVELS = 5;
const CAP = 10;

const nodeId = z.string().min(1).max(8);

const nodeSchema = z.object({
  id: nodeId.describe("Unique id the steps refer to, e.g. 'A' or 'n7'"),
  label: z.union([z.number().int().min(-99).max(999), z.string().min(1).max(3)]).optional().describe("What the node shows, ≤ 3 characters (a value or a letter); defaults to the id"),
  parent: nodeId.optional().describe("tree only: the parent's id; leave out on the one root"),
  side: z.enum(["left", "right"]).optional().describe("tree only, binary trees and BSTs: which child this is, so a lone child sits to its side; give it on every child or on none"),
  x: z.number().min(0).max(1).optional().describe("graph only (required there): horizontal position in the drawing area, 0 = left, 1 = right"),
  y: z.number().min(0).max(1).optional().describe("graph only (required there): vertical position, 0 = top, 1 = bottom"),
});

const edgeSchema = z.object({
  from: nodeId,
  to: nodeId,
  weight: z.union([z.number().int().min(-999).max(9999), z.string().min(1).max(4)]).optional().describe("Optional weight shown on the edge, ≤ 4 characters"),
});

const markSchema = z.object({
  ids: z.array(nodeId).min(1).max(MAX).describe("Nodes it applies to. For 'path', in path order: the edges between consecutive nodes light up too"),
  as: z.enum(["path", "done", "clear"]).describe("path: highlight a route node by node (accent2); done: dim finished or ruled-out nodes; clear: reset these nodes to untouched"),
});

const stepSchema = z.object({
  word: z.string().optional().describe("Spoken word the step starts on (pop first, then visit, edges with their pushes, marks, note)"),
  pop: z.number().int().min(1).max(4).optional().describe("Pop this many chips from the strip (stack: from the top; queue: from the front); each flies back into its node"),
  visit: nodeId.optional().describe("The node being visited now: a ring draws, it fills in accent and stays visited after the next visit"),
  edges: z.array(z.tuple([nodeId, nodeId])).max(4).optional().describe("Edges explored in this step as [from, to]: each glows in accent with a pulse travelling from → to"),
  push: z.array(nodeId).max(4).optional().describe("Nodes pushed onto the strip (paired in order with `edges`); a chip flies from the node into the strip and the node turns 'discovered'"),
  marks: z.array(markSchema).max(2).optional().describe("Marks applied at the end of the step"),
  note: z.string().max(24).optional().describe("New text for the running result line, e.g. 'order: 8 3 10'; stays until a later note replaces it"),
});

const schema = z
  .object({
    title: z.string().max(36).optional().describe("One headline above the drawing, ≤ 6 words, e.g. 'Level order with a queue'"),
    titleWord: z.string().optional().describe("Spoken word the headline lands on"),
    kind: z.enum(["tree", "graph"]).describe("tree: nodes give `parent`, laid out in tidy levels; graph: nodes give x/y and the edges are listed"),
    directed: z.boolean().default(false).describe("graph only: draw arrowheads on edges (from → to)"),
    nodes: z.array(nodeSchema).min(2).max(MAX).describe(`Up to ${MAX} nodes. Trees: at most ${MAX_LEVELS} levels`),
    edges: z.array(edgeSchema).max(24).default([]).describe("graph only: the edges. Trees take their edges from `parent`"),
    strip: z.enum(["stack", "queue", "none"]).default("none").describe("The side strip that shows the traversal's data structure: stack (DFS), queue (BFS) or none"),
    stripLabel: z.string().max(14).optional().describe("Label over the strip; defaults to 'stack' or 'queue'"),
    steps: z.array(stepSchema).min(1).max(16).describe("The trace, in spoken order, computed by real code so it is exactly right. A step needs about 1 s, ~1.6 s with two pushes"),
  })
  .superRefine((p, ctx) => {
    const ids = new Set<string>();
    p.nodes.forEach((nd, i) => {
      if (ids.has(nd.id)) ctx.addIssue({ code: "custom", message: `Duplicate node id '${nd.id}'`, path: ["nodes", i, "id"] });
      ids.add(nd.id);
    });
    const has = (id: string, path: (string | number)[]) => {
      if (!ids.has(id)) ctx.addIssue({ code: "custom", message: `Unknown node '${id}'`, path });
      return ids.has(id);
    };
    const linked = new Set<string>();
    const key = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
    if (p.kind === "tree") {
      const roots = p.nodes.filter((nd) => nd.parent === undefined);
      if (roots.length !== 1) ctx.addIssue({ code: "custom", message: `A tree needs exactly one root (a node without parent); found ${roots.length}`, path: ["nodes"] });
      const byId = new Map(p.nodes.map((nd) => [nd.id, nd] as const));
      p.nodes.forEach((nd, i) => {
        if (nd.parent === undefined) return;
        if (!has(nd.parent, ["nodes", i, "parent"])) return;
        linked.add(key(nd.id, nd.parent));
        let d = 1;
        let cur = byId.get(nd.parent);
        while (cur?.parent !== undefined && d <= MAX) {
          cur = byId.get(cur.parent);
          d++;
        }
        if (d > MAX) ctx.addIssue({ code: "custom", message: `Node '${nd.id}' is in a parent cycle`, path: ["nodes", i, "parent"] });
        else if (d >= MAX_LEVELS) ctx.addIssue({ code: "custom", message: `Node '${nd.id}' is deeper than ${MAX_LEVELS} levels`, path: ["nodes", i, "parent"] });
      });
      const kids = new Map<string, typeof p.nodes>();
      for (const nd of p.nodes) if (nd.parent !== undefined) kids.set(nd.parent, [...(kids.get(nd.parent) ?? []), nd]);
      for (const [parent, ch] of kids) {
        const sided = ch.filter((c) => c.side).length;
        if (sided && sided !== ch.length) ctx.addIssue({ code: "custom", message: `Children of '${parent}' need a side on all or none`, path: ["nodes"] });
        if (ch.filter((c) => c.side === "left").length > 1 || ch.filter((c) => c.side === "right").length > 1) ctx.addIssue({ code: "custom", message: `'${parent}' has two children on one side`, path: ["nodes"] });
      }
    } else {
      p.nodes.forEach((nd, i) => {
        if (nd.x === undefined || nd.y === undefined) ctx.addIssue({ code: "custom", message: `Graph node '${nd.id}' needs x and y`, path: ["nodes", i] });
      });
      p.edges.forEach((e, i) => {
        if (has(e.from, ["edges", i, "from"]) && has(e.to, ["edges", i, "to"])) linked.add(key(e.from, e.to));
      });
    }
    if (p.strip === "none" && p.steps.some((s) => s.push?.length || s.pop)) ctx.addIssue({ code: "custom", message: "Steps push or pop but strip is 'none'", path: ["strip"] });
    let size = 0;
    p.steps.forEach((s, i) => {
      if (s.visit !== undefined) has(s.visit, ["steps", i, "visit"]);
      s.edges?.forEach(([a, b], k) => {
        if (has(a, ["steps", i, "edges", k, 0]) && has(b, ["steps", i, "edges", k, 1]) && !linked.has(key(a, b))) ctx.addIssue({ code: "custom", message: `No edge between '${a}' and '${b}'`, path: ["steps", i, "edges", k] });
      });
      s.push?.forEach((id, k) => has(id, ["steps", i, "push", k]));
      s.marks?.forEach((m, k) => m.ids.forEach((id, j) => has(id, ["steps", i, "marks", k, "ids", j])));
      size -= s.pop ?? 0;
      if (size < 0) ctx.addIssue({ code: "custom", message: "Pops more chips than the strip holds", path: ["steps", i, "pop"] });
      size = Math.max(0, size) + (s.push?.length ?? 0);
      if (size > CAP) ctx.addIssue({ code: "custom", message: `The strip holds at most ${CAP} chips`, path: ["steps", i, "push"] });
    });
  });

type Props = z.infer<typeof schema>;
type Change = { at: number; dur: number; to: number };
type Pt = { x: number; y: number };

const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${Math.round(clamp01(pct / 100) * 1000) / 10}%, ${base})`;
const bump = (x: number, len: number) => (x >= 0 && x <= len ? Math.sin((Math.PI * x) / len) : 0);
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Each change adds (to − previous) × its own progress, so a value stays continuous even when a new change starts before the last one has landed.
const track = (init: number, changes: Change[], prog: (at: number, dur: number) => number) => {
  let v = init;
  let prev = init;
  for (const c of changes) {
    v += (c.to - prev) * prog(c.at, c.dur);
    prev = c.to;
  }
  return v;
};

const FLY = 0.5;
const BACK = 0.5;
const STAG = 0.22;
const LABEL = 30;

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; cues: Cue[] }> = ({ props, style, W, H, duration, cues }) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const calm: Style = { ...style, motion: "calm" };
  const narrow = W < 1400;
  const { nodes, steps } = props;
  const isTree = props.kind === "tree";
  const n = nodes.length;
  const ix = new Map(nodes.map((nd, i) => [nd.id, i] as const));
  const idx = (id: string) => ix.get(id) ?? 0;
  const labels = nodes.map((nd) => String(nd.label ?? nd.id));

  const settle = (at: number, dur: number) =>
    style.motion === "calm"
      ? interpolate(frame, [at * fps, (at + dur) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.33, 0, 0.18, 1.08) })
      : enter(style, frame, fps, at, dur);
  const smooth = (at: number, dur: number) => enter(calm, frame, fps, at, dur);

  // Structure: tree edges come from `parent` (parent → child), graph edges are listed.
  const kids: number[][] = nodes.map(() => []);
  const depth = nodes.map(() => 0);
  const edges: { a: number; b: number; w?: string }[] = [];
  let root = 0;
  if (isTree) {
    nodes.forEach((nd, i) => {
      const p = nd.parent === undefined ? undefined : ix.get(nd.parent);
      if (p === undefined) root = i;
      else {
        kids[p]!.push(i);
        edges.push({ a: p, b: i });
      }
    });
    const rank = (i: number) => (nodes[i]!.side === "left" ? 0 : nodes[i]!.side === "right" ? 2 : 1);
    kids.forEach((k) => k.sort((a, b) => rank(a) - rank(b)));
    const seen = new Set<number>();
    const walk = (i: number, d: number) => {
      if (seen.has(i)) return;
      seen.add(i);
      depth[i] = d;
      kids[i]!.forEach((k) => walk(k, d + 1));
    };
    walk(root, 0);
  } else {
    for (const e of props.edges) {
      const a = ix.get(e.from);
      const b = ix.get(e.to);
      if (a !== undefined && b !== undefined) edges.push({ a, b, w: e.weight === undefined ? undefined : String(e.weight) });
    }
  }
  const edgeOf = (x: number, y: number) => edges.findIndex((e) => (e.a === x && e.b === y) || (e.a === y && e.b === x));

  // Tidy tree layout in leaf slots: every leaf takes one slot, a parent sits over its children, and a binary node's missing child keeps half a slot so a lone child leans to its side.
  const binary = isTree && nodes.some((nd) => nd.side);
  const sx = nodes.map(() => 0);
  const placed = new Set<number>();
  const place = (i: number, start: number): number => {
    if (placed.has(i)) return start;
    placed.add(i);
    const ch = kids[i]!;
    if (!ch.length) {
      sx[i] = start + 0.5;
      return start + 1;
    }
    let c = start;
    if (binary) {
      const ends: number[] = [];
      for (const s of ["left", "right"] as const) {
        const k = ch.find((x) => nodes[x]!.side === s);
        if (k !== undefined) {
          c = place(k, c);
          ends.push(sx[k]!);
        } else {
          ends.push(c + 0.25);
          c += 0.5;
        }
      }
      sx[i] = (ends[0]! + ends[1]!) / 2;
      return c;
    }
    for (const k of ch) c = place(k, c);
    sx[i] = (sx[ch[0]!]! + sx[ch[ch.length - 1]!]!) / 2;
    return c;
  };
  const S = isTree ? place(root, 0) : 1;
  const levels = isTree ? Math.max(...depth) + 1 : 1;

  // Build: nodes pop in level by level (graphs top to bottom), each edge draws once both ends are there.
  const order = nodes
    .map((_, i) => i)
    .sort((a, b) => (isTree ? depth[a]! - depth[b]! || sx[a]! - sx[b]! : (nodes[a]!.y ?? 0) - (nodes[b]!.y ?? 0) || (nodes[a]!.x ?? 0) - (nodes[b]!.x ?? 0)));
  const stagger = Math.min(0.08, 0.85 / n);
  const appear = nodes.map(() => 0);
  order.forEach((i, r) => (appear[i] = 0.15 + r * stagger));
  const buildEnd = 0.15 + (n - 1) * stagger + 0.5;
  const edgeAt = edges.map((e) => Math.max(appear[e.a]!, appear[e.b]!) + 0.12);

  // Inside one step, actions run in reading order: pop, visit, each edge with its push, marks, note.
  const staged = steps.map((s) => {
    const pops = s.pop ?? 0;
    const es = (s.edges ?? []).map(([x, y]) => ({ e: edgeOf(idx(x), idx(y)), from: idx(x), to: idx(y) })).filter((e) => e.e >= 0);
    const ps = (s.push ?? []).map(idx);
    const visit = s.visit === undefined ? undefined : idx(s.visit);
    const marks = s.marks ?? [];
    const visitOff = pops ? 0.38 : 0;
    const linkOff = visit !== undefined ? visitOff + 0.32 : visitOff;
    const edgeOffs = es.map((_, j) => linkOff + j * STAG);
    const pushOffs = ps.map((_, j) => linkOff + (es.length ? 0.22 : 0) + j * STAG);
    const markOff = Math.max(linkOff, ...edgeOffs.map((o) => o + 0.4), ...pushOffs.map((o) => o + 0.3));
    const markDur = marks.length ? Math.max(...marks.map((m) => 0.45 + m.ids.length * (m.as === "path" ? 0.12 : 0.05))) : 0;
    const noteOff = marks.length ? markOff + 0.15 : Math.max(0, markOff - 0.15);
    const dur = Math.max(
      0.35,
      pops ? (pops - 1) * 0.12 + BACK : 0,
      visit !== undefined ? visitOff + 0.5 : 0,
      ...edgeOffs.map((o) => o + 0.5),
      ...pushOffs.map((o) => o + FLY),
      marks.length ? markOff + markDur : 0,
      s.note ? noteOff + 0.4 : 0,
    );
    return { word: s.word, note: s.note, pops, es, ps, visit, marks, visitOff, edgeOffs, pushOffs, markOff, noteOff, dur, at: 0 };
  });

  // Step times: the spoken word (a few frames early), else spread evenly over the free time; kept in order and settled 0.6 s before the end.
  const startF = buildEnd + 0.3;
  const endF = Math.max(startF, duration - 0.6 - staged[staged.length - 1]!.dur);
  let prevAt = -Infinity;
  staged.forEach((s, i) => {
    const fb = staged.length === 1 ? startF : startF + (i * (endF - startF)) / (staged.length - 1);
    const at = cueAt(cues, s.word, fb + 0.1) - 0.1;
    s.at = Math.min(Math.max(at, buildEnd * 0.8, prevAt + 0.3), duration - 0.6 - s.dur);
    prevAt = s.at;
  });

  // Replay the trace into per-quantity change lists.
  const mk = () => nodes.map(() => [] as Change[]);
  const wDisc = mk();
  const wVis = mk();
  const wCur = mk();
  const wDone = mk();
  const wPath = mk();
  const st = { disc: nodes.map(() => 0), vis: nodes.map(() => 0), cur: nodes.map(() => 0), done: nodes.map(() => 0), path: nodes.map(() => 0) };
  const set = (list: Change[][], state: number[], i: number, to: number, at: number, dur: number) => {
    if (state[i] === to) return;
    list[i]!.push({ at, dur, to });
    state[i] = to;
  };
  const wTrav: Change[][] = edges.map(() => []);
  const trav = edges.map(() => 0);
  const visits: { i: number; at: number }[] = [];
  const pathMarks: { i: number; at: number }[] = [];
  const active: { e: number; from: number; to: number; a: number; b: number }[] = [];
  const pathE: { e: number; from: number; to: number; at: number; off: Change[] }[] = [];
  const items: { node: number; pushAt: number; popAt?: number; slot: number; shifts: Change[] }[] = [];
  const live: number[] = [];
  let maxSize = 0;
  // 1 while the strip holds nothing: a faint 'empty' sits in it.
  const emptyW: Change[] = [];
  // The last visit's ring leaves when its node joins a path, so the path colour reads alone.
  let ringOff = duration + 1;
  const notes: { at: number; text: string }[] = [];

  staged.forEach((s, k) => {
    const next = staged[k + 1]?.at ?? duration + 1;
    for (let j = 0; j < s.pops && live.length; j++) {
      const at = s.at + j * 0.12;
      const it = props.strip === "stack" ? live.pop()! : live.shift()!;
      items[it]!.popAt = at;
      if (!live.length) emptyW.push({ at: at + BACK * 0.7, dur: 0.35, to: 1 });
      if (props.strip === "queue") live.forEach((m, pos) => items[m]!.shifts.push({ at: at + 0.12, dur: 0.45, to: pos }));
    }
    if (s.visit !== undefined) {
      const at = s.at + s.visitOff;
      st.cur.forEach((c, i) => c && set(wCur, st.cur, i, 0, at, 0.3));
      set(wCur, st.cur, s.visit, 1, at, 0.35);
      set(wVis, st.vis, s.visit, 1, at, 0.35);
      visits.push({ i: s.visit, at });
    }
    s.es.forEach((e, j) => {
      const a = s.at + s.edgeOffs[j]!;
      active.push({ ...e, a, b: next });
      set(wTrav, trav, e.e, 1, a + 0.35, 0.4);
    });
    s.ps.forEach((i, j) => {
      const at = s.at + s.pushOffs[j]!;
      if (!live.length) emptyW.push({ at: at + 0.05, dur: 0.25, to: 0 });
      items.push({ node: i, pushAt: at, slot: live.length, shifts: [] });
      live.push(items.length - 1);
      maxSize = Math.max(maxSize, live.length);
      set(wDisc, st.disc, i, 1, at, 0.35);
    });
    const mAt = s.at + s.markOff;
    // A path is the conclusion: the current node steps down so the path colour reads alone.
    if (s.marks.some((m) => m.as === "path")) {
      st.cur.forEach((c, i) => c && set(wCur, st.cur, i, 0, mAt, 0.3));
      ringOff = Math.min(ringOff, mAt);
    }
    for (const m of s.marks) {
      const list = m.ids.map(idx);
      list.forEach((i, q) => {
        if (m.as === "path") {
          set(wPath, st.path, i, 1, mAt + q * 0.12, 0.4);
          pathMarks.push({ i, at: mAt + q * 0.12 });
          const nx = list[q + 1];
          const e = nx === undefined ? -1 : edgeOf(i, nx);
          if (e >= 0) pathE.push({ e, from: i, to: nx!, at: mAt + q * 0.12 + 0.06, off: [] });
        } else if (m.as === "done") set(wDone, st.done, i, 1, mAt + q * 0.05, 0.45);
        else {
          for (const [w, s2] of [[wDisc, st.disc], [wVis, st.vis], [wCur, st.cur], [wDone, st.done], [wPath, st.path]] as const) set(w, s2, i, 0, mAt, 0.4);
        }
      });
      if (m.as === "clear") for (const pe of pathE) if (list.includes(pe.from) || list.includes(pe.to)) pe.off.push({ at: mAt, dur: 0.35, to: 1 });
    }
    if (s.note) notes.push({ at: s.at + s.noteOff, text: s.note });
  });

  // Vertical bands: headline, the drawing, the strip and the result line (side by side on a wide canvas when both sit at the bottom).
  const side = Math.max(56, W * 0.05);
  const capSize = narrow ? 56 : 72;
  const capLines = props.title ? Math.ceil((props.title.length * capSize * 0.52) / (W - side * 2)) : 0;
  const capTop = H * 0.07;
  const top = props.title ? capTop + capLines * capSize * 1.1 + 44 : H * 0.07;
  const bottom = H * 0.945;
  const hasNotes = notes.length > 0;
  const NF = narrow ? 46 : 52;
  const noteH = NF * 1.2 + 32;
  const noteChars = Math.max(4, ...notes.map((x) => x.text.length));
  const stripMode: "none" | "column" | "row" = props.strip === "none" ? "none" : props.strip === "stack" && !narrow ? "column" : "row";
  const shareRow = stripMode === "row" && hasNotes && !narrow;
  const noteW = Math.min(shareRow ? W * 0.42 : W - side * 2, noteChars * NF * 0.6 + 88 + NF * 0.9);
  const cap = Math.max(4, maxSize);
  const SP = 14;
  const SG = 12;
  let C = narrow ? 84 : 100;
  let gy1 = bottom;
  let noteY = bottom - noteH;
  let stripTop = 0;
  if (stripMode === "row") {
    const avail = W - side * 2 - (shareRow ? noteW + 56 : 0);
    C = Math.max(56, Math.min(C, (avail - 2 * SP + SG) / cap - SG));
    const rowH = C + 2 * SP;
    stripTop = hasNotes && !shareRow ? noteY - 30 - rowH : bottom - rowH;
    if (shareRow) noteY = stripTop + (rowH - noteH) / 2;
    gy1 = stripTop - 14 - LABEL - 34;
  } else if (hasNotes) gy1 = noteY - 40;
  const colTop = top + LABEL + 14;
  if (stripMode === "column") C = Math.max(56, Math.min(C, (gy1 - colTop - 2 * SP + SG) / cap - SG));
  const colW = C + 2 * SP;
  const rowW = cap * (C + SG) - SG + 2 * SP;
  const colX0 = W - side - colW;
  // A row strip is centred under the drawing, together with the result line when they share the row.
  const rowX0 = shareRow ? (W - (rowW + 56 + noteW)) / 2 : (W - rowW) / 2;
  const gx0 = side;
  const gx1 = stripMode === "column" ? colX0 - 72 : W - side;
  const gw = gx1 - gx0;
  const gh = gy1 - top;

  // Node size and positions.
  let D: number;
  let pos: Pt[];
  if (isTree) {
    const pX = Math.min(gw / S, 300);
    D = Math.max(64, Math.min(124, pX * 0.74, gh / (levels * 1.35)));
    const pY = levels > 1 ? Math.min((gh - D) / (levels - 1), D * 2.3, 230) : 0;
    const ox = gx0 + (gw - S * pX) / 2;
    const oy = top + (gh - ((levels - 1) * pY + D)) / 2 + D / 2;
    pos = nodes.map((_, i) => ({ x: ox + sx[i]! * pX, y: oy + depth[i]! * pY }));
  } else {
    const at = (d: number) => nodes.map((nd) => ({ x: gx0 + d / 2 + (nd.x ?? 0.5) * (gw - d), y: top + d / 2 + (nd.y ?? 0.5) * (gh - d) }));
    const p0 = at(110);
    let md = Infinity;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) md = Math.min(md, Math.hypot(p0[a]!.x - p0[b]!.x, p0[a]!.y - p0[b]!.y));
    D = Math.max(64, Math.min(120, md * 0.55));
    pos = at(D + 24);
  }
  const R = D / 2;

  const slotPos = (s: number): Pt =>
    stripMode === "column" ? { x: colX0 + colW / 2, y: gy1 - SP - C / 2 - s * (C + SG) } : { x: rowX0 + SP + C / 2 + s * (C + SG), y: stripTop + SP + C / 2 };

  // Camera: born slightly in on the root, pulls back as the drawing builds, then leans a little toward each visited node.
  const centre = { x: (gx0 + gx1) / 2, y: (top + gy1) / 2 };
  const leanX: Change[] = [];
  const leanY: Change[] = [];
  const spotX: Change[] = [];
  const spotY: Change[] = [];
  for (const v of visits) {
    const p = pos[v.i]!;
    leanX.push({ at: v.at - 0.1, dur: 0.8, to: Math.max(-30, Math.min(30, (p.x - centre.x) * 0.04)) });
    leanY.push({ at: v.at - 0.1, dur: 0.8, to: Math.max(-22, Math.min(22, (p.y - centre.y) * 0.04)) });
    spotX.push({ at: v.at - 0.1, dur: 0.6, to: p.x });
    spotY.push({ at: v.at - 0.1, dur: 0.6, to: p.y });
  }
  const intro = Easing.out(Easing.cubic)(clamp01((t - 0.05) / Math.max(1, buildEnd)));
  const focus0 = isTree ? pos[root]! : centre;
  const s = (1.07 - 0.07 * intro) * (1 + 0.006 * Math.sin((2 * Math.PI * t) / 9));
  const cx = centre.x + (1 - intro) * (focus0.x - centre.x) * 0.5 + track(0, leanX, smooth) + (W / 2 - centre.x);
  const cy = centre.y + (1 - intro) * (focus0.y - centre.y) * 0.5 + track(0, leanY, smooth) + (H / 2 - centre.y);
  const ox = W / 2 - cx * s + 3 * Math.sin((2 * Math.PI * t) / 7.3);
  const oy = H / 2 - cy * s + 2 * Math.sin((2 * Math.PI * t) / 8.7 + 1);

  // Look.
  const boil = (k: number) => (hand ? (hash(k * 13 + Math.floor(t * 8)) - 0.5) * 6 : 0);
  const baseEdge = hand ? mix(style.ink, 70) : mix(style.ink, 24);
  const maxChars = Math.max(...labels.map((l) => l.length));
  const nodeFont = Math.max(26, Math.min(R * 0.86, (D * 0.8) / (maxChars * 0.62)));
  const chipFont = Math.max(26, Math.min(C * 0.42, (C * 0.82) / (maxChars * 0.62)));
  const seg = (a: number, b: number, k: number) => {
    const pa = pos[a]!;
    const pb = pos[b]!;
    const d = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
    const ux = (pb.x - pa.x) / d;
    const uy = (pb.y - pa.y) / d;
    const x1 = pa.x + ux * (R + 4);
    const y1 = pa.y + uy * (R + 4);
    const x2 = pb.x - ux * (R + (props.directed && !isTree ? 10 : 4));
    const y2 = pb.y - uy * (R + (props.directed && !isTree ? 10 : 4));
    const j = boil(k);
    return { x1, y1, x2, y2, ux, uy, d: `M${x1} ${y1} Q${(x1 + x2) / 2 - uy * j} ${(y1 + y2) / 2 + ux * j} ${x2} ${y2}` };
  };

  const spotOn = visits.length ? smooth(visits[0]!.at - 0.1, 0.6) : 0;
  const spot = { x: track(visits.length ? pos[visits[0]!.i]!.x : centre.x, spotX.slice(1), smooth), y: track(visits.length ? pos[visits[0]!.i]!.y : centre.y, spotY.slice(1), smooth) };

  const cap0 = enter(style, frame, fps, Math.max(0, cueAt(cues, props.titleWord, 0.2) - 0.1), 0.8);
  const curNote = [...notes].reverse().find((x) => x.at <= t);
  const prevNote = curNote ? notes[notes.indexOf(curNote) - 1] : undefined;
  const roll = curNote ? enter(style, frame, fps, curNote.at, 0.45) : 0;
  const noteBox = hasNotes ? enter(style, frame, fps, notes[0]!.at - 0.15, 0.5) : 0;
  const noteX = shareRow ? rowX0 + rowW + 56 : (W - noteW) / 2;

  const stripIn = smooth(0.35, 0.7);
  const sr = Math.min(style.radius, 24) + 4;
  let stripPath = "";
  if (stripMode === "column") {
    const L = colX0;
    const Rr = colX0 + colW;
    const T = colTop;
    const B = gy1;
    stripPath = `M${L} ${T} L${L} ${B - sr} Q${L} ${B} ${L + sr} ${B} L${Rr - sr} ${B} Q${Rr} ${B} ${Rr} ${B - sr} L${Rr} ${T}`;
  } else if (stripMode === "row") {
    const L = rowX0;
    const Rr = rowX0 + rowW;
    const T = stripTop;
    const B = stripTop + C + 2 * SP;
    stripPath =
      props.strip === "queue"
        ? `M${L - 24} ${T} L${Rr + 24} ${T} M${L - 24} ${B} L${Rr + 24} ${B}`
        : `M${Rr} ${T} L${L + sr} ${T} Q${L} ${T} ${L} ${T + sr} L${L} ${B - sr} Q${L} ${B} ${L + sr} ${B} L${Rr} ${B}`;
  }
  const stripName = props.stripLabel ?? props.strip;
  const quad = (a: Pt, b: Pt, p: number, lift: number): Pt => {
    const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift };
    const u = 1 - p;
    return { x: u * u * a.x + 2 * u * p * c.x + p * p * b.x, y: u * u * a.y + 2 * u * p * c.y + p * p * b.y };
  };

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 70% 10%, ${mix(style.surface, 70, style.bg)} 0%, ${style.bg} 72%)`, overflow: "hidden" }}>
      {/* Life layer: a slow accent2 glow and a dot grid at half parallax, so camera moves read as depth. */}
      <div
        style={{
          position: "absolute",
          width: W * 0.7,
          height: W * 0.7,
          left: -W * 0.2 + 60 * Math.sin((2 * Math.PI * t) / 15),
          top: H * 0.3 + 40 * Math.cos((2 * Math.PI * t) / 18),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${mix(style.accent2, 10)} 0%, transparent 65%)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox * 0.5}px, ${oy * 0.5}px) scale(${1 + (s - 1) * 0.5})`, transformOrigin: "0 0" }}>
        <svg width={W * 3} height={H * 3} style={{ position: "absolute", left: -W, top: -H }}>
          <defs>
            <pattern id="kit-tree-dots" width={48} height={48} patternUnits="userSpaceOnUse">
              <circle cx={24} cy={24} r={2.2} fill={style.muted} />
            </pattern>
          </defs>
          <rect width={W * 3} height={H * 3} fill="url(#kit-tree-dots)" opacity={0.2 + 0.05 * Math.sin((2 * Math.PI * t) / 7)} />
        </svg>
      </div>

      {/* The world, inside the camera rig. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `translate(${ox}px, ${oy}px) scale(${s})`, transformOrigin: "0 0" }}>
        {/* A soft accent light that follows the visit. */}
        {spotOn > 0.001 ? (
          <div
            style={{
              position: "absolute",
              left: spot.x - D * 2.4,
              top: spot.y - D * 2.4,
              width: D * 4.8,
              height: D * 4.8,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${mix(style.accent, 16)} 0%, transparent 62%)`,
              opacity: spotOn,
            }}
          />
        ) : null}

        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {stripMode !== "none" ? (
            <path
              d={stripPath}
              fill={props.strip === "queue" ? "none" : mix(style.surface, 60 * stripIn)}
              stroke={hand ? style.ink : mix(style.ink, 34)}
              strokeWidth={hand ? 4 : 3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - stripIn}
            />
          ) : null}

          {/* Edges: base line, then the traversed tint, the path in accent2 and the current edge's glow and pulse. */}
          {edges.map((e, k) => {
            const a = smooth(edgeAt[k]!, 0.4);
            if (a <= 0.001) return null;
            const g = seg(e.a, e.b, k);
            const tr = clamp01(track(0, wTrav[k]!, smooth));
            const colour = mix(style.accent, 60 * tr, baseEdge);
            const head = props.directed && !isTree;
            return (
              <g key={`e${k}`}>
                <path d={g.d} fill="none" stroke={colour} strokeWidth={hand ? 4 : 4 + 2 * tr} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - a} />
                {head ? (
                  <path
                    d={`M${g.x2 + g.ux * 8} ${g.y2 + g.uy * 8} L${g.x2 - g.ux * 14 - g.uy * 11} ${g.y2 - g.uy * 14 + g.ux * 11} L${g.x2 - g.ux * 14 + g.uy * 11} ${g.y2 - g.uy * 14 - g.ux * 11} Z`}
                    fill={colour}
                    opacity={clamp01(a * 3 - 2)}
                  />
                ) : null}
              </g>
            );
          })}
          {pathE.map((pe, k) => {
            const p = settle(pe.at, 0.3);
            const off = clamp01(track(0, pe.off, smooth));
            if (p <= 0.001 || off >= 0.999) return null;
            const forward = edges[pe.e]!.a === pe.from;
            const g = seg(edges[pe.e]!.a, edges[pe.e]!.b, pe.e);
            const d = forward ? g.d : `M${g.x2} ${g.y2} L${g.x1} ${g.y1}`;
            return <path key={`pe${k}`} d={d} fill="none" stroke={style.accent2} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp01(p)} opacity={1 - off} />;
          })}
          {active.map((ae, k) => {
            const on = smooth(ae.a, 0.25) * (1 - smooth(ae.b, 0.3));
            if (on <= 0.001) return null;
            const forward = edges[ae.e]!.a === ae.from;
            const g = seg(edges[ae.e]!.a, edges[ae.e]!.b, ae.e);
            const [x1, y1, x2, y2] = forward ? [g.x1, g.y1, g.x2, g.y2] : [g.x2, g.y2, g.x1, g.y1];
            const p = smooth(ae.a, 0.5);
            const pulse = bump(t - ae.a, 0.55);
            return (
              <g key={`a${k}`} opacity={on}>
                <path d={g.d} fill="none" stroke={mix(style.accent, 30)} strokeWidth={22} strokeLinecap="round" />
                <path d={`M${x1} ${y1} L${x2} ${y2}`} fill="none" stroke={style.accent} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
                {pulse > 0.01 ? <circle cx={x1 + (x2 - x1) * p} cy={y1 + (y2 - y1) * p} r={10} fill={style.accent} opacity={pulse} /> : null}
              </g>
            );
          })}
        </svg>

        {/* Edge weights. */}
        {edges.map((e, k) => {
          if (!e.w) return null;
          const a = smooth(edgeAt[k]! + 0.25, 0.35);
          const pa = pos[e.a]!;
          const pb = pos[e.b]!;
          const w = Math.max(48, e.w.length * 30 * 0.62 + 24);
          return (
            <div
              key={`w${k}`}
              style={{
                position: "absolute",
                left: (pa.x + pb.x) / 2 - w / 2,
                top: (pa.y + pb.y) / 2 - 22,
                width: w,
                height: 44,
                borderRadius: 22,
                background: mix(style.bg, 92, style.surface),
                color: style.muted,
                fontFamily: style.mono,
                fontWeight: 600,
                fontSize: 30,
                lineHeight: "44px",
                textAlign: "center",
                opacity: a,
              }}
            >
              {e.w}
            </div>
          );
        })}

        {/* Nodes. */}
        {nodes.map((_, i) => {
          const a = enter(style, frame, fps, appear[i]!, 0.5);
          const disc = clamp01(track(0, wDisc[i]!, smooth));
          const vis = clamp01(track(0, wVis[i]!, settle));
          const cur = clamp01(track(0, wCur[i]!, settle));
          const dn = clamp01(track(0, wDone[i]!, settle));
          const pa = clamp01(track(0, wPath[i]!, settle));
          const pop = Math.max(0, ...visits.filter((v) => v.i === i).map((v) => bump(t - v.at, 0.36)), ...pathMarks.filter((v) => v.i === i).map((v) => 0.7 * bump(t - v.at, 0.32)));
          const outline = mix(style.accent, 80 * disc, hand ? style.ink : mix(style.ink, 22));
          const f1 = mix(style.accent, 18 * disc, style.surface);
          const f2 = mix(style.ink, 100 * vis, f1);
          const f3 = mix(mix(style.muted, 22, style.surface), 100 * dn, f2);
          const f4 = mix(style.accent, 100 * cur, f3);
          const fill = mix(style.accent2, 100 * pa, f4);
          const solid = Math.max(vis, dn, cur, pa);
          const t1 = mix(style.bg, vis * 100, style.ink);
          const t2 = mix(mix(style.ink, 60, style.muted), dn * 100, t1);
          const ink = mix(style.bg, Math.max(cur, pa) * 100, t2);
          const sc = (0.6 + 0.4 * a) * (1 + 0.12 * pop);
          return (
            <div
              key={`n${i}`}
              style={{
                position: "absolute",
                left: pos[i]!.x - R,
                top: pos[i]!.y - R,
                width: D,
                height: D,
                borderRadius: "50%",
                background: fill,
                border: `${hand ? 3.5 : 3}px solid ${mix(fill, solid * 100, outline)}`,
                boxSizing: "border-box",
                opacity: a,
                transform: `scale(${sc})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 ${D * 0.07}px ${D * 0.2}px rgba(0,0,0,${0.12 + 0.08 * cur}), 0 0 ${44 * cur}px ${mix(style.accent, 40 * cur)}`,
              }}
            >
              <span style={{ fontFamily: hand ? style.display : style.mono, fontWeight: hand ? 700 : 600, fontSize: hand ? nodeFont * 1.2 : nodeFont, color: ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {labels[i]}
              </span>
            </div>
          );
        })}

        {/* Visit rings: one draws round the current node and stays while it is current; a ripple answers the visit. */}
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {visits.map((v, k) => {
            const next = visits[k + 1]?.at ?? ringOff;
            const draw = smooth(v.at, 0.45);
            const on = draw * (1 - smooth(next, 0.3));
            if (on <= 0.001) return null;
            const p = pos[v.i]!;
            const r = R + 11;
            const j = boil(k + 70) * 0.6;
            const q = clamp01((t - v.at) / 0.6);
            return (
              <g key={`r${k}`}>
                <ellipse
                  cx={p.x}
                  cy={p.y}
                  rx={r + j}
                  ry={r - j}
                  fill="none"
                  stroke={style.accent}
                  strokeWidth={5}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                  transform={`rotate(-90 ${p.x} ${p.y})`}
                  opacity={on}
                />
                {q > 0 && q < 1 ? <circle cx={p.x} cy={p.y} r={r + 46 * Easing.out(Easing.cubic)(q)} fill="none" stroke={style.accent} strokeWidth={4} opacity={(1 - q) * 0.8} /> : null}
              </g>
            );
          })}
        </svg>

        {/* Strip label and chips: each chip flies from its node into the strip, slides as the queue moves up, and flies back into its node when popped. */}
        {stripMode !== "none" ? (
          <div
            style={{
              position: "absolute",
              left: stripMode === "column" ? colX0 - 60 : rowX0,
              width: stripMode === "column" ? colW + 120 : 400,
              top: (stripMode === "column" ? colTop : stripTop) - 14 - LABEL,
              textAlign: stripMode === "column" ? "center" : "left",
              fontFamily: style.mono,
              fontWeight: 600,
              fontSize: LABEL,
              lineHeight: `${LABEL}px`,
              color: style.muted,
              opacity: stripIn,
            }}
          >
            {stripName}
          </div>
        ) : null}
        {stripMode !== "none"
          ? (() => {
              const e = clamp01(track(1, emptyW, smooth)) * stripIn;
              if (e <= 0.001) return null;
              const box = stripMode === "column" ? { left: colX0, top: colTop, width: colW, height: gy1 - colTop } : { left: rowX0, top: stripTop, width: rowW, height: C + 2 * SP };
              return (
                <div style={{ position: "absolute", ...box, display: "flex", alignItems: stripMode === "column" ? "flex-end" : "center", justifyContent: "center", paddingBottom: stripMode === "column" ? SP + C * 0.3 : 0, boxSizing: "border-box", fontFamily: style.mono, fontSize: 30, color: style.muted, opacity: 0.7 * e }}>
                  empty
                </div>
              );
            })()
          : null}
        {items.map((it, k) => {
          if (t < it.pushAt) return null;
          if (it.popAt !== undefined && t >= it.popAt + BACK) return null;
          const slot = slotPos(track(it.slot, it.shifts, settle));
          const node = pos[it.node]!;
          let p: Pt = slot;
          let sc = 1;
          let op = 1;
          if (t < it.pushAt + FLY) {
            const q = smooth(it.pushAt, FLY);
            p = quad(node, slot, q, 120);
            sc = 0.55 + 0.45 * q;
            op = clamp01(q * 4);
          } else if (it.popAt !== undefined && t >= it.popAt) {
            const q = smooth(it.popAt, BACK);
            p = quad(slot, node, q, 120);
            sc = 1 - 0.45 * q;
            op = 1 - q * q;
          }
          const land = bump(t - it.pushAt - FLY, 0.26);
          return (
            <div
              key={`c${k}`}
              style={{
                position: "absolute",
                left: p.x - C / 2,
                top: p.y - C / 2,
                width: C,
                height: C,
                borderRadius: Math.min(style.radius, C * 0.26),
                background: mix(style.accent, 16, style.surface),
                border: `${hand ? 3.5 : 2.5}px solid ${hand ? style.ink : mix(style.accent, 65)}`,
                boxSizing: "border-box",
                opacity: op,
                transform: `scale(${sc * (1 + 0.06 * land)}, ${sc * (1 - 0.08 * land)})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 8px 22px ${mix(style.ink, 14)}`,
                zIndex: 5,
              }}
            >
              <span style={{ fontFamily: hand ? style.display : style.mono, fontWeight: hand ? 700 : 600, fontSize: hand ? chipFont * 1.2 : chipFont, color: style.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{labels[it.node]}</span>
            </div>
          );
        })}
      </div>

      {/* Outside the rig: headline, running result line, vignette. */}
      {props.title ? (
        <div style={{ position: "absolute", left: side, top: capTop, width: W - side * 2, overflow: "hidden", paddingBottom: 8 }}>
          <div
            style={{
              fontFamily: style.display,
              fontWeight: hand ? 700 : 600,
              fontSize: hand ? capSize * 1.15 : capSize,
              lineHeight: 1.08,
              letterSpacing: hand ? 0 : "-0.015em",
              color: style.ink,
              transform: `translateY(${(1 - cap0) * 115}%)`,
            }}
          >
            {props.title}
          </div>
        </div>
      ) : null}
      {hasNotes && noteBox > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: noteX,
            top: noteY,
            width: noteW,
            height: noteH,
            borderRadius: Math.min(noteH / 2, style.radius + 6),
            background: mix(style.surface, 92, style.bg),
            border: hand ? `3px solid ${style.ink}` : `2px solid ${mix(style.ink, 12)}`,
            boxSizing: "border-box",
            boxShadow: `0 10px 30px ${mix(style.ink, 8)}`,
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            gap: NF * 0.35,
            opacity: noteBox,
            transform: `translateY(${(1 - noteBox) * 30}px)`,
          }}
        >
          <span style={{ fontFamily: style.mono, fontWeight: 600, fontSize: NF, color: style.accent, lineHeight: 1 }}>›</span>
          <div style={{ position: "relative", flex: 1, height: NF * 1.2, overflow: "hidden" }}>
            {prevNote && roll < 1 ? (
              <div style={{ position: "absolute", left: 0, top: 0, fontFamily: style.mono, fontWeight: 600, fontSize: NF, lineHeight: `${NF * 1.2}px`, color: style.ink, whiteSpace: "nowrap", transform: `translateY(${-roll * 110}%)`, opacity: 1 - roll }}>
                {prevNote.text}
              </div>
            ) : null}
            {curNote ? (
              <div style={{ position: "absolute", left: 0, top: 0, fontFamily: style.mono, fontWeight: 600, fontSize: NF, lineHeight: `${NF * 1.2}px`, color: style.ink, whiteSpace: "nowrap", transform: `translateY(${(1 - roll) * 110}%)` }}>
                {curNote.text}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.16) 100%)", pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "tree-graph",
  title: "Tree or graph traversal",
  mode: "graphic",
  layouts: ["full", "split"],
  useFor:
    "DSA beats on binary trees, BSTs, general trees and small graphs (up to 15 nodes, trees up to 5 levels). Trees lay themselves out from `parent` (and `side` for binary trees); graphs take x/y positions and an edge list, optionally weighted or directed. Each step of a trace computed by real code lands on a spoken word: chips pop off the stack or queue strip back into their node, the visited node gets a ring and fills in accent, explored edges glow with a pulse while their nodes are pushed as chips into the strip, a path lights up node by node in accent2, and finished nodes can be dimmed. A running result line updates ('order: 8 3 10'). The camera pulls back from the root as the drawing builds and leans toward each visit. No media.",
  avoid:
    "More than ~10 steps in under 12 s (a step needs ~1 s, ~1.6 s with two pushes), traces typed by hand instead of computed, more than 15 nodes or 5 levels (show a subtree), graphs whose edges cross a lot (place x/y to avoid it), arrays or linked lists (use array-trace), and system diagrams with boxes (use flow-diagram).",
  schema,
  example: {
    title: "Level order with a queue",
    titleWord: "level",
    kind: "tree",
    directed: false,
    nodes: [
      { id: "8" },
      { id: "3", parent: "8", side: "left" },
      { id: "10", parent: "8", side: "right" },
      { id: "1", parent: "3", side: "left" },
      { id: "6", parent: "3", side: "right" },
      { id: "14", parent: "10", side: "right" },
      { id: "13", parent: "14", side: "left" },
    ],
    edges: [],
    strip: "queue",
    steps: [
      { word: "start", push: ["8"], note: "queue = [8]" },
      { word: "eight", pop: 1, visit: "8", edges: [["8", "3"], ["8", "10"]], push: ["3", "10"], note: "order: 8" },
      { word: "three", pop: 1, visit: "3", edges: [["3", "1"], ["3", "6"]], push: ["1", "6"], note: "order: 8 3" },
      { word: "ten", pop: 1, visit: "10", edges: [["10", "14"]], push: ["14"], note: "order: 8 3 10" },
      { word: "one", pop: 1, visit: "1", note: "order: 8 3 10 1" },
      { word: "six", pop: 1, visit: "6", note: "order: 8 3 10 1 6" },
      { word: "fourteen", pop: 1, visit: "14", edges: [["14", "13"]], push: ["13"], note: "order: … 6 14" },
      { word: "thirteen", pop: 1, visit: "13", note: "order: … 14 13" },
      { word: "found", marks: [{ ids: ["8", "10", "14", "13"], as: "path" }], note: "13 is 3 levels down" },
    ],
  },
  exampleMedia: [],
  exampleCues: [
    { at: 0.3, end: 0.7, word: "Level" },
    { at: 1.4, end: 1.8, word: "start" },
    { at: 2.5, end: 2.9, word: "eight" },
    { at: 4.1, end: 4.5, word: "three" },
    { at: 5.7, end: 6.0, word: "ten" },
    { at: 7.2, end: 7.5, word: "one" },
    { at: 8.2, end: 8.5, word: "six" },
    { at: 9.2, end: 9.7, word: "fourteen" },
    { at: 10.8, end: 11.3, word: "thirteen" },
    { at: 11.9, end: 12.3, word: "found" },
  ],
  seconds: { min: 4, max: 16, demo: 13.5 },
  mediaSlots: 0,
  credit: { name: "'Derivative concept explainer' by @LinearUncle (prompt-motion.com), for the step-by-step teaching rhythm", url: "https://prompt-motion.com/linearuncle-5d2bae" },
  status: "draft",
  Component: ({ props, style, width, height, duration, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} cues={cues} />,
});
