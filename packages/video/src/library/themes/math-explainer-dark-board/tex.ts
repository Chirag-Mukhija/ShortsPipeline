// A small TeX-like typesetter (no KaTeX): parses a maths string and lays it out as positioned glyphs and drawn strokes, in em units.
import { advance, type FontKind } from "./metrics";
import { NAMED } from "./theme";

export type Cls = "ord" | "bin" | "rel" | "open" | "close" | "punct" | "op" | "space";
export type Cmd = ["M" | "L", number, number] | ["Q", number, number, number, number] | ["C", number, number, number, number, number, number];
type Ctx = { term?: string; color?: string; key?: string; font?: FontKind };

type Node =
  | { k: "glyph"; text: string; font: FontKind; cls: Cls; c: Ctx }
  | { k: "sym"; name: string; cls: Cls; c: Ctx }
  | { k: "row"; items: Node[] }
  | { k: "scr"; base: Node; sup?: Node; sub?: Node }
  | { k: "frac"; num: Node; den: Node; c: Ctx }
  | { k: "sqrt"; body: Node; c: Ctx }
  | { k: "mat"; rows: Node[][]; c: Ctx }
  | { k: "space"; em: number };

type Common = { x: number; y: number; s: number; w: number; asc: number; desc: number; term?: string; color?: string; key: string; ck?: string };
export type Item = (Common & { kind: "glyph"; text: string; font: FontKind }) | (Common & { kind: "path"; name: string; cmds: Cmd[]; sw: number });
export type Layout = { w: number; asc: number; desc: number; items: Item[] };
type Box = Layout & { cls: Cls; italic: boolean };

// The maths axis (height of the minus sign) that fractions and matrices centre on.
const AXIS = 0.26;
const RULE = 0.05;

// ---------- drawn symbols (the font's Latin subset has no arrows, relations or big operators) ----------
type Sym = { w: number; asc: number; desc: number; sw: number; cmds: Cmd[] };
const SYMS: Record<string, Sym> = {
  to: { w: 1.0, asc: 0.5, desc: 0, sw: 0.05, cmds: [["M", 0.08, -AXIS], ["L", 0.9, -AXIS], ["M", 0.7, -AXIS - 0.17], ["L", 0.92, -AXIS], ["L", 0.7, -AXIS + 0.17]] },
  gets: { w: 1.0, asc: 0.5, desc: 0, sw: 0.05, cmds: [["M", 0.92, -AXIS], ["L", 0.1, -AXIS], ["M", 0.3, -AXIS - 0.17], ["L", 0.08, -AXIS], ["L", 0.3, -AXIS + 0.17]] },
  le: { w: 0.8, asc: 0.64, desc: 0.02, sw: 0.05, cmds: [["M", 0.68, -0.6], ["L", 0.12, -0.39], ["L", 0.68, -0.18], ["M", 0.12, -0.04], ["L", 0.68, -0.04]] },
  ge: { w: 0.8, asc: 0.64, desc: 0.02, sw: 0.05, cmds: [["M", 0.12, -0.6], ["L", 0.68, -0.39], ["L", 0.12, -0.18], ["M", 0.12, -0.04], ["L", 0.68, -0.04]] },
  approx: { w: 0.8, asc: 0.5, desc: 0, sw: 0.05, cmds: [["M", 0.1, -0.33], ["C", 0.28, -0.48, 0.48, -0.18, 0.7, -0.36], ["M", 0.1, -0.15], ["C", 0.28, -0.3, 0.48, 0, 0.7, -0.18]] },
  neq: { w: 0.8, asc: 0.6, desc: 0.04, sw: 0.05, cmds: [["M", 0.1, -0.36], ["L", 0.7, -0.36], ["M", 0.1, -0.17], ["L", 0.7, -0.17], ["M", 0.56, -0.58], ["L", 0.24, 0.04]] },
  in: { w: 0.75, asc: 0.6, desc: 0, sw: 0.05, cmds: [["M", 0.66, -0.54], ["L", 0.42, -0.54], ["C", 0.22, -0.54, 0.1, -0.43, 0.1, -0.27], ["C", 0.1, -0.11, 0.22, 0, 0.42, 0], ["L", 0.66, 0], ["M", 0.1, -0.27], ["L", 0.62, -0.27]] },
  infty: { w: 1.0, asc: 0.5, desc: 0, sw: 0.05, cmds: [["M", 0.5, -0.27], ["C", 0.4, -0.43, 0.12, -0.45, 0.12, -0.27], ["C", 0.12, -0.09, 0.4, -0.11, 0.5, -0.27], ["C", 0.6, -0.43, 0.88, -0.45, 0.88, -0.27], ["C", 0.88, -0.09, 0.6, -0.11, 0.5, -0.27]] },
  sum: { w: 1.0, asc: 1.0, desc: 0.42, sw: 0.06, cmds: [["M", 0.88, -0.78], ["L", 0.86, -0.92], ["L", 0.12, -0.92], ["L", 0.54, -0.27], ["L", 0.12, 0.38], ["L", 0.88, 0.38], ["L", 0.9, 0.24]] },
  lfloor: { w: 0.42, asc: 0.8, desc: 0.22, sw: 0.05, cmds: [["M", 0.14, -0.8], ["L", 0.14, 0.2], ["L", 0.36, 0.2]] },
  rfloor: { w: 0.42, asc: 0.8, desc: 0.22, sw: 0.05, cmds: [["M", 0.28, -0.8], ["L", 0.28, 0.2], ["L", 0.06, 0.2]] },
  lceil: { w: 0.42, asc: 0.8, desc: 0.22, sw: 0.05, cmds: [["M", 0.36, -0.8], ["L", 0.14, -0.8], ["L", 0.14, 0.2]] },
  rceil: { w: 0.42, asc: 0.8, desc: 0.22, sw: 0.05, cmds: [["M", 0.06, -0.8], ["L", 0.28, -0.8], ["L", 0.28, 0.2]] },
  cdots: { w: 1.0, asc: 0.3, desc: 0, sw: 0.09, cmds: [["M", 0.2, -AXIS], ["L", 0.201, -AXIS], ["M", 0.5, -AXIS], ["L", 0.501, -AXIS], ["M", 0.8, -AXIS], ["L", 0.801, -AXIS]] },
};
const SYM_CLS: Record<string, Cls> = { to: "rel", gets: "rel", le: "rel", ge: "rel", approx: "rel", neq: "rel", in: "rel", infty: "ord", sum: "op", lfloor: "open", lceil: "open", rfloor: "close", rceil: "close", cdots: "ord" };
const SYM_ALIAS: Record<string, string> = { rightarrow: "to", leftarrow: "gets", leq: "le", geq: "ge", ne: "neq", sim: "approx" };

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", eta: "η", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
};
const FUNCS = new Set(["log", "ln", "sin", "cos", "tan", "max", "min", "exp", "lim", "det", "mod"]);
const FONT_SYMS: Record<string, [string, Cls]> = { cdot: ["·", "bin"], times: ["×", "bin"], pm: ["±", "bin"], ldots: ["…", "ord"], prime: ["′", "ord"], mid: ["|", "rel"], lbrace: ["{", "open"], rbrace: ["}", "close"], deg: ["°", "ord"] };
const SPACES: Record<string, number> = { quad: 1, qquad: 2 };

// ---------- parser ----------
class Parser {
  i = 0;
  constructor(private s: string) {}
  private ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i++;
  }
  private atRowEnd(inMat: boolean) {
    const ch = this.s[this.i];
    return ch === undefined || ch === "}" || (inMat && (ch === "&" || this.s.startsWith("\\\\", this.i)));
  }
  row(c: Ctx, inMat = false): Node[] {
    const items: Node[] = [];
    for (;;) {
      this.ws();
      if (this.atRowEnd(inMat)) return items;
      let node = this.atom(c);
      for (;;) {
        this.ws();
        const ch = this.s[this.i];
        if (ch !== "^" && ch !== "_") break;
        this.i++;
        const arg = this.arg(c);
        const scr: Extract<Node, { k: "scr" }> = node.k === "scr" ? node : { k: "scr", base: node };
        if (ch === "^") scr.sup = arg;
        else scr.sub = arg;
        node = scr;
      }
      items.push(node);
    }
  }
  private arg(c: Ctx): Node {
    this.ws();
    if (this.s[this.i] === "{") {
      this.i++;
      const items = this.row(c);
      this.i++;
      return { k: "row", items };
    }
    return this.atom(c);
  }
  private raw(): string {
    this.ws();
    if (this.s[this.i] !== "{") return "";
    let depth = 0;
    const start = ++this.i;
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === "{") depth++;
      if (ch === "}") {
        if (depth === 0) break;
        depth--;
      }
      this.i++;
    }
    return this.s.slice(start, this.i++);
  }
  private atom(c: Ctx): Node {
    const ch = this.s[this.i]!;
    if (ch === "{") return this.arg(c);
    if (ch === "\\") {
      const m = /^[a-zA-Z]+/.exec(this.s.slice(this.i + 1));
      if (m) {
        this.i += 1 + m[0].length;
        return this.command(m[0], c);
      }
      const next = this.s[this.i + 1] ?? "";
      this.i += 2;
      const sp: Record<string, number> = { ",": 0.17, ":": 0.22, ";": 0.28, "!": -0.17, " ": 0.25 };
      if (next in sp) return { k: "space", em: sp[next]! };
      return { k: "glyph", text: next, font: "rm", cls: next === "{" ? "open" : next === "}" ? "close" : "ord", c };
    }
    this.i++;
    return charNode(ch, c);
  }
  private command(name: string, c: Ctx): Node {
    if (name in GREEK) return { k: "glyph", text: GREEK[name]!, font: name[0] === name[0]!.toUpperCase() ? "rm" : (c.font ?? "it"), cls: "ord", c };
    if (FUNCS.has(name)) return { k: "glyph", text: name, font: "rm", cls: "op", c };
    if (name in FONT_SYMS) return { k: "glyph", text: FONT_SYMS[name]![0], font: "rm", cls: FONT_SYMS[name]![1], c };
    const sym = SYM_ALIAS[name] ?? name;
    if (sym in SYMS) return { k: "sym", name: sym, cls: SYM_CLS[sym]!, c };
    if (name in SPACES) return { k: "space", em: SPACES[name]! };
    // Delimiters keep their natural size; \left and \right are accepted and ignored.
    if (name === "left" || name === "right") {
      this.ws();
      return this.atom(c);
    }
    switch (name) {
      case "frac": {
        const num = this.arg(c);
        return { k: "frac", num, den: this.arg(c), c };
      }
      case "sqrt":
        return { k: "sqrt", body: this.arg(c), c };
      case "mat":
        return this.matrix(c);
      case "text":
      case "sf":
      case "sfm":
      case "textbf":
        return words(this.raw(), name === "text" ? "rm" : name === "textbf" ? "bf" : name === "sf" ? "sf" : "sfm", c);
      case "mathrm":
        return this.arg({ ...c, font: "rm" });
      case "mathbf":
        return this.arg({ ...c, font: "bf" });
      case "term":
        return this.arg({ ...c, term: this.raw() });
      case "k":
        return this.arg({ ...c, key: this.raw() });
      case "c": {
        const col = this.raw();
        return this.arg({ ...c, color: NAMED[col] ?? col });
      }
      default:
        return { k: "glyph", text: name, font: "rm", cls: "ord", c };
    }
  }
  private matrix(c: Ctx): Node {
    this.ws();
    this.i++;
    const rows: Node[][] = [];
    let cur: Node[] = [];
    for (;;) {
      cur.push({ k: "row", items: this.row(c, true) });
      if (this.s[this.i] === "&") {
        this.i++;
        continue;
      }
      if (this.s.startsWith("\\\\", this.i)) {
        this.i += 2;
        rows.push(cur);
        cur = [];
        continue;
      }
      this.i++;
      rows.push(cur);
      return { k: "mat", rows, c };
    }
  }
}

const charNode = (ch: string, c: Ctx): Node => {
  if (/[a-zA-Z]/.test(ch)) return { k: "glyph", text: ch, font: c.font ?? "it", cls: "ord", c };
  if (/[0-9.]/.test(ch)) return { k: "glyph", text: ch, font: c.font === "bf" ? "bf" : "rm", cls: "ord", c };
  const map: Record<string, [string, Cls]> = {
    "+": ["+", "bin"], "-": ["−", "bin"], "*": ["×", "bin"], "=": ["=", "rel"], "<": ["<", "rel"], ">": [">", "rel"], ":": [":", "rel"],
    ",": [",", "punct"], ";": [";", "punct"], "(": ["(", "open"], "[": ["[", "open"], ")": [")", "close"], "]": ["]", "close"], "!": ["!", "close"], "'": ["′", "ord"],
  };
  const [text, cls] = map[ch] ?? [ch, "ord" as Cls];
  return { k: "glyph", text, font: "rm", cls, c };
};

// Prose inside maths: one glyph per word (keeps the font's kerning), real spaces between.
const words = (raw: string, font: FontKind, c: Ctx): Node => {
  const items: Node[] = [];
  raw.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) items.push({ k: "space", em: advance(font, " ") });
    else items.push({ k: "glyph", text: part, font, cls: "ord", c });
  });
  return { k: "row", items };
};

// ---------- layout ----------
const shift = (b: Layout, dx: number, dy: number, s = 1): Item[] =>
  b.items.map((it) => (it.kind === "path" ? { ...it, x: dx + it.x * s, y: dy + it.y * s, s: it.s * s } : { ...it, x: dx + it.x * s, y: dy + it.y * s, s: it.s * s }));

const pathItem = (name: string, cmds: Cmd[], sw: number, w: number, asc: number, desc: number, c: Ctx): Item => ({ kind: "path", name, cmds, sw, x: 0, y: 0, s: 1, w, asc, desc, term: c.term, color: c.color, key: "", ck: c.key });

const glyphMetrics = (text: string, cls: Cls) => {
  if (cls === "bin" || cls === "rel") return { asc: 0.56, desc: 0 };
  if (/^[()[\]{}|]$/.test(text)) return { asc: 0.76, desc: 0.24 };
  if (/[gjpqyβγζημξρφχψ]/.test(text)) return { asc: 0.68, desc: 0.22 };
  return { asc: 0.68, desc: 0.06 };
};

const space = (prev: Cls | null, cur: Cls) => {
  if (prev === null) return 0;
  if (cur === "bin" || prev === "bin") return 0.22;
  if (cur === "rel" || prev === "rel") return cur === prev ? 0 : 0.28;
  if (prev === "punct") return 0.17;
  if (prev === "op" && cur === "ord") return 0.17;
  if (cur === "op" && (prev === "ord" || prev === "close")) return 0.17;
  return 0;
};

const lay = (n: Node, tight = false): Box => {
  switch (n.k) {
    case "glyph": {
      const w = advance(n.font, n.text);
      const m = glyphMetrics(n.text, n.cls);
      return { w, ...m, cls: n.cls, italic: n.font === "it", items: [{ kind: "glyph", text: n.text, font: n.font, x: 0, y: 0, s: 1, w, ...m, term: n.c.term, color: n.c.color, key: "", ck: n.c.key }] };
    }
    case "sym": {
      const s = SYMS[n.name]!;
      return { w: s.w, asc: s.asc, desc: s.desc, cls: n.cls, italic: false, items: [pathItem(n.name, s.cmds, s.sw, s.w, s.asc, s.desc, n.c)] };
    }
    case "space":
      return { w: n.em, asc: 0, desc: 0, cls: "space", italic: false, items: [] };
    case "row": {
      const items: Item[] = [];
      let x = 0, asc = 0, desc = 0;
      let prev: Cls | null = null;
      let prevItalic = false;
      const boxes = n.items.map((b) => lay(b, tight));
      boxes.forEach((b) => {
        if (b.cls === "space") {
          x += b.w;
          return;
        }
        let cls = b.cls;
        if (cls === "bin" && (prev === null || prev === "bin" || prev === "rel" || prev === "open" || prev === "punct" || prev === "op")) cls = "ord";
        x += space(prev, cls) * (tight ? 0.45 : 1);
        if (prevItalic && !b.italic) x += 0.04;
        items.push(...shift(b, x, 0));
        x += b.w;
        asc = Math.max(asc, b.asc);
        desc = Math.max(desc, b.desc);
        prev = cls;
        prevItalic = b.italic;
      });
      const only = boxes.filter((b) => b.cls !== "space");
      return { w: x, asc, desc, cls: only.length === 1 ? only[0]!.cls : "ord", italic: prevItalic, items };
    }
    case "scr": {
      const base = lay(n.base, tight);
      const k = 0.68;
      const x0 = base.w + (base.italic ? 0.05 : 0.02);
      const items = [...base.items];
      let w = base.w, asc = base.asc, desc = base.desc;
      if (n.sup) {
        const sup = lay(n.sup, true);
        const up = Math.max(0.4, base.asc - 0.26);
        items.push(...shift(sup, x0, -up, k));
        w = Math.max(w, x0 + sup.w * k);
        asc = Math.max(asc, up + sup.asc * k);
      }
      if (n.sub) {
        const sub = lay(n.sub, true);
        const down = Math.max(0.2, base.desc + 0.06);
        items.push(...shift(sub, base.w + 0.02, down, k));
        w = Math.max(w, base.w + 0.02 + sub.w * k);
        desc = Math.max(desc, down + sub.desc * k);
      }
      return { w: w + 0.03, asc, desc, cls: base.cls, italic: false, items };
    }
    case "frac": {
      const k = 0.86;
      const num = lay(n.num, tight), den = lay(n.den, tight);
      const gap = 0.16;
      const w = Math.max(num.w, den.w) * k + 0.24;
      const ny = -AXIS - gap - num.desc * k;
      const dy = -AXIS + gap + den.asc * k;
      return {
        w, asc: -ny + num.asc * k, desc: dy + den.desc * k, cls: "ord", italic: false,
        items: [...shift(num, (w - num.w * k) / 2, ny, k), pathItem("frac", [["M", 0.06, -AXIS], ["L", w - 0.06, -AXIS]], RULE, w, AXIS, 0, n.c), ...shift(den, (w - den.w * k) / 2, dy, k)],
      };
    }
    case "sqrt": {
      const body = lay(n.body, tight);
      const top = body.asc + 0.14;
      const bot = Math.max(body.desc, 0.04);
      const bx = 0.62;
      const cmds: Cmd[] = [["M", 0.02, -0.3], ["L", 0.14, -0.38], ["L", 0.3, bot], ["L", 0.56, -top], ["L", bx + body.w + 0.06, -top]];
      return { w: bx + body.w + 0.12, asc: top + 0.04, desc: bot, cls: "ord", italic: false, items: [pathItem("sqrt", cmds, RULE, bx + body.w, top, bot, n.c), ...shift(body, bx, 0)] };
    }
    case "mat": {
      const cells = n.rows.map((r) => r.map((b) => lay(b, tight)));
      const cols = Math.max(...cells.map((r) => r.length));
      const colW = Array.from({ length: cols }, (_, j) => Math.max(...cells.map((r) => r[j]?.w ?? 0)));
      const rowA = cells.map((r) => Math.max(0.6, ...r.map((b) => b.asc)));
      const rowD = cells.map((r) => Math.max(0.12, ...r.map((b) => b.desc)));
      const rowGap = 0.32, colGap = 0.9, br = 0.3, pad = 0.26;
      const H = rowA.reduce((a, v, i) => a + v + rowD[i]!, 0) + rowGap * (cells.length - 1);
      const top = -AXIS - H / 2;
      const inner = colW.reduce((a, v) => a + v, 0) + colGap * (cols - 1);
      const w = br + pad * 2 + inner + br;
      const items: Item[] = [];
      let y = top;
      cells.forEach((r, i) => {
        y += rowA[i]!;
        let x = br + pad;
        r.forEach((b, j) => {
          items.push(...shift(b, x + (colW[j]! - b.w) / 2, y));
          x += colW[j]! + colGap;
        });
        y += rowD[i]! + rowGap;
      });
      const t = top - 0.08, b = top + H + 0.08;
      items.unshift(pathItem("lbrack", [["M", br, t], ["L", 0.06, t], ["L", 0.06, b], ["L", br, b]], RULE, br, -t, b, n.c));
      items.push(pathItem("rbrack", [["M", w - br, t], ["L", w - 0.06, t], ["L", w - 0.06, b], ["L", w - br, b]], RULE, br, -t, b, n.c));
      return { w, asc: -t + 0.04, desc: b + 0.04, cls: "ord", italic: false, items };
    }
  }
};

const cache = new Map<string, Layout>();

// Typeset once per string (call only after useFontsReady()). Keys match glyphs across equations: same character, same occurrence.
export const typeset = (tex: string): Layout => {
  const hit = cache.get(tex);
  if (hit) return hit;
  const box = lay({ k: "row", items: new Parser(tex).row({}) });
  const seen = new Map<string, number>();
  const items = box.items.map((it) => {
    const base = it.ck ?? (it.kind === "glyph" ? it.text : it.name);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...it, key: `${base}#${n}` };
  });
  const out = { w: box.w, asc: box.asc, desc: box.desc, items };
  cache.set(tex, out);
  return out;
};

// Bounding box (em) of the items carrying a term id, or of the whole layout.
export const termBox = (L: Layout, term?: string) => {
  const its = term ? L.items.filter((i) => i.term === term) : L.items;
  if (!its.length) return null;
  return {
    x0: Math.min(...its.map((i) => i.x)),
    x1: Math.max(...its.map((i) => i.x + i.w * i.s)),
    y0: Math.min(...its.map((i) => i.y - i.asc * i.s)),
    y1: Math.max(...its.map((i) => i.y + i.desc * i.s)),
  };
};

export const cmdsToD = (cmds: Cmd[], ox: number, oy: number, k: number) =>
  cmds
    .map((c) => {
      const p = c.slice(1) as number[];
      const xy = p.map((v, i) => (i % 2 === 0 ? ox + v * k : oy + v * k).toFixed(2));
      return `${c[0]}${xy.join(" ")}`;
    })
    .join(" ");
