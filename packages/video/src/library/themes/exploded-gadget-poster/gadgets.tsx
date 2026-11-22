// Drawn generic gadgets in 2.5D SVG (phone, laptop, earbuds, keyboard, chip, camera, battery, screw): extruded glossy plastic, each centred on (0, 0).
import { useId, type FC, type ReactNode } from "react";
import { FINISH, GREY, INK, MONO, VIOLET, WHITE, YELLOW, type Finish, type FinishName } from "./theme";
import { svgId } from "./motion";

const fin = (f: FinishName | Finish): Finish => (typeof f === "string" ? FINISH[f] : f);

// Extrusion: the same outline stacked from back to front in the side colour, then the face on top; dx/dy is the full depth offset.
export const Extrude: FC<{ shape: (fill: string, stroke?: string) => ReactNode; side: string; face: string; dx?: number; dy?: number; edge?: string }> = ({ shape, side, face, dx = 10, dy = 14, edge }) => {
  const n = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 1.6));
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const k = 1 - i / n;
        return <g key={i} transform={`translate(${dx * k} ${dy * k})`}>{shape(side, i === 0 ? edge : undefined)}</g>;
      })}
      {shape(face)}
    </>
  );
};

// The board's soft floor shadow: a blurred ink ellipse at 18 %.
export const FloorShadow: FC<{ x?: number; y?: number; rx: number; ry?: number; o?: number }> = ({ x = 0, y = 0, rx, ry = rx * 0.16, o = 0.18 }) => {
  const id = svgId(useId(), "sh");
  return (
    <>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={INK} stopOpacity={o} />
          <stop offset="0.55" stopColor={INK} stopOpacity={o * 0.55} />
          <stop offset="1" stopColor={INK} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id})`} />
    </>
  );
};

// Glossy plastic face: a lighter top-left falling to the base colour, so flat shapes read as moulded.
const Gloss: FC<{ id: string; f: Finish }> = ({ id, f }) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor={f.hi} />
    <stop offset="0.45" stopColor={f.face} />
    <stop offset="1" stopColor={f.face} />
  </linearGradient>
);

// A bright streak along the top-left edge of a rounded body: the "glossy plastic highlight" of the board.
const Streak: FC<{ x: number; y: number; w: number; h: number; r: number; o?: number }> = ({ x, y, w, h, r, o = 0.55 }) => (
  <path d={`M ${x + 6} ${y + h * 0.42} L ${x + 6} ${y + r} Q ${x + 6} ${y + 6} ${x + r} ${y + 6} L ${x + w * 0.55} ${y + 6}`} fill="none" stroke={WHITE} strokeWidth={5} strokeLinecap="round" opacity={o} />
);

const rr = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={stroke ? 2 : 0} />
);

// ---------- screws ----------
export const Screw: FC<{ r?: number; rot?: number; shaft?: number }> = ({ r = 14, rot = 0, shaft = 0 }) => {
  const id = svgId(useId(), "sc");
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#F2F3F5" />
          <stop offset="1" stopColor="#868A90" />
        </radialGradient>
      </defs>
      {shaft > 0 && (
        <g>
          <rect x={-r * 0.38} y={0} width={r * 0.76} height={shaft} fill="#9A9EA4" />
          {Array.from({ length: Math.floor(shaft / 6) }, (_, i) => (
            <line key={i} x1={-r * 0.38} x2={r * 0.38} y1={4 + i * 6} y2={7 + i * 6} stroke="#5E6268" strokeWidth={1.6} />
          ))}
        </g>
      )}
      <ellipse cx={0} cy={2} rx={r} ry={r * 0.55} fill="#5E6268" />
      <ellipse cx={0} cy={0} rx={r} ry={r * 0.55} fill={`url(#${id})`} />
      <g transform={`scale(1 0.55) rotate(${rot})`}>
        <line x1={-r * 0.6} x2={r * 0.6} y1={0} y2={0} stroke="#3B3E43" strokeWidth={r * 0.2} strokeLinecap="round" />
        <line y1={-r * 0.6} y2={r * 0.6} x1={0} x2={0} stroke="#3B3E43" strokeWidth={r * 0.2} strokeLinecap="round" />
      </g>
    </g>
  );
};

// ---------- phone ----------
// `screen` draws into the display area with (0, 0) at its top-left; it is clipped to the glass.
export const Phone: FC<{ w?: number; h?: number; finish?: FinishName; depth?: number; screen?: (w: number, h: number) => ReactNode }> = ({ w = 300, h = 610, finish = "white", depth = 16, screen }) => {
  const f = fin(finish);
  const uid = useId();
  const g = svgId(uid, "g");
  const clip = svgId(uid, "c");
  const r = w * 0.15;
  const x = -w / 2;
  const y = -h / 2;
  const b = w * 0.055;
  const sw = w - b * 2;
  const sh = h - b * 2;
  return (
    <g>
      <defs>
        <Gloss id={g} f={f} />
        <clipPath id={clip}>
          <rect x={x + b} y={y + b} width={sw} height={sh} rx={r - b} />
        </clipPath>
      </defs>
      <rect x={x + w - 4 + depth * 0.6} y={y + h * 0.2} width={8} height={h * 0.12} rx={4} fill={f.side} />
      <rect x={x + w - 4 + depth * 0.6} y={y + h * 0.36} width={8} height={h * 0.07} rx={4} fill={f.side} />
      <Extrude dx={depth * 0.6} dy={depth * 0.8} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => rr(x, y, w, h, r, fill, st)} />
      <rect x={x + b} y={y + b} width={sw} height={sh} rx={r - b} fill={INK} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(${x + b} ${y + b})`}>{screen?.(sw, sh)}</g>
      </g>
      <circle cx={0} cy={y + b + 22} r={8} fill="#000" stroke="#2A2A2A" strokeWidth={3} />
      <path d={`M ${x + b + sw * 0.62} ${y + b} L ${x + b + sw} ${y + b} L ${x + b + sw} ${y + b + sh * 0.36} Z`} fill={WHITE} opacity={0.07} clipPath={`url(#${clip})`} />
      <Streak x={x} y={y} w={w} h={h} r={r} />
    </g>
  );
};

// ---------- laptop ----------
// Lid face-on, deck seen from above as a trapezoid; keys follow the deck's perspective.
export const Laptop: FC<{ w?: number; finish?: FinishName; screen?: (w: number, h: number) => ReactNode }> = ({ w = 760, finish = "silver", screen }) => {
  const f = fin(finish);
  const uid = useId();
  const g = svgId(uid, "g");
  const clip = svgId(uid, "c");
  const lh = w * 0.6;
  const x = -w / 2;
  const y = -lh / 2 - w * 0.07;
  const b = w * 0.04;
  const sw = w - b * 2;
  const sh = lh - b * 2.4;
  const deckY = y + lh;
  const flare = w * 0.1;
  const deckH = w * 0.2;
  // Bilinear point on the deck quad: u across, v from hinge (0) to front edge (1).
  const dp = (u: number, v: number) => {
    const xl = x - flare * v;
    const xr = x + w + flare * v;
    return [xl + (xr - xl) * u, deckY + deckH * v] as const;
  };
  const quad = (u0: number, v0: number, u1: number, v1: number) => {
    const p = [dp(u0, v0), dp(u1, v0), dp(u1, v1), dp(u0, v1)];
    return `M ${p.map((q) => q.join(" ")).join(" L ")} Z`;
  };
  const keys: ReactNode[] = [];
  const rows = 5;
  for (let rI = 0; rI < rows; rI++) {
    const cols = rI === rows - 1 ? 1 : 12;
    for (let c = 0; c < cols; c++) {
      const v0 = 0.1 + rI * 0.105;
      const u0 = rI === rows - 1 ? 0.3 : 0.08 + c * 0.0705;
      const u1 = rI === rows - 1 ? 0.7 : u0 + 0.06;
      keys.push(<path key={`${rI}-${c}`} d={quad(u0, v0, u1, v0 + 0.085)} fill={INK} opacity={0.82} />);
    }
  }
  return (
    <g>
      <defs>
        <Gloss id={g} f={f} />
        <clipPath id={clip}>
          <rect x={x + b} y={y + b} width={sw} height={sh} rx={6} />
        </clipPath>
      </defs>
      <path d={`${quad(0, 0, 1, 1)}`} fill={f.face} />
      <path d={`M ${dp(0, 1).join(" ")} L ${dp(1, 1).join(" ")} L ${dp(1, 1)[0] - 6} ${dp(1, 1)[1] + 16} L ${dp(0, 1)[0] + 6} ${dp(0, 1)[1] + 16} Z`} fill={f.side} />
      {keys}
      <path d={quad(0.36, 0.66, 0.64, 0.95)} fill={f.side} opacity={0.6} />
      <rect x={x} y={y} width={w} height={lh} rx={22} fill={`url(#${g})`} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={lh - 6} rx={20} fill={INK} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(${x + b} ${y + b})`}>{screen?.(sw, sh)}</g>
      </g>
      <rect x={x} y={deckY - 8} width={w} height={10} rx={4} fill={f.side} />
      <Streak x={x} y={y} w={w} h={lh} r={22} o={0.3} />
    </g>
  );
};

// ---------- earbuds ----------
export const EarbudCase: FC<{ w?: number; finish?: FinishName; led?: number; open?: number }> = ({ w = 300, finish = "white", led = 1, open = 0 }) => {
  const f = fin(finish);
  const g = svgId(useId(), "g");
  const h = w * 0.72;
  const x = -w / 2;
  const y = -h / 2;
  const seam = y + h * 0.34;
  return (
    <g>
      <defs>
        <Gloss id={g} f={f} />
      </defs>
      <Extrude dx={10} dy={16} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => rr(x, y + h * 0.3, w, h * 0.7, w * 0.22, fill, st)} />
      {/* opening: the lid lifts and tips back on its rear hinge, foreshortening as it goes */}
      <g transform={`translate(0 ${-open * 70}) rotate(${-open * 6} ${x + w} ${seam}) translate(0 ${seam}) scale(1 ${1 - open * 0.3}) translate(0 ${-seam})`}>
        <Extrude dx={10} dy={16} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => rr(x, y, w, h * 0.42, w * 0.2, fill, st)} />
        <Streak x={x} y={y} w={w} h={h * 0.4} r={w * 0.2} />
      </g>
      <line x1={x + 8} x2={x + w - 8} y1={seam + h * 0.05} y2={seam + h * 0.05} stroke={f.side} strokeWidth={4} opacity={1 - open} />
      <circle cx={0} cy={y + h * 0.66} r={9} fill={VIOLET} opacity={0.35 + 0.65 * led} />
      <circle cx={0} cy={y + h * 0.66} r={18} fill={VIOLET} opacity={0.18 * led} />
    </g>
  );
};

// A stemless round bud: shell, speaker mesh and a soft-tip nozzle.
export const Earbud: FC<{ r?: number; finish?: FinishName; flip?: boolean }> = ({ r = 70, finish = "white", flip = false }) => {
  const f = fin(finish);
  const g = svgId(useId(), "g");
  return (
    <g transform={flip ? "scale(-1 1)" : undefined}>
      <defs>
        <Gloss id={g} f={f} />
      </defs>
      <ellipse cx={r * 0.78} cy={r * 0.35} rx={r * 0.36} ry={r * 0.3} fill={GREY} />
      <ellipse cx={r * 0.84} cy={r * 0.38} rx={r * 0.2} ry={r * 0.17} fill="#5E6164" />
      <Extrude dx={6} dy={10} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => <circle r={r} fill={fill} stroke={st} strokeWidth={st ? 2 : 0} />} />
      <circle r={r * 0.52} fill={f.side} opacity={0.55} />
      {Array.from({ length: 19 }, (_, i) => {
        const a = i * 2.39996;
        const d = Math.sqrt(i / 19) * r * 0.42;
        return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d} r={r * 0.04} fill={INK} opacity={0.55} />;
      })}
      <path d={`M ${-r * 0.72} ${-r * 0.25} A ${r * 0.78} ${r * 0.78} 0 0 1 ${-r * 0.1} ${-r * 0.76}`} stroke={WHITE} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.7} />
    </g>
  );
};

// ---------- keyboard ----------
type Key = { x: number; y: number; w: number; h?: number; accent?: boolean };
const rowKeys = (y: number, x0: number, widths: number[], accentIndex = -1): Key[] => {
  let x = x0;
  return widths.map((w, i) => {
    const k = { x, y, w, accent: i === accentIndex };
    x += w;
    return k;
  });
};
const ones = (n: number) => Array.from({ length: n }, () => 1);
// The standard 61-key ANSI 60 % block, rows at y0..y0+4.
const sixty = (y0: number): Key[] => [
  ...rowKeys(y0, 0, [...ones(13), 2]),
  ...rowKeys(y0 + 1, 0, [1.5, ...ones(12), 1.5]),
  ...rowKeys(y0 + 2, 0, [1.75, ...ones(11), 2.25], 12),
  ...rowKeys(y0 + 3, 0, [2.25, ...ones(10), 2.75]),
  ...rowKeys(y0 + 4, 0, [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25]),
];
// The full 104-key ANSI board: function row, 60 % block, navigation cluster and numpad.
const fullSize = (): Key[] => [
  { x: 0, y: 0, w: 1 },
  ...[2, 3, 4, 5, 6.5, 7.5, 8.5, 9.5, 11, 12, 13, 14].map((x) => ({ x, y: 0, w: 1 })),
  ...[15.5, 16.5, 17.5].flatMap((x) => [{ x, y: 0, w: 1 }, { x, y: 1.5, w: 1 }, { x, y: 2.5, w: 1 }]),
  { x: 16.5, y: 4.5, w: 1 },
  ...[15.5, 16.5, 17.5].map((x) => ({ x, y: 5.5, w: 1 })),
  ...sixty(1.5),
  ...[19, 20, 21, 22].map((x) => ({ x, y: 1.5, w: 1 })),
  ...[19, 20, 21].flatMap((x) => [2.5, 3.5, 4.5].map((y) => ({ x, y, w: 1 }))),
  { x: 22, y: 2.5, w: 1, h: 2 },
  { x: 22, y: 4.5, w: 1, h: 2, accent: true },
  { x: 19, y: 5.5, w: 2 },
  { x: 21, y: 5.5, w: 1 },
];
export const KEY_COUNT = { full: fullSize().length, compact: sixty(0).length };

// Keys pop up in a sweep: `p` 0..1 raises them left to right.
export const Keyboard: FC<{ u?: number; compact?: boolean; finish?: FinishName; keyFinish?: FinishName; p?: number }> = ({ u = 34, compact = false, finish = "graphite", keyFinish = "white", p = 1 }) => {
  const f = fin(finish);
  const kf = fin(keyFinish);
  const keys = compact ? sixty(0) : fullSize();
  const cols = compact ? 15 : 23;
  const rows = compact ? 5 : 6.5;
  const pad = u * 0.45;
  const w = cols * u + pad * 2;
  const h = rows * u + pad * 2;
  const x0 = -w / 2;
  const y0 = -h / 2;
  return (
    <g>
      <Extrude dx={0} dy={u * 0.7} side={f.side} face={f.face} edge={f.edge} shape={(fill, st) => rr(x0, y0, w, h, u * 0.4, fill, st)} />
      <Streak x={x0} y={y0} w={w} h={h} r={u * 0.4} o={0.25} />
      {keys.map((k, i) => {
        const kx = x0 + pad + k.x * u + 2;
        const ky = y0 + pad + k.y * u + 2;
        const kw = k.w * u - 4;
        const kh = (k.h ?? 1) * u - 4;
        const lift = Math.min(1, Math.max(0, p * 1.6 - (k.x / cols) * 0.6));
        const kk = k.accent ? fin("violet") : kf;
        return (
          <g key={i} opacity={lift > 0 ? 1 : 0} transform={`translate(0 ${(1 - lift) * -14})`}>
            <rect x={kx} y={ky + 2} width={kw} height={kh} rx={u * 0.16} fill={kk.side} />
            <rect x={kx + 1.5} y={ky - 2} width={kw - 3} height={kh - 4} rx={u * 0.14} fill={kk.face} />
          </g>
        );
      })}
    </g>
  );
};

// ---------- chip ----------
// Seen from above at the theme's 3/4 angle; pins on all four sides, a polished die and a generic part code.
export const Chip: FC<{ s?: number; finish?: FinishName; label?: string; glow?: number }> = ({ s = 220, finish = "graphite", label = "C-01", glow = 0 }) => {
  const f = fin(finish);
  const g = svgId(useId(), "g");
  const half = s / 2;
  const pins = 9;
  const pitch = s / (pins + 1);
  return (
    <g transform="scale(1 0.58) rotate(-40)">
      <defs>
        <Gloss id={g} f={f} />
      </defs>
      {[0, 90, 180, 270].map((rot) => (
        <g key={rot} transform={`rotate(${rot})`}>
          {Array.from({ length: pins }, (_, i) => (
            <rect key={i} x={-half + pitch * (i + 1) - 5} y={-half - 26} width={10} height={30} rx={2} fill="#C9CCD0" stroke="#7D8187" strokeWidth={1.5} />
          ))}
        </g>
      ))}
      <rect x={-half} y={-half} width={s} height={s} rx={14} fill={f.side} transform="translate(10 10)" />
      <rect x={-half} y={-half} width={s} height={s} rx={14} fill={`url(#${g})`} />
      <rect x={-s * 0.3} y={-s * 0.3} width={s * 0.6} height={s * 0.6} rx={8} fill={f.hi} opacity={0.35 + 0.4 * glow} />
      {glow > 0 && <rect x={-s * 0.3} y={-s * 0.3} width={s * 0.6} height={s * 0.6} rx={8} fill={VIOLET} opacity={0.5 * glow} />}
      <circle cx={-half + 22} cy={-half + 22} r={7} fill={f.edge} />
      <text x={0} y={s * 0.08} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={s * 0.16} fill={WHITE} opacity={0.85}>
        {label}
      </text>
    </g>
  );
};

// ---------- camera ----------
// A generic mirrorless body: grip, top plate, a mode dial whose knurls turn with `dial` (degrees), and a glass lens.
// `trail` draws a violet arc of that many degrees behind the dial's pointer, the board's trailing arc for a spinning part.
export const Camera: FC<{ w?: number; finish?: FinishName; dial?: number; shutter?: number; trail?: number }> = ({ w = 560, finish = "graphite", dial = 0, shutter = 0, trail = 0 }) => {
  const f = fin(finish);
  const top = fin("silver");
  const uid = useId();
  const g = svgId(uid, "g");
  const lens = svgId(uid, "l");
  const h = w * 0.58;
  const x = -w / 2;
  const y = -h / 2;
  const lr = h * 0.36;
  const lx = -w * 0.04;
  const ly = h * 0.08;
  const dx = x + w * 0.2;
  const dy = y - 26;
  const dr = w * 0.085;
  return (
    <g>
      <defs>
        <Gloss id={g} f={f} />
        <radialGradient id={lens} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4A3C8C" />
          <stop offset="0.45" stopColor="#15132A" />
          <stop offset="1" stopColor="#050508" />
        </radialGradient>
      </defs>
      {/* mode dial: knurls are spaced around the rim and only the front half is drawn */}
      <rect x={dx - dr} y={dy} width={dr * 2} height={30} fill={top.side} />
      {Array.from({ length: 24 }, (_, i) => {
        const a = ((i * 15 + dial) * Math.PI) / 180;
        if (Math.sin(a) < 0) return null;
        const kx = dx + Math.cos(a) * dr;
        return <line key={i} x1={kx} x2={kx} y1={dy + 4} y2={dy + 28} stroke={top.edge} strokeWidth={3 * Math.sin(a) + 0.5} />;
      })}
      <ellipse cx={dx} cy={dy} rx={dr} ry={dr * 0.32} fill={top.hi} />
      {trail > 0 && (
        <polyline
          points={Array.from({ length: 13 }, (_, i) => {
            const a = ((dial - trail * (1 - i / 12)) * Math.PI) / 180;
            return `${dx + Math.cos(a) * dr * 0.8},${dy + Math.sin(a) * dr * 0.26}`;
          }).join(" ")}
          fill="none" stroke={VIOLET} strokeWidth={6} strokeLinecap="round" opacity={0.85}
        />
      )}
      <line x1={dx} y1={dy} x2={dx + Math.cos((dial * Math.PI) / 180) * dr * 0.8} y2={dy + Math.sin((dial * Math.PI) / 180) * dr * 0.26} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <rect x={x + w * 0.72} y={y - 16 + shutter * 8} width={w * 0.1} height={22} rx={10} fill={VIOLET} />
      <path d={`M ${-w * 0.14} ${y + 4} L ${-w * 0.09} ${y - 46} L ${w * 0.09} ${y - 46} L ${w * 0.14} ${y + 4} Z`} fill={f.face} />
      <Extrude dx={12} dy={16} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => rr(x, y, w, h, 30, fill, st)} />
      <rect x={x} y={y} width={w} height={h * 0.2} rx={20} fill={top.face} />
      <rect x={x} y={y + h * 0.14} width={w} height={h * 0.06} fill={top.side} opacity={0.5} />
      <rect x={x + w * 0.76} y={y + h * 0.2} width={w * 0.24} height={h * 0.8} rx={28} fill={f.hi} opacity={0.35} />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={x + w * 0.8} x2={x + w * 0.96} y1={y + h * 0.36 + i * 18} y2={y + h * 0.36 + i * 18} stroke={f.side} strokeWidth={4} strokeLinecap="round" />
      ))}
      <circle cx={lx + 10} cy={ly + 12} r={lr * 1.12} fill={top.side} />
      <circle cx={lx} cy={ly} r={lr * 1.12} fill={top.face} />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return <line key={i} x1={lx + Math.cos(a) * lr * 1.0} y1={ly + Math.sin(a) * lr * 1.0} x2={lx + Math.cos(a) * lr * 1.1} y2={ly + Math.sin(a) * lr * 1.1} stroke={top.edge} strokeWidth={3} />;
      })}
      <circle cx={lx} cy={ly} r={lr * 0.94} fill="#1C1D20" />
      <circle cx={lx} cy={ly} r={lr * 0.72} fill={`url(#${lens})`} />
      <circle cx={lx} cy={ly} r={lr * 0.42} fill="none" stroke="#2E2A55" strokeWidth={6} />
      <path d={`M ${lx - lr * 0.5} ${ly - lr * 0.2} A ${lr * 0.55} ${lr * 0.55} 0 0 1 ${lx - lr * 0.1} ${ly - lr * 0.55}`} stroke={WHITE} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.75} />
      <circle cx={lx + lr * 0.3} cy={ly + lr * 0.32} r={lr * 0.07} fill={WHITE} opacity={0.5} />
      <Streak x={x} y={y} w={w} h={h} r={30} o={0.35} />
    </g>
  );
};

// ---------- battery ----------
// A pouch cell with a charge window that fills to `level` (0..1).
export const Battery: FC<{ w?: number; h?: number; level?: number; finish?: FinishName }> = ({ w = 260, h = 420, level = 1, finish = "white" }) => {
  const f = fin(finish);
  const g = svgId(useId(), "g");
  const x = -w / 2;
  const y = -h / 2;
  const pad = 26;
  const ih = h - pad * 2 - 40;
  return (
    <g>
      <defs>
        <Gloss id={g} f={f} />
      </defs>
      <rect x={-w * 0.14} y={y - 22} width={w * 0.28} height={30} rx={8} fill={GREY} />
      <Extrude dx={12} dy={16} side={f.side} face={`url(#${g})`} edge={f.edge} shape={(fill, st) => rr(x, y, w, h, 34, fill, st)} />
      <rect x={x + pad} y={y + pad + 40} width={w - pad * 2} height={ih} rx={16} fill={INK} />
      <rect x={x + pad + 8} y={y + pad + 48 + (ih - 16) * (1 - level)} width={w - pad * 2 - 16} height={(ih - 16) * level} rx={10} fill={VIOLET} />
      <path d={`M ${12} ${-30} L ${-26} ${30} L ${0} ${30} L ${-12} ${100} L ${30} ${20} L ${4} ${20} L ${18} ${-30} Z`} fill={YELLOW} transform={`translate(0 ${pad - 10})`} />
      <rect x={x + pad} y={y + pad - 4} width={w * 0.34} height={14} rx={7} fill={f.side} />
      <Streak x={x} y={y} w={w} h={h} r={34} />
    </g>
  );
};
