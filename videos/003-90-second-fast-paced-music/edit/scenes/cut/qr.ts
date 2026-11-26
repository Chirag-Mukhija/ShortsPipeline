// The film's one real QR code (version 3, level H, alphanumeric), its codeword map, the hole torn in it, and schematic codes for the growth scene.

export const TEXT = "PARTLY MISSING. IT STILL READS.";
export const SIZE = 29;

const ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const DATA_PER_BLOCK = 13;
const EC_PER_BLOCK = 22;
const BLOCKS = 2;
const TOTAL = (DATA_PER_BLOCK + EC_PER_BLOCK) * BLOCKS;

// GF(256), polynomial 0x11d.
const EXP: number[] = [];
const LOG: number[] = new Array<number>(256).fill(0);
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[(LOG[a]! + LOG[b]!) % 255]!);

const GENERATOR = (() => {
  let g = [1];
  for (let i = 0; i < EC_PER_BLOCK; i++) {
    const next = new Array<number>(g.length + 1).fill(0);
    g.forEach((c, j) => {
      next[j] = next[j]! ^ c;
      next[j + 1] = next[j + 1]! ^ mul(c, EXP[i]!);
    });
    g = next;
  }
  return g;
})();

const ecOf = (data: number[]) => {
  const rem = [...data, ...new Array<number>(EC_PER_BLOCK).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const lead = rem[i]!;
    if (lead) GENERATOR.forEach((c, j) => (rem[i + j] = rem[i + j]! ^ mul(c, lead)));
  }
  return rem.slice(data.length);
};

const codewords = (() => {
  const bits: number[] = [];
  const push = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1);
  };
  push(0b0010, 4);
  push(TEXT.length, 9);
  const v = [...TEXT].map((c) => ALNUM.indexOf(c));
  for (let i = 0; i < v.length; i += 2) {
    if (i + 1 < v.length) push(v[i]! * 45 + v[i + 1]!, 11);
    else push(v[i]!, 6);
  }
  const cap = DATA_PER_BLOCK * BLOCKS * 8;
  push(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < DATA_PER_BLOCK * BLOCKS; pad ^= 0xec ^ 0x11) data.push(pad);
  const blocks = Array.from({ length: BLOCKS }, (_, b) => data.slice(b * DATA_PER_BLOCK, (b + 1) * DATA_PER_BLOCK));
  const ec = blocks.map(ecOf);
  const out: number[] = [];
  for (let i = 0; i < DATA_PER_BLOCK; i++) for (let b = 0; b < BLOCKS; b++) out.push(blocks[b]![i]!);
  for (let i = 0; i < EC_PER_BLOCK; i++) for (let b = 0; b < BLOCKS; b++) out.push(ec[b]![i]!);
  return out;
})();

type Grid = boolean[][];
const grid = (n: number): Grid => Array.from({ length: n }, () => new Array<boolean>(n).fill(false));

const dark = grid(SIZE);
const fn = grid(SIZE);
const setFn = (r: number, c: number, v: boolean) => {
  if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return;
  dark[r]![c] = v;
  fn[r]![c] = true;
};

const drawFormat = (mask: number) => {
  const data = (0b10 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) setFn(i, 8, bit(i));
  setFn(7, 8, bit(6));
  setFn(8, 8, bit(7));
  setFn(8, 7, bit(8));
  for (let i = 9; i < 15; i++) setFn(8, 14 - i, bit(i));
  for (let i = 0; i < 8; i++) setFn(8, SIZE - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) setFn(SIZE - 15 + i, 8, bit(i));
  setFn(SIZE - 8, 8, true);
};

// Function patterns: timing, three finders with separators, one alignment pattern at (22, 22).
for (let i = 0; i < SIZE; i++) {
  setFn(6, i, i % 2 === 0);
  setFn(i, 6, i % 2 === 0);
}
for (const [cr, cc] of [[3, 3], [3, SIZE - 4], [SIZE - 4, 3]] as const) {
  for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
    const d = Math.max(Math.abs(dr), Math.abs(dc));
    setFn(cr + dr, cc + dc, d !== 2 && d !== 4);
  }
}
for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) setFn(22 + dr, 22 + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
drawFormat(0);

// Where each codeword's 8 bits sit, in reading order.
const cells: [number, number][][] = Array.from({ length: TOTAL }, () => []);
const owner: (number | null)[][] = Array.from({ length: SIZE }, () => new Array<number | null>(SIZE).fill(null));
{
  let i = 0;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < SIZE; vert++) for (let j = 0; j < 2; j++) {
      const c = right - j;
      const r = ((right + 1) & 2) === 0 ? SIZE - 1 - vert : vert;
      if (fn[r]![c] || i >= TOTAL * 8) continue;
      const k = i >>> 3;
      dark[r]![c] = ((codewords[k]! >>> (7 - (i & 7))) & 1) === 1;
      cells[k]!.push([r, c]);
      owner[r]![c] = k;
      i++;
    }
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];
const masked = (m: number): Grid => dark.map((row, r) => row.map((v, c) => (fn[r]![c] ? v : v !== MASKS[m]!(r, c))));

const penalty = (g: Grid) => {
  let score = 0;
  let darkCount = 0;
  const lines = [...g, ...g.map((_, i) => g.map((row) => row[i]!))];
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    const s = line.map((v) => (v ? "1" : "0")).join("");
    for (let i = 0; i + 11 <= s.length; i++) {
      const w = s.slice(i, i + 11);
      if (w === "10111010000" || w === "00001011101") score += 40;
    }
  }
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (g[r]![c]) darkCount++;
    if (r + 1 < SIZE && c + 1 < SIZE && g[r]![c] === g[r]![c + 1] && g[r]![c] === g[r + 1]![c] && g[r]![c] === g[r + 1]![c + 1]) score += 3;
  }
  return score + Math.floor(Math.abs((darkCount / (SIZE * SIZE)) * 100 - 50) / 5) * 10;
};

export const MASK = (() => {
  let best = 0;
  let low = Infinity;
  for (let m = 0; m < 8; m++) {
    drawFormat(m);
    const p = penalty(masked(m));
    if (p < low) [best, low] = [m, p];
  }
  return best;
})();
drawFormat(MASK);

// true = dark module. Row first, then column.
export const MATRIX: Grid = masked(MASK);
export const isFunction = (r: number, c: number) => fn[r]![c]!;
// The codeword a module belongs to (0–69), or null for function and remainder modules.
export const codewordAt = (r: number, c: number) => owner[r]![c]!;
export const codewordCells = (k: number): readonly [number, number][] => cells[k]!;
export const blockOf = (k: number) => k % BLOCKS;

// Decision: the hole loses whole codewords, at most 6 of each block's 35. Level H repairs 11 per block, so the drawn damage stays inside what the maths can restore.
const HOLE_CENTRE = [15.5, 18] as const;
const HOLE_PER_BLOCK = 6;
export const HOLE_CODEWORDS: readonly number[] = (() => {
  const near = cells
    .map((list, k) => ({ k, d: Math.max(...list.map(([r, c]) => Math.hypot(r - HOLE_CENTRE[0], c - HOLE_CENTRE[1]))) }))
    .sort((a, b) => a.d - b.d || a.k - b.k);
  const used = new Array<number>(BLOCKS).fill(0);
  const out: number[] = [];
  for (const { k } of near) {
    if (used[k % BLOCKS]! >= HOLE_PER_BLOCK) continue;
    used[k % BLOCKS]!++;
    out.push(k);
    if (out.length === HOLE_PER_BLOCK * BLOCKS) break;
  }
  return out;
})();
export const HOLE: readonly [number, number][] = HOLE_CODEWORDS.flatMap((k) => cells[k]!);
const holeKeys = new Set(HOLE.map(([r, c]) => r * SIZE + c));
export const inHole = (r: number, c: number) => holeKeys.has(r * SIZE + c);

// Reads the finished matrix back and checks it, so a broken code fails the render instead of shipping.
export const selfCheck = () => {
  const read = cells.map((list) => list.reduce((v, [r, c]) => (v << 1) | (MATRIX[r]![c]! !== MASKS[MASK]!(r, c) ? 1 : 0), 0));
  const problems: string[] = [];
  if (cells.some((list) => list.length !== 8)) problems.push("a codeword does not have 8 cells");
  for (let b = 0; b < BLOCKS; b++) {
    const block = read.filter((_, k) => k % BLOCKS === b);
    for (let s = 0; s < EC_PER_BLOCK; s++) {
      if (block.reduce((acc, cw) => mul(acc, EXP[s]!) ^ cw, 0) !== 0) problems.push(`block ${b}, syndrome ${s} is not zero`);
    }
    const lost = HOLE_CODEWORDS.filter((k) => k % BLOCKS === b).length;
    if (lost * 2 > EC_PER_BLOCK) problems.push(`block ${b} loses ${lost} codewords, more than level H repairs`);
  }
  if (HOLE.some(([r, c]) => fn[r]![c])) problems.push("the hole touches a function module");
  const free = fn.flat().filter((v) => !v).length;
  if (free !== 567) problems.push(`${free} data modules, expected 567`);
  return problems;
};
const problems = selfCheck();
if (problems.length) throw new Error(`qr.ts: ${problems.join("; ")}`);

// Schematic codes for the size comparison: right size and finder layout, seeded filler where the data would be. Not real codes.
const noise = (seed: number, r: number, c: number) => {
  let h = Math.imul(seed ^ (r * 374761393), 668265263) ^ Math.imul(c + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 < 0.5;
};
const finderAt = (r: number, c: number) => {
  const d = Math.max(Math.abs(r - 3), Math.abs(c - 3));
  return d > 4 ? null : d !== 2 && d !== 4;
};
export const plausibleMatrix = (size: number, seed: number): Grid =>
  Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => finderAt(r, c) ?? finderAt(r, size - 1 - c) ?? finderAt(size - 1 - r, c) ?? (r === 6 ? c % 2 === 0 : c === 6 ? r % 2 === 0 : noise(seed, r, c))),
  );
// Micro QR: one finder, timing along the top and left edges.
export const microMatrix = (size: number, seed: number): Grid =>
  Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => finderAt(r, c) ?? (r === 0 ? c % 2 === 0 : c === 0 ? r % 2 === 0 : noise(seed, r, c))));
// rMQR: one finder at the left, a small 5 x 5 sub-finder at the bottom right, timing along the edges.
export const rmqrMatrix = (rows: number, cols: number, seed: number): Grid =>
  Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const sub = Math.max(Math.abs(r - (rows - 3)), Math.abs(c - (cols - 3)));
      if (c <= 7) return c === 7 ? false : finderAt(r, c) ?? noise(seed, r, c);
      if (sub <= 2) return sub !== 1;
      return r === 0 || r === rows - 1 ? c % 2 === 0 : noise(seed, r, c);
    }),
  );
