// Clay shapes beyond the slab: a soft rounded cube in 3/4 view, a thick coin that can flip, a donut ring, and the egg-shaped buddy with a face.
import { useId, type FC, type ReactNode } from "react";
import { clayFill, clayFilter, Face, sizeFor, type Mood } from "./clay";
import { INK, ROUND, deep, shade, tint } from "./theme";

type Pt = [number, number];
const toD = (ps: Pt[]) => `M${ps.map((p) => p.join(" ")).join(" L")} Z`;

// A rounded cube seen from slightly above and to the left: three soft faces blurred into each other inside a rounded silhouette.
export const ClayCube: FC<{ size: number; color: string; floor?: boolean; children?: ReactNode }> = ({ size: s, color, floor, children }) => {
  const id = `cube${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const f = s * 0.72;
  const o: Pt = [s * 0.28, -s * 0.22];
  const y0 = s * 0.22;
  const A: Pt = [0, y0];
  const B: Pt = [f, y0];
  const C: Pt = [f, y0 + f];
  const D: Pt = [0, y0 + f];
  const add = (p: Pt): Pt => [p[0] + o[0], p[1] + o[1]];
  const rr = s * 0.09;
  const sil = [A, add(A), add(B), add(C), C, D];
  const cx = s / 2;
  const cy = s * 0.47;
  // Pull the silhouette in by the corner radius, then a round-joined stroke of twice that grows it back with soft corners.
  const inset = sil.map(([x, y]) => {
    const dx = cx - x;
    const dy = cy - y;
    const l = Math.hypot(dx, dy);
    return [x + (dx / l) * rr * 1.25, y + (dy / l) * rr * 1.25] as Pt;
  });
  return (
    <div style={{ position: "relative", width: s, height: s * 0.94 + 4 }}>
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: "visible", position: "absolute", top: 0, left: 0 }}>
        <defs>
          <mask id={`${id}m`}>
            <path d={toD(inset)} fill="#fff" stroke="#fff" strokeWidth={rr * 2.5} strokeLinejoin="round" />
          </mask>
          <filter id={`${id}b`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={s * 0.018} />
          </filter>
        </defs>
        <g filter={clayFilter(sizeFor(s * 0.6), floor)}>
          <g mask={`url(#${id}m)`}>
            <g filter={`url(#${id}b)`}>
              <rect x={-20} y={-20} width={s + 40} height={s + 40} fill={color} />
              <path d={toD([A, add(A), add(B), B])} fill={tint(color, 0.5)} />
              <path d={toD([B, add(B), add(C), C])} fill={shade(color, 0.26)} />
            </g>
          </g>
        </g>
      </svg>
      {children && <div style={{ position: "absolute", left: 0, top: y0, width: f, height: f, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>}
    </div>
  );
};

// A thick clay coin. `turn` in degrees flips it about its vertical axis (the face narrows, the rim shows).
export const ClayCoin: FC<{ size: number; color: string; label?: ReactNode; turn?: number; floor?: boolean }> = ({ size: s, color, label, turn = 0, floor }) => {
  const sx = Math.cos((turn * Math.PI) / 180);
  const th = s * 0.12;
  const r = s / 2;
  return (
    <div style={{ position: "relative", width: s, height: s + th }}>
      <svg width={s} height={s + th} viewBox={`${-r} ${-r} ${s} ${s + th}`} style={{ overflow: "visible", position: "absolute" }}>
        <g filter={clayFilter(sizeFor(s * 0.55), floor)}>
          <g transform={`scale(${Math.max(0.06, Math.abs(sx))} 1)`}>
            <ellipse cx={0} cy={th} rx={r} ry={r} fill={shade(color, 0.28)} />
            <rect x={-r} y={0} width={s} height={th} fill={shade(color, 0.28)} />
            <circle r={r} fill={color} />
            <circle r={r * 0.72} fill="none" stroke={shade(color, 0.12)} strokeWidth={s * 0.045} />
          </g>
        </g>
      </svg>
      {label !== undefined && Math.abs(sx) > 0.3 && (
        <div style={{ position: "absolute", left: 0, top: 0, width: s, height: s, display: "flex", alignItems: "center", justifyContent: "center", transform: `scaleX(${sx})`, fontFamily: ROUND, fontWeight: 700, fontSize: s * 0.42, color: deep(color) }}>
          {label}
        </div>
      )}
    </div>
  );
};

// A donut: a thick stroke the lighting turns into a torus. `p` (0..1) draws it as an arc for gauges.
export const ClayRing: FC<{ size: number; color: string; thick?: number; p?: number; floor?: boolean; track?: string }> = ({ size: s, color, thick = s * 0.26, p = 1, floor, track }) => {
  const r = (s - thick) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={s} height={s} viewBox={`${-s / 2} ${-s / 2} ${s} ${s}`} style={{ overflow: "visible", display: "block" }}>
      <g filter={clayFilter(sizeFor(thick * 1.2), floor)}>
        {track && <circle r={r} fill="none" stroke={track} strokeWidth={thick} />}
        {p > 0.002 && <circle r={r} fill="none" stroke={color} strokeWidth={thick} strokeLinecap="round" strokeDasharray={`${c * Math.min(1, p)} ${c}`} transform="rotate(-90)" />}
      </g>
    </svg>
  );
};

// The clay buddy: an egg of clay with bead eyes. Mood and `talk` drive the face; `look` (-1..1) shifts the gaze.
export const Buddy: FC<{ size: number; color: string; mood?: Mood; talk?: number; look?: number; seed?: number; floor?: boolean }> = ({ size: s, color, mood, talk, look, seed, floor = true }) => (
  <div style={{ position: "relative", width: s, height: s * 1.08, filter: clayFilter(sizeFor(s * 0.7), floor) }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "50% 50% 46% 46% / 56% 56% 44% 44%", background: clayFill(color) }} />
    <div style={{ position: "absolute", left: 0, top: s * 0.36, width: s, display: "flex", justifyContent: "center" }}>
      <Face w={s * 0.8} mood={mood} talk={talk} look={look} seed={seed} />
    </div>
  </div>
);

export const Label: FC<{ text: string; size?: number; color?: string; weight?: number }> = ({ text, size = 32, color = INK, weight = 500 }) => (
  <div style={{ fontFamily: ROUND, fontWeight: weight, fontSize: size, color, textAlign: "center", whiteSpace: "nowrap" }}>{text}</div>
);
