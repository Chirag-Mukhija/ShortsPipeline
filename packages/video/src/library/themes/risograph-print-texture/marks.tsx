// Printer's marks and stamps: registration targets and crop marks that draw in, an overprint colour bar, and the rubber-stamp label that punches down.
import type { FC } from "react";
import { Easing, interpolate } from "remotion";
import { ramp, useTime } from "../../core/time";
import { BLACK, BLUE, MONO, PINK, SHOUT, YELLOW } from "./theme";
import { Plate, roughRectD, usePlate, type PlateCue } from "./press";

// A registration target (circle + cross) that draws on over 0.35 s, printed in each ink on top of the others so a
// misregistered press shows coloured fringes around it, exactly like the real marks.
export const RegTarget: FC<{ x: number; y: number; at: number; r?: number; inks?: string[] }> = ({ x, y, at, r = 22, inks = [PINK, BLUE, BLACK] }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.35, Easing.out(Easing.cubic));
  const C = 2 * Math.PI * r;
  return (
    <>
      {inks.map((ink, i) => (
        <Plate key={i} ink={ink} at={at} k={i} reg={2.5} tex="none">
          <g fill="none" stroke={ink} strokeWidth={3}>
            <circle cx={x} cy={y} r={r} strokeDasharray={`${C * p} ${C}`} transform={`rotate(-90 ${x} ${y})`} />
            <line x1={x - r * 1.7 * p} y1={y} x2={x + r * 1.7 * p} y2={y} />
            <line x1={x} y1={y - r * 1.7 * p} x2={x} y2={y + r * 1.7 * p} />
          </g>
        </Plate>
      ))}
    </>
  );
};

// Corner crop marks for a framed area (a "print" inside the frame); they slide in from outside.
export const CropMarks: FC<{ x: number; y: number; w: number; h: number; at: number; out?: number; gap?: number; len?: number; ink?: string }> = ({ x, y, w, h, at, out, gap = 16, len = 46, ink = BLACK }) => {
  const { t } = useTime();
  const p = ramp(t, at, 0.4, Easing.out(Easing.cubic));
  const l = len * p;
  const c: [number, number, number, number][] = [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]];
  return (
    <Plate ink={ink} at={at} out={out} tex="none" cell={8}>
      <g stroke={ink} strokeWidth={2.5}>
        {c.map(([cx, cy, sx, sy], i) => (
          <g key={i}>
            <line x1={cx + sx * gap} y1={cy} x2={cx + sx * (gap + l)} y2={cy} />
            <line x1={cx} y1={cy + sy * gap} x2={cx} y2={cy + sy * (gap + l)} />
          </g>
        ))}
      </g>
    </Plate>
  );
};

// The press check strip: solid swatches of each ink and of each overprint, printed plate by plate so the mixes appear as the second ink lands.
export const ColorBars: FC<{ x: number; y: number; at: number; size?: number; label?: boolean }> = ({ x, y, at, size = 54, label = true }) => {
  const sw: string[][] = [[PINK], [BLUE], [YELLOW], [PINK, BLUE], [PINK, YELLOW], [BLUE, YELLOW], [PINK, BLUE, YELLOW]];
  const plates = [PINK, BLUE, YELLOW];
  return (
    <>
      {plates.map((ink, k) => (
        <Plate key={ink} ink={ink} at={at} k={k * 2} reg={2}>
          {sw.map((s, i) => (s.includes(ink) ? <rect key={i} x={x + i * (size + 8)} y={y} width={size} height={size} /> : null))}
        </Plate>
      ))}
      {label && (
        <Plate ink={BLACK} at={at + 0.4} tex="type">
          <text x={x} y={y + size + 40} fontFamily={MONO} fontWeight={700} fontSize={28} letterSpacing={2}>PRESS CHECK · 3 DRUMS</text>
        </Plate>
      )}
    </>
  );
};

// A rubber stamp: punches from 1.3× to 1× in 5 frames, double frame, Rubik Mono lettering, optional off-register echo in a second ink.
export const StampLabel: FC<PlateCue & { x: number; y: number; text: string; ink?: string; echo?: string; r?: number; size?: number; w?: number; seed?: number }> = ({ x, y, text, ink = PINK, echo, r = -8, size = 64, w, seed = 3, ...cue }) => {
  const s = usePlate(cue);
  if (!s) return null;
  const width = w ?? text.length * size * 0.86 + size * 1.3;
  const h = size * 1.75;
  const punch = interpolate(s.df, [0, 5], [1.3, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const body = (
    <>
      <path d={roughRectD(-width / 2, -h / 2, width, h, seed, 3)} fill="none" stroke="currentColor" strokeWidth={size * 0.11} />
      <path d={roughRectD(-width / 2 + size * 0.2, -h / 2 + size * 0.2, width - size * 0.4, h - size * 0.4, seed + 1, 2)} fill="none" stroke="currentColor" strokeWidth={size * 0.045} />
      <text x={0} y={size * 0.36} textAnchor="middle" fontFamily={SHOUT} fontSize={size} textLength={width - size * 1.1} lengthAdjust="spacingAndGlyphs">
        {text}
      </text>
    </>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${punch})`}>
      <Plate ink={ink} tex="stamp" {...cue} k={0}>
        {body}
      </Plate>
      {echo && (
        <Plate ink={echo} tex="stamp" {...cue} k={1} reg={7} opacity={0.85}>
          {body}
        </Plate>
      )}
    </g>
  );
};

// A Courier slug line, the small print riso zines carry at the foot of a page.
export const Slug: FC<PlateCue & { x: number; y: number; text: string; ink?: string; size?: number; anchor?: "start" | "middle" | "end" }> = ({ x, y, text, ink = BLACK, size = 30, anchor = "start", ...cue }) => (
  <Plate ink={ink} tex="type" {...cue}>
    <text x={x} y={y} fontFamily={MONO} fontWeight={700} fontSize={size} letterSpacing={size * 0.08} textAnchor={anchor}>
      {text}
    </text>
  </Plate>
);
