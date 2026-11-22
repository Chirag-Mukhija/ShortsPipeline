// The ground every scene sits on: flat sage (or near-black), a faint ring of stray letters slowly orbiting the centre, a tiny letter spinner and a bracketed scene mark in the corners.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { FPS, H, W } from "../../core/video";
import { M, TONE, type Tone } from "./theme";
import { CENTRE, Glyph, Label, mono, rnd, useStage } from "./glyphs";

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DUST = mono(28, 0, true);

// A loose orbit of single letters at the edge of attention (10–16 % opacity) so a hold never freezes.
export const DustRing: FC<{ tone?: Tone; count?: number; r?: number; o?: number; seed?: number }> = ({ tone = "sage", count = 44, r = 600, o = 0.17, seed = 3 }) => {
  const { t, pulse } = useStage();
  const f = t * FPS;
  const col = TONE[tone].ink;
  return (
    <>
      {Array.from({ length: count }, (_, k) => {
        const ch = ABC[Math.floor(rnd(`dc${seed}-${k}`) * 26)]!;
        const rr = r * (0.55 + 0.6 * rnd(`dr${seed}-${k}`)) * (1 + 0.03 * (0.5 - 0.5 * Math.cos((f / 150) * Math.PI * 2)) + 0.02 * pulse);
        const a = (k / count) * Math.PI * 2 + rnd(`da${seed}-${k}`) * 0.5 + (f * 0.05 * Math.PI) / 180;
        const drift = 3 * Math.sin((f / (80 + 60 * rnd(`dd${seed}-${k}`))) * Math.PI * 2 + k);
        const x = CENTRE.x + Math.cos(a) * rr * 1.25;
        const y = CENTRE.y + Math.sin(a) * rr * 0.72;
        if (x < 40 || x > W - 60 || y < 30 || y > H - 60) return null;
        return <Glyph key={k} ch={ch} ty={DUST} w={17} p={{ x, y: y + drift, r: (a * 180) / Math.PI + 90, s: 1, o: o * (0.6 + 0.4 * rnd(`do${seed}-${k}`)) }} color={col} />;
      })}
    </>
  );
};

// Eight letters chasing each other on a 30 px circle: the site's loader, kept as a corner mark.
export const Spinner: FC<{ x: number; y: number; tone?: Tone; text?: string }> = ({ x, y, tone = "sage", text = "ASSEMBLE" }) => {
  const { t } = useStage();
  const f = t * FPS;
  const ty = mono(28, 0, true);
  return (
    <>
      {[...text].map((ch, k) => {
        const a = (k / text.length) * Math.PI * 2 + f * 0.05;
        const o = 0.25 + 0.75 * ((k / text.length + f / 60) % 1);
        return <Glyph key={k} ch={ch} ty={ty} w={17} p={{ x: x + Math.cos(a) * 38 - 8, y: y + Math.sin(a) * 38 - 17, r: (a * 180) / Math.PI + 90, s: 0.62, o }} color={TONE[tone].sub} />;
      })}
    </>
  );
};

export type FieldProps = { tone?: Tone; dust?: boolean; mark?: string | null; spinner?: boolean };

export const Field: FC<FieldProps> = ({ tone = "sage", dust = true, mark = "(N°01)", spinner = true }) => {
  const tk = TONE[tone];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 60% at 50% 48%, ${tk.hi} 0%, ${tk.bg} 70%)`, overflow: "hidden" }}>
      {dust && <DustRing tone={tone} />}
      {mark && <Label text={mark} x={M} y={M - 40} ty={mono(28)} color={tk.sub} o={0.85} />}
      {spinner && <Spinner x={W - M - 24} y={M - 20} tone={tone} />}
    </AbsoluteFill>
  );
};
