// Riso diagrams: a bar chart screened in halftone with one bar in solid overprint, and a three-ink Venn whose overlaps are the real ink mixes.
import type { FC } from "react";
import { Easing } from "remotion";
import { ramp, useTime } from "../../core/time";
import { BLACK, BLUE, DISPLAY, MONO, PAPER, PINK, YELLOW } from "./theme";
import { Plate, Stage, blobD } from "./press";
import { Halftone, linearTone } from "./halftone";
import { Kicker } from "./pieces";
import { Slug } from "./marks";

export type Bar = { label: string; value: number };

// Bars rise on their cue; the screen is fixed to the page, so a growing bar uncovers dots rather than stretching them.
export const HalftoneBars: FC<{ title: string; bars: Bar[]; max: number; hi?: number; at: number; hiAt?: number; out?: number }> = ({ title, bars, max, hi, at, hiAt, out }) => {
  const { t } = useTime();
  const x0 = 300, x1 = 1620, base = 860, top = 330;
  const slot = (x1 - x0) / bars.length;
  const bw = Math.min(190, slot * 0.62);
  const geo = bars.map((b, i) => {
    const grow = ramp(t, at + 0.3 + i * 0.12, 0.6, Easing.out(Easing.cubic));
    const h = ((base - top) * b.value) / max;
    const x = x0 + slot * i + (slot - bw) / 2;
    return { ...b, x, h, hh: h * grow, grow };
  });
  const tone = linearTone(0, base, 0, top, 1, 0.3);
  return (
    <Stage>
      <Kicker x={x0} y={200} text={title} at={at} out={out} />
      <Plate ink={BLUE} at={at + 0.3} out={out}>
        {geo.map((g, i) =>
          i === hi || g.hh < 1 ? null : <Halftone key={i} x={g.x} y={base - g.hh} w={bw} h={g.hh} cell={15} ink={BLUE} tone={tone} breathe={false} clip={`M${g.x} ${base - g.hh} h${bw} v${g.hh} h${-bw} Z`} />,
        )}
      </Plate>
      {hi != null && geo[hi] && geo[hi].hh > 1 && (
        <>
          <Plate ink={PINK} at={at + 0.3} kick={hiAt} out={out}>
            <rect x={geo[hi].x} y={base - geo[hi].hh} width={bw} height={geo[hi].hh} />
          </Plate>
          <Plate ink={YELLOW} at={hiAt ?? at + 0.3} k={1} reg={8} kick={hiAt} out={out}>
            <rect x={geo[hi].x} y={base - geo[hi].hh} width={bw} height={geo[hi].hh} />
          </Plate>
        </>
      )}
      <Plate ink={BLACK} tex="none" at={at + 0.15} out={out}>
        <rect x={x0 - 30} y={base} width={x1 - x0 + 60} height={5} />
      </Plate>
      <Plate ink={BLACK} tex="type" at={at + 0.2} out={out}>
        {geo.map((g, i) => (
          <text key={i} x={g.x + bw / 2} y={base + 56} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={34}>{g.label}</text>
        ))}
      </Plate>
      {geo.map((g, i) =>
        g.grow > 0.9 ? (
          <Plate key={i} ink={BLACK} tex="type" at={at + 0.3 + i * 0.12 + 0.5} out={out}>
            <text x={g.x + bw / 2} y={base - g.h - 22} textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize={i === hi ? 64 : 48}>{g.value}</text>
          </Plate>
        ) : null,
      )}
    </Stage>
  );
};

export type VennSet = { label: string; ink: string };

// Three circles, one per drum; where they overlap the inks multiply, so the diagram's colours are its argument.
export const OverprintVenn: FC<{ sets: [VennSet, VennSet, VennSet]; center: string; at: number; centerAt?: number; out?: number }> = ({ sets, center, at, centerAt, out }) => {
  const { t } = useTime();
  const r = 250;
  const c: [number, number][] = [[800, 430], [1120, 430], [960, 700]];
  const lab: [number, number, "start" | "middle" | "end"][] = [[690, 360, "middle"], [1230, 360, "middle"], [960, 840, "middle"]];
  const cAt = centerAt ?? at + 1.2;
  const lead = ramp(t, cAt, 0.4, Easing.out(Easing.cubic));
  const ex = 960 + (1290 - 960) * lead, ey = 530 + (880 - 530) * lead;
  return (
    <Stage>
      {sets.map((s, i) => (
        <Plate key={i} ink={s.ink} at={at + i * 0.3} k={i} out={out}>
          <path d={blobD(c[i]![0], c[i]![1], r, r, 60 + i, 0.03, 28)} />
        </Plate>
      ))}
      {sets.map((s, i) => (
        <Plate key={`l${i}`} ink={BLACK} tex="type" at={at + i * 0.3 + 0.2} out={out}>
          <text x={lab[i]![0]} y={lab[i]![1]} textAnchor={lab[i]![2]} fontFamily={DISPLAY} fontWeight={800} fontSize={58}>{s.label}</text>
        </Plate>
      ))}
      {lead > 0 && (
        <>
          <Plate ink={BLACK} tex="none" at={cAt} out={out}>
            <line x1={960} y1={530} x2={ex} y2={ey} stroke={BLACK} strokeWidth={4} strokeLinecap="round" />
          </Plate>
          <g>
            <circle cx={960} cy={530} r={17} fill={PAPER} />
            <circle cx={960} cy={530} r={9} fill={BLACK} />
          </g>
          <Slug x={1300} y={905} text={center} size={40} at={cAt + 0.3} out={out} />
        </>
      )}
    </Stage>
  );
};
