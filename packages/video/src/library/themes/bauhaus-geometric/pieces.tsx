// Bauhaus narrated pieces: poster title, key-word line on spoken words, steps delivered along a rail, quadrant stat dial, balance beam comparison, quote slab and source rule.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { OUT, ramp, useTime } from "../../core/time";
import { BLACK, BLUE, CREAM, EXPO, GEO, MONO, RED, RULE, TURN, YELLOW, fr } from "./theme";
import { detents, enter, slide } from "./motion";
import { Ball, Shape, Stage, Txt, VLabel, type Kind } from "./shapes";

// ---------- Title / hook card: a constructivist poster that assembles ----------
export const PosterTitle: FC<{ lines: string[]; kicker?: string; tag?: string; at?: number; size?: number }> = ({ lines, kicker, tag, at = 0, size = 140 }) => {
  const { t } = useTime();
  const top = 500;
  const lead = size * 1.02;
  return (
    <Stage>
      <defs>
        {lines.map((_, i) => (
          <clipPath key={i} id={`pt-row${i}`}>
            <rect x={170} y={top + i * lead - size} width={1080} height={size * 1.3} />
          </clipPath>
        ))}
      </defs>
      <Shape kind="quarter" x={1920 - 230} y={1080 - 230} w={460} fill={BLUE} rot={-90} ox={-230} oy={230} scale={enter(t, at)} />
      <Shape kind="circle" x={1470} y={400} w={560} fill={RED} scale={enter(t, at + 0.45, fr(18))} />
      <Shape kind="bar" x={1460} y={640} w={980} h={40} fill={BLACK} rot={-32} ox={-490} oy={0} sx={ramp(t, at + 0.7, fr(14), EXPO)} />
      <Shape kind="tri" x={1250} y={846} w={210} h={190} fill={YELLOW} rot={detents(t, [[0, -120], [at + 0.95, 0]])} scale={enter(t, at + 0.9)} />
      <Ball x={1745} y={190} r={34} fill={BLACK} mark={YELLOW} rot={detents(t, [[0, 0], [at + 1.2, 90], [at + 2.4, 180]])} scale={enter(t, at + 1.1)} />
      {kicker && (
        <Txt x={180} y={top - size - 70 + slide(t, at + 0.2, 30)} size={32} mono opacity={t >= at + 0.2 ? 1 : 0}>
          {kicker}
        </Txt>
      )}
      <Shape kind="bar" x={180 + 180} y={top - size - 30} w={360} h={24} fill={RED} ox={-180} oy={0} sx={ramp(t, at + 0.15, fr(12), EXPO)} />
      {lines.map((line, i) => (
        <g key={i} clipPath={`url(#pt-row${i})`}>
          <Txt x={180 - slide(t, at + 0.3 + i * fr(5), 1000)} y={top + i * lead} size={size} weight={800}>
            {line}
          </Txt>
        </g>
      ))}
      {tag && <VLabel x={120} y={960} text={tag} at={at + 1.0} />}
    </Stage>
  );
};

// ---------- Key word or claim: words land on their spoken times, the key word gets a block and a turning triangle ----------
export type KeyWord = { w: string; t: number; key?: boolean; color?: string };

export const KeyLine: FC<{ words: KeyWord[]; y?: number; size?: number; maxWidth?: number; lead?: number }> = ({ words, y = 540, size = 120, maxWidth = 1560, lead = fr(3) }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          transform: "translateY(-50%)",
          width: maxWidth,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: size * 0.3,
          rowGap: size * 0.12,
          fontFamily: GEO,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          color: BLACK,
        }}
      >
        {words.map((w, i) => {
          const at = w.t - lead;
          const shown = t >= at;
          const dy = slide(t, at, size * 0.45);
          if (!w.key)
            return (
              <span key={i} style={{ display: "inline-block", opacity: shown ? 1 : 0, transform: `translateY(${dy}px)` }}>
                {w.w.toLowerCase()}
              </span>
            );
          const block = ramp(t, at, fr(10), EXPO);
          const tri = detents(t, [[0, -120], [at + fr(8), 0]], TURN);
          const triOn = enter(t, at + fr(6));
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", padding: `0 ${size * 0.16}em`, opacity: shown ? 1 : 0 }}>
              <span style={{ position: "absolute", inset: `${size * 0.0006}em 0 0 0`, top: "0.06em", bottom: "0.02em", background: w.color ?? RED, transform: `scaleX(${block})`, transformOrigin: "left center" }} />
              <span style={{ position: "relative", color: block > 0.55 ? CREAM : BLACK, display: "inline-block", transform: `translateY(${dy}px)` }}>{w.w.toLowerCase()}</span>
              <svg width={size * 0.5} height={size * 0.5} viewBox="-50 -50 100 100" style={{ position: "absolute", right: -size * 0.2, top: -size * 0.2, overflow: "visible" }}>
                <Shape kind="tri" x={0} y={6} w={92} h={80} fill={YELLOW} rot={tri} scale={triOn} />
              </svg>
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -size * 0.12, height: RULE + 2, background: BLACK, transform: `scaleX(${ramp(t, at + fr(10), fr(10), EXPO)})`, transformOrigin: "right center" }} />
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- List / steps: a car runs along a rail and each step's shape rises out of the rail slot ----------
export type Step = { label: string; sub?: string; t: number };
const STEP_KINDS: { kind: Kind; fill: string; from: number }[] = [
  { kind: "circle", fill: BLUE, from: 0 },
  { kind: "square", fill: RED, from: 45 },
  { kind: "tri", fill: YELLOW, from: -120 },
  { kind: "quarter", fill: BLACK, from: -90 },
];

export const ShapeSteps: FC<{ steps: Step[]; railAt?: number; y?: number; title?: string }> = ({ steps, railAt, y = 640, title }) => {
  const { t } = useTime();
  const n = steps.length;
  const gap = Math.min(440, 1300 / Math.max(1, n - 1));
  const xs = steps.map((_, i) => 960 + (i - (n - 1) / 2) * gap);
  const r0 = railAt ?? (steps[0]?.t ?? 0) - 0.5;
  const x0 = xs[0]! - 170;
  const x1 = xs[n - 1]! + 170;
  // The car rides to each step just before its shape rises.
  let carX = x0 + 20;
  for (let i = 0; i < n; i++) carX += (xs[i]! - carX) * ramp(t, steps[i]!.t - fr(10), fr(12), EXPO);
  const S = 220;
  return (
    <Stage>
      <defs>
        <clipPath id="ss-slot">
          <rect x={0} y={0} width={1920} height={y - RULE / 2} />
        </clipPath>
      </defs>
      {title && (
        <Txt x={180} y={200} size={64} weight={800} opacity={t >= r0 ? 1 : 0}>
          {title}
        </Txt>
      )}
      <g clipPath="url(#ss-slot)">
        {steps.map((s, i) => {
          const k = STEP_KINDS[i % STEP_KINDS.length]!;
          return (
            <Shape key={i} kind={k.kind} x={xs[i]!} y={y - 40 - S / 2 + slide(t, s.t, S + 60)} w={S} fill={k.fill} rot={detents(t, [[0, k.from], [s.t + fr(8), 0]])} opacity={t >= s.t ? 1 : 0} />
          );
        })}
        <rect x={carX - 22} y={y - RULE / 2 - 30} width={44} height={30} fill={BLACK} opacity={t >= r0 + 0.2 ? 1 : 0} />
      </g>
      <Shape kind="bar" x={(x0 + x1) / 2} y={y} w={x1 - x0} h={RULE + 2} fill={BLACK} ox={-(x1 - x0) / 2} oy={0} sx={ramp(t, r0, fr(16), EXPO)} />
      {steps.map((s, i) => {
        const p = t >= s.t + fr(4);
        const dy = slide(t, s.t + fr(4), -30);
        return (
          <g key={`l${i}`} opacity={p ? 1 : 0}>
            <rect x={xs[i]! - 3} y={y} width={6} height={22 * ramp(t, s.t, fr(6))} fill={BLACK} />
            <Txt x={xs[i]!} y={y + 70 + dy} size={30} mono anchor="middle" fill={RED} weight={700}>
              {String(i + 1).padStart(2, "0")}
            </Txt>
            <Txt x={xs[i]!} y={y + 140 + dy} size={58} weight={700} anchor="middle">
              {s.label}
            </Txt>
            {s.sub && (
              <Txt x={xs[i]!} y={y + 196 + dy} size={36} weight={500} anchor="middle" opacity={0.75}>
                {s.sub}
              </Txt>
            )}
          </g>
        );
      })}
    </Stage>
  );
};

// ---------- Big number: the count snaps up while a dial fills quadrant by quadrant in red, yellow, blue, black ----------
const wedge = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => `${cx + r * Math.sin((a * Math.PI) / 180)} ${cy - r * Math.cos((a * Math.PI) / 180)}`;
  return `M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)} Z`;
};

export const StatDial: FC<{ value: number; of?: number; unit?: string; label: string; at?: number; dur?: number; tag?: string }> = ({ value, of = 100, unit = "%", label, at = 0, dur = 1.1, tag }) => {
  const { t } = useTime();
  const c = ramp(t, at + 0.2, dur, OUT);
  const shown = Math.round(value * c);
  const frac = Math.min(1, (value / of) * c);
  const cx = 1390;
  const cy = 520;
  const R = 300;
  const QUAD = [RED, YELLOW, BLUE, BLACK];
  const face = enter(t, at, fr(18));
  const angle = frac * 360;
  const lines = label.split("\n");
  return (
    <Stage>
      <g transform={`translate(${cx} ${cy}) scale(${face}) translate(${-cx} ${-cy})`} opacity={face > 0 ? 1 : 0}>
        <circle cx={cx} cy={cy} r={R} fill={CREAM} />
        {QUAD.map((col, q) => {
          const u = Math.min(1, Math.max(0, frac * 4 - q));
          return u > 0 ? <path key={q} d={wedge(cx, cy, R, q * 90, q * 90 + u * 90)} fill={col} /> : null;
        })}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={BLACK} strokeWidth={RULE} />
        <rect x={cx - R} y={cy - 1.5} width={2 * R} height={3} fill={BLACK} />
        <rect x={cx - 1.5} y={cy - R} width={3} height={2 * R} fill={BLACK} />
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <rect x={cx - 5} y={cy - R - 40} width={10} height={R + 40} fill={BLACK} />
          <Shape kind="tri" x={cx} y={cy - R - 62} w={44} h={40} fill={BLACK} rot={180} />
        </g>
        <circle cx={cx} cy={cy} r={22} fill={BLACK} />
        {["0", "25", "50", "75"].map((s, q) => {
          const a = (q * 90 * Math.PI) / 180;
          const d = R + 58;
          return (
            <Txt key={s} x={cx + d * Math.sin(a) + (q === 1 ? 10 : q === 3 ? -10 : 0)} y={cy - d * Math.cos(a) + 10} size={28} mono anchor={q === 1 ? "start" : q === 3 ? "end" : "middle"} opacity={0.7}>
              {s}
            </Txt>
          );
        })}
      </g>
      <g opacity={t >= at + 0.2 ? 1 : 0}>
        <text x={160} y={640} fontFamily={GEO} fontWeight={800} fontSize={300} letterSpacing={-12} fill={BLACK}>
          {shown}
          <tspan fill={RED} fontSize={170} dx={8}>
            {unit}
          </tspan>
        </text>
      </g>
      <Shape kind="bar" x={160 + 320} y={690} w={640} h={14} fill={BLACK} ox={-320} oy={0} sx={ramp(t, at + 0.4, fr(14), EXPO)} />
      {lines.map((l, i) => (
        <Txt key={i} x={164} y={776 + i * 58 + slide(t, at + 0.6 + i * fr(3), 24)} size={46} weight={600} opacity={t >= at + 0.6 + i * fr(3) ? 1 : 0}>
          {l}
        </Txt>
      ))}
      {tag && <VLabel x={110} y={540} text={tag} at={at + 0.8} />}
    </Stage>
  );
};

// ---------- A vs B: a balance beam on a triangle fulcrum; each side drops its shape on, then the beam tips ----------
export type Side = { label: string; sub?: string };

export const Balance: FC<{ a: Side; b: Side; at: { a: number; b: number; tip?: number }; heavier?: "a" | "b" }> = ({ a, b, at, heavier }) => {
  const { t } = useTime();
  const px = 960;
  const py = 700;
  const arm = 470;
  // Each landing knocks the beam a little before it settles: a damped sine, never a CSS spring.
  const knock = (land: number, dir: number) => (t > land ? dir * 2.4 * Math.exp(-(t - land) * 5) * Math.sin((t - land) * 22) : 0);
  const tipTo = heavier === "a" ? -8 : heavier === "b" ? 8 : 0;
  const theta = (at.tip !== undefined ? detents(t, [[0, 0], [at.tip, tipTo]], fr(18)) : 0) + knock(at.a + fr(8), -1) + knock(at.b + fr(8), 1);
  const beamIn = ramp(t, Math.min(at.a, at.b) - 0.5, fr(14), EXPO);
  const dim = (side: "a" | "b") => (heavier && at.tip !== undefined && heavier !== side ? 1 - 0.45 * ramp(t, at.tip + fr(10), fr(8)) : 1);
  const label = (s: Side, x: number, cue: number, side: "a" | "b") => (
    <g opacity={(t >= cue ? 1 : 0) * dim(side)}>
      <Txt x={x} y={250 + slide(t, cue, -24)} size={80} weight={800} anchor="middle">
        {s.label}
      </Txt>
      {s.sub && (
        <Txt x={x} y={310 + slide(t, cue + fr(3), -24)} size={34} weight={500} anchor="middle" opacity={t >= cue + fr(3) ? 0.8 : 0}>
          {s.sub}
        </Txt>
      )}
    </g>
  );
  return (
    <Stage>
      <Shape kind="tri" x={px} y={py + 100} w={230} h={190} fill={BLACK} scale={enter(t, Math.min(at.a, at.b) - 0.7)} oy={95} />
      <Shape kind="bar" x={px} y={py + 200} w={560} h={RULE} fill={BLACK} sx={beamIn} />
      <g transform={`rotate(${theta} ${px} ${py})`}>
        <Shape kind="bar" x={px} y={py} w={arm * 2 + 300} h={28} fill={BLACK} sx={beamIn} />
        <Shape kind="circle" x={px - arm} y={py - 14 - 140 + slide(t, at.a, -820)} w={280} fill={RED} opacity={t >= at.a ? 1 : 0} />
        <Shape kind="square" x={px + arm} y={py - 14 - 130 + slide(t, at.b, -820)} w={260} fill={BLUE} opacity={t >= at.b ? 1 : 0} />
      </g>
      <g opacity={t >= Math.max(at.a, at.b) ? 1 : 0}>
        <circle cx={px} cy={420} r={58 * enter(t, Math.max(at.a, at.b) + fr(6))} fill={YELLOW} />
        <Txt x={px} y={438} size={50} weight={800} anchor="middle" opacity={t >= Math.max(at.a, at.b) + fr(9) ? 1 : 0}>
          vs
        </Txt>
      </g>
      {label(a, px - arm, at.a, "a")}
      {label(b, px + arm, at.b, "b")}
    </Stage>
  );
};

// ---------- Quote / callout: a quote mark built from circles and quarters, a black spine and the words set in lowercase ----------
export const QuoteSlab: FC<{ text: string; by: string; at?: number; keyWords?: string[] }> = ({ text, by, at = 0, keyWords = [] }) => {
  const { t } = useTime();
  const words = text.split(" ");
  const wordAt = (i: number) => at + 0.45 + i * fr(2);
  const end = wordAt(words.length) + 0.1;
  const keys = new Set(keyWords.map((k) => k.toLowerCase()));
  return (
    <AbsoluteFill>
      <Stage>
        <Shape kind="bar" x={204} y={540} w={16} h={520} fill={BLACK} oy={-260} sy={ramp(t, at, fr(14), EXPO)} />
        {[0, 1].map((k) => (
          <g key={k}>
            <Shape kind="circle" x={300 + k * 104} y={330} w={84} fill={RED} scale={enter(t, at + 0.1 + k * fr(3))} />
            <Shape kind="quarter" x={300 + k * 104 + 21} y={330 + 63} w={42} h={42} fill={RED} rot={detents(t, [[0, -90], [at + 0.2 + k * fr(3), 0]])} scale={enter(t, at + 0.15 + k * fr(3))} ox={-21} oy={-21} />
          </g>
        ))}
        <Shape kind="quarter" x={1920 - 200} y={1080 - 200} w={400} fill={BLUE} rot={-90} ox={-200} oy={200} scale={enter(t, at + 0.2, fr(18))} />
        <Shape kind="circle" x={1650} y={1080 - 400 - 40} w={70} fill={YELLOW} scale={enter(t, end)} />
      </Stage>
      <div style={{ position: "absolute", left: 470, top: 286, width: 1180, display: "flex", flexDirection: "column", gap: 44 }}>
        <div style={{ fontFamily: GEO, fontWeight: 600, fontSize: 64, lineHeight: 1.2, letterSpacing: "-0.015em", color: BLACK, display: "flex", flexWrap: "wrap", columnGap: "0.27em" }}>
          {words.map((w, i) => {
            const key = keys.has(w.toLowerCase().replace(/[^a-z0-9']/g, ""));
            return (
              <span key={i} style={{ display: "inline-block", opacity: t >= wordAt(i) ? 1 : 0, transform: `translateY(${slide(t, wordAt(i), 28)}px)`, color: key ? RED : BLACK }}>
                {w.toLowerCase()}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: t >= end ? 1 : 0, transform: `translateX(${slide(t, end, -40)}px)` }}>
          <div style={{ width: 64, height: RULE, background: BLACK }} />
          <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 32, color: BLACK }}>{by}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Source label / lower third: a black stamp block with a red dot, the name sliding out of its slot over a black rule ----------
export const SourceRule: FC<{ name: string; detail?: string; tag?: string; at?: number; y?: number }> = ({ name, detail, tag = "source", at = 0, y = 892 }) => {
  const { t } = useTime();
  const len = Math.max(name.length * 48 * 0.56, (detail?.length ?? 0) * 30 * 0.62, 280) + 40;
  return (
    <Stage>
      <defs>
        <clipPath id="sr-slot">
          <rect x={198} y={y - 120} width={len + 40} height={200} />
        </clipPath>
      </defs>
      <Shape kind="square" x={150 + slide(t, at, -160)} y={y - 12} w={72} fill={BLACK} opacity={t >= at ? 1 : 0} rot={detents(t, [[0, 90], [at + fr(6), 0]])} />
      <Shape kind="circle" x={150} y={y - 12} w={40} fill={RED} scale={enter(t, at + fr(8))} />
      <Shape kind="bar" x={210 + len / 2} y={y + 20} w={len} h={RULE} fill={BLACK} ox={-len / 2} oy={0} sx={ramp(t, at + fr(6), fr(12), EXPO)} />
      <g clipPath="url(#sr-slot)">
        <Txt x={210 - slide(t, at + fr(10), len)} y={y - 52} size={28} mono fill={RED} weight={700}>
          {tag}
        </Txt>
        <Txt x={210 - slide(t, at + fr(12), len)} y={y} size={48} weight={700}>
          {name}
        </Txt>
        {detail && (
          <Txt x={210 - slide(t, at + fr(16), len)} y={y + 68} size={30} mono>
            {detail}
          </Txt>
        )}
      </g>
    </Stage>
  );
};
