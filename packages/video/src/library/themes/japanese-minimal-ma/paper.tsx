// Washi background: warm white field with long kozo fibres and fine grain, a breath of shade at the edges, and a few seeded motes and petals falling at 0.3 px a frame.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { W, H } from "../../core/video";
import { GREY, WASHI } from "./theme";
import { rng, sample, linePath, type P } from "./geometry";
import { useMa } from "./primitives";

const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.32  0 0 0 0 0.27  0 0 0 0.5 0'/></filter><rect width='360' height='360' filter='url(#n)'/></svg>`,
)}")`;

// Cloudy pulp: low-frequency turbulence so the sheet is never a flat colour.
const CLOUD = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='960' height='540'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.006 0.011' numOctaves='3' seed='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.22 -0.04'/></filter><rect width='960' height='540' filter='url(#c)'/></svg>`,
)}")`;

// Kozo fibres: short curling hairs scattered once, deterministic, drawn as one static layer.
const FIBRES = (() => {
  const r = rng(41);
  return Array.from({ length: 90 }, () => {
    const x = r() * W;
    const y = r() * H;
    const len = 30 + r() * 140;
    const a = r() * Math.PI * 2;
    const bend = (r() - 0.5) * 0.9;
    const ctrl: P[] = [0, 0.5, 1].map((k) => {
      const aa = a + bend * k;
      return [x + Math.cos(aa) * len * k, y + Math.sin(aa) * len * k];
    });
    return { d: linePath(sample(ctrl, 10)), w: 0.6 + r() * 1.1, o: 0.05 + r() * 0.1 };
  });
})();

export const Washi: FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: WASHI }} />
    <AbsoluteFill style={{ backgroundImage: CLOUD, backgroundSize: "1920px 1080px", mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.22, mixBlendMode: "multiply" }} />
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {FIBRES.map((f, i) => (
        <path key={i} d={f.d} fill="none" stroke="#8C8476" strokeWidth={f.w} opacity={f.o} strokeLinecap="round" />
      ))}
    </svg>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 46% 42%, transparent 62%, rgba(120,104,80,0.08) 100%)" }} />
  </>
);

// Sparse falling motes and petals; density rises with music energy when inside <MaSong>.
export const PetalDrift: FC<{ count?: number; seed?: number }> = ({ count = 14, seed = 9 }) => {
  const { f, music, energy } = useMa();
  const r = rng(seed);
  const n = music ? Math.round(count * (0.6 + energy)) : count;
  const items = Array.from({ length: Math.round(count * 1.6) }, (_, i) => {
    const petal = i % 5 === 0;
    return { x0: r() * W, y0: r() * (H + 80), v: 0.22 + r() * 0.16, sway: 4 + r() * 10, ph: r() * 6.28, size: petal ? 6 + r() * 4 : 1.4 + r() * 1.8, petal, o: 0.28 + r() * 0.3, spin: (r() - 0.5) * 1.2 };
  }).slice(0, n);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {items.map((m, i) => {
        const y = ((m.y0 + f * m.v) % (H + 80)) - 40;
        const x = m.x0 + Math.sin(f / 70 + m.ph) * m.sway + f * 0.05;
        return m.petal ? (
          <ellipse key={i} cx={x % W} cy={y} rx={m.size} ry={m.size * 0.45} fill="#C9BFB2" opacity={m.o} transform={`rotate(${(f * m.spin) % 360} ${x % W} ${y})`} />
        ) : (
          <circle key={i} cx={x % W} cy={y} r={m.size} fill={GREY} opacity={m.o} />
        );
      })}
    </svg>
  );
};

// The theme's background: paper plus its quiet idle life.
export const MaPaper: FC = () => (
  <>
    <Washi />
    <PetalDrift />
  </>
);
