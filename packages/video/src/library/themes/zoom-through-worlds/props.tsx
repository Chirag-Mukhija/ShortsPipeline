// Zoom-through-worlds props: Floppy the skating disk mascot, SkateIn, the Peeker face that rises from the bottom edge, and the CSS 3D floating book.
import type { FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import { W } from "../../core/video";
import { BlinkEyes, type Look } from "./life";
import { Inked, ease, inkRect, starPath } from "./ink";
import { BACK, CHUNK, DISPLAY, EXPO_OUT, FLESH, HOT, HOT_DEEP, INK, PAPER, PAPER_DIM, QUAD_IN, SCRAWL, SKIN, SUN, VOID, inked } from "./theme";

const DISK = "M-88 -232 L78 -232 L110 -200 L110 -34 Q110 -10 86 -10 L-86 -10 Q-110 -10 -110 -34 L-110 -208 Q-110 -232 -88 -232Z";

// Floppy: a hot-pink floppy disk with a face on its label, standing on a yellow skateboard. Origin is the middle of the deck.
export const Floppy: FC<{ wheel?: number; lookAt?: Look[]; seed?: number; legs?: number }> = ({ wheel = 0, lookAt, seed = 5, legs = 0 }) => (
  <g>
    <Inked d={`M-46 -12 L${-50 + legs * 6} 12`} w={8} />
    <Inked d={`M46 -12 L${50 - legs * 6} 12`} w={8} />
    <Inked d={DISK} fill={HOT} w={7} />
    <path d="M70 -232 L78 -232 L110 -200 L110 -34 Q110 -10 86 -10 L80 -10 Z" fill={HOT_DEEP} />
    <Inked d={DISK} w={7} />
    <Inked d={inkRect(-58, -232, 116, 70, 6, 3, 1)} fill={PAPER_DIM} w={6} />
    <rect x={-6} y={-220} width={30} height={44} rx={4} fill={INK} />
    <Inked d={inkRect(-82, -136, 164, 110, 10, 4, 2)} fill={SKIN} w={6} />
    <BlinkEyes x={0} y={-94} size={36} gap={1.5} lookAt={lookAt} seed={seed} blinkEvery={2.8} />
    <Inked d="M-18 -52 Q0 -38 18 -52" w={5} />
    <Inked d={inkRect(-140, 10, 280, 24, 12, 9, 1)} fill={SUN} w={6} />
    {[-90, 90].map((x) => (
      <g key={x} transform={`translate(${x} 46) rotate(${(wheel * 180) / Math.PI})`}>
        <circle r={17} fill={PAPER} stroke={INK} strokeWidth={6} />
        <path d="M-9 0 L9 0" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
    ))}
  </g>
);

// A prop rolls in from `from` to `to` (x, px) on expo-out over 36 f with a tilt easing to 0, and rolls out past the right edge (quad-in, 30 f) at `out`.
export const SkateIn: FC<{ at: number; from?: number; to: number; y: number; out?: number; tilt?: number; s?: number; children?: (wheel: number) => ReactNode; lookAt?: Look[] }> = ({
  at, from = -300, to, y, out, tilt = -6, s = 1, children, lookAt,
}) => {
  const { t } = useTime();
  const xAt = (tt: number) => {
    const inP = ease(tt, at, 36 / 30, EXPO_OUT);
    const outP = out === undefined ? 0 : ease(tt, out, 1, QUAD_IN);
    return from + (to - from) * inP + (W + 400 - to) * outP;
  };
  const x = xAt(t);
  const v = x - xAt(t - 1 / 30);
  const inP = ease(t, at, 36 / 30, EXPO_OUT);
  const outP = out === undefined ? 0 : ease(t, out, 1, QUAD_IN);
  const rot = tilt * (1 - inP) + 5 * outP + Math.sin(t * 5) * 0.6;
  const wheel = x / 17;
  const speed = Math.min(1, Math.abs(v) / 30);
  return (
    <g transform={`translate(${x} ${y + Math.abs(Math.sin(t * 9)) * -3 * speed}) scale(${s}) rotate(${rot})`}>
      {speed > 0.05 &&
        [0, 1, 2].map((i) => (
          <path key={i} d={`M${-170 - i * 30} ${-150 + i * 60} L${-170 - i * 30 - 90 * speed} ${-150 + i * 60}`} stroke={INK} strokeWidth={7} strokeLinecap="round" opacity={speed} />
        ))}
      {children ? children(wheel) : <Floppy wheel={wheel} lookAt={lookAt} legs={speed} />}
    </g>
  );
};

// A big round face rising from the bottom edge with two blinking eyes; the theme's narrator-reaction character. x is its centre.
export const Peeker: FC<{ x: number; w?: number; rise?: number; at?: number; lookAt?: Look[]; color?: string; tuft?: string; mouth?: number }> = ({
  x, w = 520, rise = 300, at = 0, lookAt, color = SKIN, tuft = HOT, mouth = 0,
}) => {
  const { t } = useTime();
  const p = ease(t, at, 0.8, BACK);
  const top = 1080 - rise * p;
  const hw = w / 2;
  const body = `M${x - hw} 1200 L${x - hw} ${top + hw * 0.7} C${x - hw} ${top + hw * 0.2} ${x - hw * 0.55} ${top} ${x} ${top} C${x + hw * 0.55} ${top} ${x + hw} ${top + hw * 0.2} ${x + hw} ${top + hw * 0.7} L${x + hw} 1200Z`;
  return (
    <g>
      <Inked d={`M${x - 70} ${top + 30} Q${x - 80} ${top - 60} ${x - 30} ${top - 34} Q${x} ${top - 90} ${x + 30} ${top - 30} Q${x + 80} ${top - 60} ${x + 70} ${top + 30}Z`} fill={tuft} w={7} />
      <Inked d={body} fill={color} w={8} />
      <ellipse cx={x - w * 0.3} cy={top + w * 0.36} rx={w * 0.07} ry={w * 0.04} fill={FLESH} />
      <ellipse cx={x + w * 0.3} cy={top + w * 0.36} rx={w * 0.07} ry={w * 0.04} fill={FLESH} />
      <BlinkEyes x={x} y={top + w * 0.25} size={w * 0.17} gap={1.6} lookAt={lookAt} seed={Math.round(x)} />
      {mouth > 0 && <ellipse cx={x} cy={top + w * 0.4} rx={w * 0.05 * mouth} ry={w * 0.06 * mouth} fill={VOID} stroke={INK} strokeWidth={6} />}
    </g>
  );
};

// A CSS 3D book: the cover turns on Y ±`spinDeg` over a 120-frame sine. It lands at `at` (scale + spin in on back-out).
export const FloatingBook3D: FC<{ x: number; y: number; at?: number; w?: number; h?: number; depth?: number; spinDeg?: number; title: string; byline?: string; cover?: ReactNode }> = ({
  x, y, at = 0, w = 380, h = 500, depth = 56, spinDeg = 15, title, byline, cover,
}) => {
  const { t } = useTime();
  const p = ease(t, at, 0.9, BACK);
  const turn = -18 + spinDeg * Math.sin(((t - at) * 2 * Math.PI) / 4) - (1 - p) * 140;
  const face = { position: "absolute", left: 0, top: 0, backfaceVisibility: "hidden", border: `6px solid ${INK}`, boxSizing: "border-box" } as const;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2 + Math.sin(t * 1.6) * 10, width: w, height: h, perspective: 1100, transform: `scale(${p})`, opacity: p > 0 ? 1 : 0 }}>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateX(-8deg) rotateY(${turn}deg) rotateZ(${Math.sin(t * 1.1) * 2}deg)` }}>
        <div style={{ ...face, width: w, height: h, background: HOT, borderRadius: "6px 14px 14px 6px", transform: `translateZ(${depth / 2}px)`, overflow: "hidden" }}>
          {cover ?? <BookCover title={title} byline={byline} w={w - 12} h={h - 12} />}
        </div>
        <div style={{ ...face, width: w, height: h, background: HOT_DEEP, borderRadius: "14px 6px 6px 14px", transform: `rotateY(180deg) translateZ(${depth / 2}px)` }} />
        <div style={{ ...face, width: depth, height: h, left: (w - depth) / 2, background: HOT_DEEP, transform: `rotateY(-90deg) translateZ(${w / 2}px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 30, color: SUN, transform: "rotate(-90deg)", whiteSpace: "nowrap", textShadow: inked(2, 2) }}>{title}</div>
        </div>
        <div style={{ ...face, width: depth, height: h - 16, top: 8, left: (w - depth) / 2, background: PAPER, transform: `rotateY(90deg) translateZ(${w / 2 - 6}px)`, borderWidth: 4 }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 4, right: 4, top: 18 + i * 32, height: 3, background: PAPER_DIM }} />
          ))}
        </div>
        <div style={{ ...face, width: w - 12, height: depth, left: 6, top: (h - depth) / 2, background: PAPER, transform: `rotateX(90deg) translateZ(${h / 2 - 6}px)`, borderWidth: 4 }} />
      </div>
    </div>
  );
};

// The default cover: a pink cover with an eye-portal full of stars and the title in inked yellow.
export const BookCover: FC<{ title: string; byline?: string; w: number; h: number }> = ({ title, byline, w, h }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      <ellipse cx={w / 2} cy={h * 0.62} rx={w * 0.34} ry={w * 0.28} fill={SKIN} stroke={INK} strokeWidth={6} />
      <circle cx={w / 2} cy={h * 0.62} r={w * 0.2} fill={VOID} />
      {[[-0.08, -0.06, 14], [0.07, 0.03, 10], [-0.02, 0.09, 8], [0.1, -0.08, 7]].map(([dx, dy, r], i) => (
        <path key={i} d={starPath(w / 2 + dx! * w, h * 0.62 + dy! * w, r!, 3 + i)} fill={SUN} />
      ))}
      <path d={`M${w * 0.14} ${h * 0.5} Q${w / 2} ${h * 0.36} ${w * 0.86} ${h * 0.5}`} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
    </svg>
    <div style={{ position: "absolute", top: 26, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, fontSize: 64, lineHeight: 0.95, color: SUN, textShadow: inked(3.5, 5) }}>{title}</div>
    {byline && <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", fontFamily: SCRAWL, fontSize: 30, color: INK }}>{byline}</div>}
    <div style={{ position: "absolute", bottom: 64, right: 22, fontFamily: CHUNK, fontSize: 22, color: PAPER, background: INK, padding: "2px 10px", borderRadius: 8 }}>EP. 1</div>
  </div>
);
