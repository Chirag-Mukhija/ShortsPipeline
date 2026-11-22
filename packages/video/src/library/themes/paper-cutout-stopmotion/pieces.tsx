// Narrated-explainer pieces in cut paper: title banner, word slips with a collage key word, strip list, layered number, versus, quote sheet, stitched flow, paper bars and tape labels.
import type { FC, ReactNode } from "react";
import { useTime } from "../../core/time";
import { FPS } from "../../core/video";
import { CORE, CREAM, HEAD, INK, MUSTARD, SERIF, SHADOW_RGB, STEP, TEAL, TEAL_DK, TOMATO, castShadow } from "./theme";
import { drop, mix, nudge, nudgeUp, poseAt, rng, slide, stepRamp, type Pose } from "./stop";
import { CutText, PaperFx, Piece, Print, Sheet, Tape, TapeBit, useFxId } from "./paper";
import { burst, cutCircle, cutRect, pathOf, type P } from "./shapes";
import { Icon, Rosette, Tick } from "./icons";

// An inline paper slip (a word or phrase cut out on its own), flowing in a row.
export const Slip: FC<{ children: ReactNode; color?: string; seed?: number; pose?: Partial<Pose>; z?: number; r?: number; pad?: string }> = ({ children, color = CREAM, seed = 1, pose = {}, z = 1, r = 0, pad = "0.12em 0.32em 0.16em" }) => {
  const id = useFxId();
  const { f } = useTime();
  const p = mix(pose);
  const n = nudge(f, seed, 0.6);
  const c = rng(seed * 3);
  const clip = `polygon(${[[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y]) => `${(x! + (c() - 0.5) * 3).toFixed(1)}% ${(y! + (c() - 0.5) * 10).toFixed(1)}%`).join(", ")})`;
  return (
    <span style={{ display: "inline-block", visibility: p.o > 0 ? "visible" : "hidden", transform: `translate(${p.dx + n.dx}px, ${p.dy + n.dy}px) rotate(${r + p.r + n.r}deg) scale(${p.s})`, filter: castShadow(z + p.lift * 3) }}>
      <PaperFx id={id} seed={seed} rough={1.4} />
      <span style={{ display: "inline-block", padding: pad, background: color, clipPath: clip, filter: `url(#${id})` }}>{children}</span>
    </span>
  );
};

// ---------- title / hook ----------
export type TitleCardProps = { lines: string[]; accent?: number; kicker?: string; sub?: string; at?: number; size?: number };

// Hook card: collage scraps land, a torn cream banner slides up in five exposures, tape pins it, then the headline drops on letter by letter.
export const TitleCard: FC<TitleCardProps> = ({ lines, accent = lines.length - 1, kicker, sub, at = 0, size = 150 }) => {
  const { t } = useTime();
  const y0 = 560 - ((lines.length - 1) * size * 1.06) / 2 - (sub ? 40 : 0);
  return (
    <>
      <Piece x={330} y={800} w={380} h={380} z={0} seed={41} pose={drop(t, at)}>
        <path d={pathOf(cutCircle(190, 190, 170, 41, 30))} fill={TEAL} />
      </Piece>
      <Sheet x={1560} y={300} w={460} h={120} sides="lr" color={MUSTARD} r={-14} z={0} seed={42} pose={drop(t, at + 0.1)} />
      <Piece x={1640} y={820} w={200} h={200} z={0} seed={43} r={12} pose={drop(t, at + 0.2)}>
        <path d={pathOf(burst(100, 100, 92, 62, 9, 43))} fill={TOMATO} />
      </Piece>
      <Sheet x={960} y={565} w={1440} h={500} sides="tb" amp={9} color={CREAM} r={-1.2} z={1} seed={44} pose={slide(t, at + 0.25, [0, 760], 5)} />
      <TapeBit x={300} y={330} r={-38} seed={45} at={at + 0.85} />
      <TapeBit x={1620} y={318} r={34} seed={46} at={at + 0.95} />
      {kicker && <Tape x={960} y={318} text={kicker} r={-2.5} seed={47} at={at + 1.05} />}
      {lines.map((line, i) => (
        <CutText key={i} text={line} x={960} y={y0 + i * size * 1.06} size={size} color={i === accent ? TOMATO : INK} seed={50 + i * 9} at={at + 1.2 + i * 0.5} tilt={4} z={1.2} />
      ))}
      {sub && (
        <div style={{ position: "absolute", left: 360, right: 360, top: y0 + lines.length * size * 1.06 - size * 0.28, textAlign: "center", opacity: t >= at + 1.4 + lines.length * 0.5 ? 1 : 0, transform: "rotate(-1.2deg)" }}>
          <Print size={46} font={SERIF} weight={400} align="center" color="#5a4a3a" style={{ fontStyle: "italic" }}>{sub}</Print>
        </div>
      )}
    </>
  );
};

// ---------- key word on the spoken word ----------
export type DropWord = { w: string; t: number; key?: boolean };

// Each word is its own slip placed as it's said; the key word arrives as tomato letters on cut tiles with a burst behind it, then jiggles.
export const WordDrop: FC<{ rows: DropWord[][]; y?: number; size?: number; keySize?: number; gap?: number }> = ({ rows, y = 540, size = 76, keySize = 180, gap = 40 }) => {
  const { t } = useTime();
  const heights = rows.map((r) => (r.some((w) => w.key) ? keySize * 1.35 : size * 1.6));
  const total = heights.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
  let top = y - total / 2;
  return (
    <>
      {rows.map((row, ri) => {
        const h = heights[ri]!;
        const cy = top + h / 2;
        top += h + gap;
        const key = row.find((w) => w.key);
        return (
          <div key={ri}>
            {key && (
              <Piece x={960} y={cy} w={keySize * 4.6} h={keySize * 2} z={0} seed={70 + ri} r={-4} pose={drop(t, key.t - 0.12)}>
                <path d={pathOf(burst(keySize * 2.3, keySize, keySize * 2.2, keySize * 1.25, 14, 70 + ri).map(([x, yy]) => [x, keySize + (yy - keySize) * 0.46] as P))} fill={MUSTARD} />
              </Piece>
            )}
            <div style={{ position: "absolute", left: 96, right: 96, top: cy, transform: "translateY(-50%)", display: "flex", justifyContent: "center", alignItems: "center", gap: size * 0.3, fontFamily: HEAD, fontWeight: 600, fontSize: size, lineHeight: 1, color: INK }}>
              {row.map((w, i) =>
                w.key ? (
                  <CutText key={i} inline text={w.w} x={0} y={0} size={keySize} color={TOMATO} tiles={[CORE, CREAM]} weight={700} seed={80 + ri * 7} at={w.t} per={1 / FPS} tilt={7} emphAt={w.t + 0.45} spacing={0.04} />
                ) : (
                  <Slip key={i} seed={90 + ri * 11 + i} r={(rng(ri * 5 + i)() - 0.5) * 6} pose={drop(t, w.t)}>{w.w}</Slip>
                ),
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- list / steps ----------
export type StripItem = { text: string; t: number; done?: number };
const DISC = [TOMATO, TEAL, MUSTARD, TEAL_DK];

// Strip list: each item is a strip of paper slid on from the left with a cut number disc; a paper tick is dropped on when it's done.
export const StripList: FC<{ items: StripItem[]; title?: string; titleAt?: number; y0?: number; step?: number; w?: number }> = ({ items, title, titleAt = 0, y0 = 340, step = 150, w = 1120 }) => {
  const { t } = useTime();
  const x = 960;
  return (
    <>
      {title && <CutText text={title} x={960} y={190} size={96} seed={101} at={titleAt} tilt={3.5} />}
      {items.map((it, i) => {
        const y = y0 + i * step;
        const pose = slide(t, it.t, [-1500, 0], 5);
        return (
          <div key={i}>
            <Sheet x={x + 30} y={y} w={w} h={108} sides="r" amp={6} color={i % 2 ? CORE : CREAM} seed={110 + i} r={(i % 2 ? 0.8 : -0.6)} z={1} pose={pose}
              print={<Print size={54} weight={500} style={{ paddingLeft: 120, height: "100%", display: "flex", alignItems: "center" }}>{it.text}</Print>} />
            <Piece x={x - w / 2 + 40} y={y} w={124} h={124} z={2} seed={120 + i} pose={pose}
              print={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 60, color: CORE, paddingBottom: 4 }}>{i + 1}</div>}>
              <path d={pathOf(cutCircle(62, 62, 54, 120 + i, 18))} fill={DISC[i % DISC.length]} />
            </Piece>
            {it.done !== undefined && (
              <Icon x={x + w / 2 - 40} y={y - 10} size={120} z={2} seed={130 + i} r={-6} pose={drop(t, it.done)}>
                <Tick seed={130 + i} />
              </Icon>
            )}
          </div>
        );
      })}
    </>
  );
};

// ---------- big number ----------
// Layered number: three paper copies stacked like a paper sculpture; counting up is replacement animation, a freshly cut set of digits every hold.
export const LayeredNumber: FC<{ value: number; at?: number; dur?: number; prefix?: string; suffix?: string; label?: string; kicker?: string; x?: number; y?: number; size?: number }> = ({ value, at = 0, dur = 1.2, prefix = "", suffix = "", label, kicker, x = 960, y = 470, size = 380 }) => {
  const { t } = useTime();
  const u = stepRamp(t, at, dur, STEP);
  const shown = Math.round(value * u);
  const text = `${prefix}${shown}${suffix}`;
  // Every replacement is cut fresh (new tilts); once settled it keeps one cut.
  const seed = u < 1 ? 200 + shown : 333;
  const layers: [string, number, number][] = [[TEAL, 26, 0], [TOMATO, 13, 0.6], [CREAM, 0, 1.4]];
  const settle = poseAt(t, at + dur, 3, STEP);
  return (
    <>
      {kicker && <Tape x={x} y={y - size * 0.72} text={kicker} r={2} seed={211} at={at - 0.3} />}
      {layers.map(([c, off, z], i) => (
        <CutText key={i} text={text} x={x + off} y={y + off} size={size} weight={700} color={c} seed={seed} tilt={3} z={z} at={at} per={0} spacing={0.01}
          pose={settle === 0 && i === 2 ? { s: 1.06, dy: -6, lift: 0.5 } : {}} />
      ))}
      {label && (
        <Sheet x={x} y={y + size * 0.78} w={Math.min(1500, label.length * 30 + 120)} h={104} sides="lr" amp={7} color={INK} seed={212} r={-1} z={1} grain={0.45} pose={drop(t, at + dur + 0.2)}
          print={<Print size={54} weight={500} color={CREAM} align="center" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</Print>} />
      )}
    </>
  );
};

// ---------- comparison ----------
export type Side = { title: string; lines: string[]; icon: ReactNode; color: string };

// Versus: two torn sheets slid in from either side, a cut sunburst slaps down between them, and a prize rosette is pinned on the winner.
export const Versus: FC<{ left: Side; right: Side; at?: number; vsAt?: number; winner?: "left" | "right"; winAt?: number }> = ({ left, right, at = 0, vsAt = at + 1.2, winner, winAt = vsAt + 1 }) => {
  const { t } = useTime();
  const card = (s: Side, i: number) => {
    const cx = i ? 1430 : 490;
    const pose = slide(t, at + i * 0.35, [i ? 1100 : -1100, 0], 5);
    const lift = winner && (winner === "left") === (i === 0) && t >= winAt ? { lift: 0.35 } : {};
    const p = mix(pose, lift);
    return (
      <div key={i}>
        <Sheet x={cx} y={575} w={700} h={600} sides={i ? "tr" : "tl"} amp={8} color={CREAM} seed={300 + i} r={i ? 2 : -2.5} z={1} pose={p}
          print={
            <div style={{ position: "absolute", left: 70, right: 50, top: 410 }}>
              {s.lines.map((l, k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 22 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: s.color, flex: "none" }} />
                  <Print size={44}>{l}</Print>
                </div>
              ))}
            </div>
          } />
        <Sheet x={cx} y={575 - 300 + 290} w={560} h={104} sides="lr" amp={6} color={s.color} seed={310 + i} r={i ? -1.5 : 1.5} z={1.6} pose={p}
          print={<Print size={72} weight={600} color={CORE} align="center" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.title}</Print>} />
        <Icon x={cx} y={385} size={210} z={1.8} seed={320 + i} r={i ? 4 : -4} pose={p}>{s.icon}</Icon>
      </div>
    );
  };
  return (
    <>
      {card(left, 0)}
      {card(right, 1)}
      <Piece x={960} y={560} w={250} h={250} z={2.2} seed={330} r={8} pose={mix(drop(t, vsAt), nudgeUp(t, vsAt + 0.35))}
        print={<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HEAD, fontWeight: 700, fontSize: 92, color: INK, transform: "rotate(-8deg)" }}>VS</div>}>
        <path d={pathOf(burst(125, 125, 118, 88, 13, 330))} fill={MUSTARD} />
      </Piece>
      {winner && (
        <Icon x={winner === "right" ? 1730 : 210} y={300} size={190} z={2.6} seed={340} r={10} pose={mix(drop(t, winAt), nudgeUp(t, winAt + 0.3))}>
          <Rosette seed={340} />
        </Icon>
      )}
    </>
  );
};

// ---------- quote / callout ----------
export type QuotePart = string | { hi: string; at: number };

// Quote sheet: a printed cream page taped to the board, a big cut tomato quote mark, and a mustard paper strip slipped under the key phrase on its word.
export const QuoteSheet: FC<{ quote: QuotePart[]; by?: string; at?: number; size?: number }> = ({ quote, by, at = 0, size = 66 }) => {
  const { t } = useTime();
  const pose = slide(t, at, [0, 900], 5);
  return (
    <>
      <Sheet x={960} y={540} w={1320} h={600} sides="tb" amp={8} color={CREAM} seed={400} r={-1} z={1} pose={pose}
        print={
          <div style={{ position: "absolute", left: 170, right: 110, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
            <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.22, color: INK }}>
              {quote.map((q, i) =>
                typeof q === "string" ? (
                  <span key={i}>{q}</span>
                ) : (
                  <span key={i} style={{ position: "relative", whiteSpace: "nowrap", display: "inline-block" }}>
                    <HiStrip at={q.at} seed={410 + i} />
                    <span style={{ position: "relative" }}>{q.hi}</span>
                  </span>
                ),
              )}
            </div>
          </div>
        } />
      <TapeBit x={330} y={262} r={-30} seed={402} at={at + 0.6} />
      <TapeBit x={1590} y={258} r={28} seed={403} at={at + 0.7} />
      <CutText text="“" x={330} y={360} size={360} font={SERIF} weight={400} color={TOMATO} seed={404} at={at + 0.85} tilt={6} z={2} />
      {by && <Tape x={1540} y={850} text={by} r={-2} seed={405} anchor="right" at={at + 1.1} />}
    </>
  );
};

// A strip of mustard paper slid under a phrase: placed in three exposures, slightly crooked.
const HiStrip: FC<{ at: number; seed: number }> = ({ at, seed }) => {
  const id = useFxId();
  const { t } = useTime();
  const i = poseAt(t, at, 3, STEP);
  if (i < 0) return null;
  const w = [0.55, 0.9, 1][i]!;
  return (
    <span style={{ position: "absolute", left: "-0.12em", bottom: "0.02em", height: "0.62em", width: `calc(${w * 100}% + 0.24em)`, transform: "rotate(-1.2deg)", filter: castShadow(0) }}>
      <PaperFx id={id} seed={seed} rough={1.6} />
      <span style={{ position: "absolute", inset: 0, background: MUSTARD, filter: `url(#${id})`, clipPath: "polygon(0 8%, 100% 0, 99% 100%, 1% 92%)" }} />
    </span>
  );
};

// ---------- flow / diagram ----------
export type FlowNode = { x: number; y: number; label: string; icon: ReactNode; t: number };

// Points along a quadratic sag between two nodes, sampled evenly enough to lay stitches on.
const sagCurve = (a: P, b: P, sag: number, n = 60): P[] => {
  const c: P = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag];
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]] as P;
  });
};

// StitchLine: running stitches of tomato thread sewn from one point to the next, a needle leading, one stitch per hold.
export const StitchLine: FC<{ from: P; to: P; at: number; dur?: number; sag?: number; color?: string }> = ({ from, to, at, dur = 0.8, sag = 50, color = TOMATO }) => {
  const { t } = useTime();
  const pts = sagCurve(from, to, sag);
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const len = seg[seg.length - 1]!;
  const at01 = (s: number): [P, number] => {
    const i = Math.max(1, seg.findIndex((v) => v >= s));
    const a = pts[i - 1]!;
    const b = pts[i] ?? a;
    const k = (s - seg[i - 1]!) / Math.max(1e-6, seg[i]! - seg[i - 1]!);
    return [[a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], Math.atan2(b[1] - a[1], b[0] - a[0])];
  };
  const L = 26;
  const G = 16;
  const count = Math.floor(len / (L + G));
  const shown = Math.floor(count * stepRamp(t, at, dur, 2) + 1e-6);
  if (t < at) return null;
  const head = shown < count ? at01(Math.min(len, shown * (L + G) + 8)) : null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {Array.from({ length: count }, (_, i) => {
        const [p0] = at01(i * (L + G));
        const [p1] = at01(i * (L + G) + L);
        const [h] = at01(i * (L + G) + L + G / 2);
        return (
          <g key={i}>
            <circle cx={h[0]} cy={h[1]} r={2.6} fill="#5a3c1c" opacity={0.55} />
            {i < shown && <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={color} strokeWidth={6} strokeLinecap="round" style={{ filter: `drop-shadow(1px 2px 0.6px rgba(${SHADOW_RGB},0.35))` }} />}
          </g>
        );
      })}
      {head && (
        <g transform={`translate(${head[0][0]} ${head[0][1] - 30}) rotate(${(head[1] * 180) / Math.PI - 18})`} style={{ filter: `drop-shadow(3px 6px 2px rgba(${SHADOW_RGB},0.3))` }}>
          <path d="M -110 0 L 10 -7 L 36 0 L 10 7 Z" fill="#9aa3ab" stroke="#5f6870" strokeWidth={1.5} />
          <path d="M -104 -2 L 10 -5 L 30 -1" fill="none" stroke="#eef1f4" strokeWidth={2} />
          <ellipse cx={-90} cy={0} rx={9} ry={2.6} fill="#4a3a2a" />
          <path d="M -90 0 Q -70 44 -20 50" fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

// Stitched flow: cut-paper discs holding collage icons, sewn together in order, each captioned on tape.
export const StitchFlow: FC<{ nodes: FlowNode[]; title?: string; titleAt?: number; r?: number }> = ({ nodes, title, titleAt = 0, r = 125 }) => {
  const { t } = useTime();
  return (
    <>
      {title && <CutText text={title} x={960} y={180} size={92} seed={501} at={titleAt} tilt={3.5} />}
      {nodes.slice(1).map((n, i) => {
        const a = nodes[i]!;
        return <StitchLine key={i} from={[a.x + r + 8, a.y + 10]} to={[n.x - r - 8, n.y + 10]} at={n.t - 0.95} dur={0.8} />;
      })}
      {nodes.map((n, i) => (
        <div key={i}>
          <Piece x={n.x} y={n.y} w={r * 2 + 20} h={r * 2 + 20} z={1} seed={510 + i} pose={drop(t, n.t)}>
            <path d={pathOf(cutCircle(r + 10, r + 10, r, 510 + i, 30))} fill={[CREAM, CORE][i % 2]} />
          </Piece>
          <Icon x={n.x} y={n.y} size={170} z={1.6} seed={520 + i} r={(i % 2 ? 5 : -5)} pose={drop(t, n.t + 0.15)}>{n.icon}</Icon>
          <Tape x={n.x} y={n.y + r + 62} text={n.label} r={(i % 2 ? 2 : -2.5)} seed={530 + i} at={n.t + 0.3} size={34} />
        </div>
      ))}
    </>
  );
};

// ---------- chart ----------
export type PaperBar = { label: string; value: number };

// Paper bars: strips pushed up from behind a torn ground strip in held steps, values pinned on tape once each one stops.
export const PaperBars: FC<{ bars: PaperBar[]; max: number; hi?: number; at?: number; per?: number; title?: string; note?: string }> = ({ bars, max, hi = -1, at = 0, per = 0.3, title, note }) => {
  const { t } = useTime();
  const ground = 830;
  const H = 470;
  const bw = 150;
  const gap = (1400 - bw * bars.length) / (bars.length - 1);
  return (
    <>
      {title && <CutText text={title} x={960} y={175} size={84} seed={601} at={at - 0.6} tilt={3} />}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: ground + 90, overflow: "hidden" }}>
      {bars.map((b, i) => {
        const x = 260 + bw / 2 + i * (bw + gap);
        const h = (b.value / max) * H;
        const u = stepRamp(t, at + i * per, 0.6, STEP);
        const top = ground - h * u;
        const done = u >= 1;
        return (
          <div key={i}>
            <Piece x={x} y={ground + h / 2 - h * u + 20} w={bw + 16} h={h + 60} z={1} seed={610 + i} r={(rng(i + 3)() - 0.5) * 2.5}>
              <path d={pathOf(cutRect(8, 8, bw, h + 40, 610 + i, 2.5))} fill={i === hi ? TOMATO : i % 2 ? CORE : CREAM} />
            </Piece>
            {done && <Tape x={x} y={top - 34} text={String(b.value)} size={36} r={(i % 2 ? 3 : -3)} seed={620 + i} at={at + i * per + 0.6} />}
          </div>
        );
      })}
      </div>
      <Sheet x={960} y={ground + 60} w={1560} h={120} sides="t" amp={8} color={TEAL_DK} seed={630} z={2} still
        print={
          <div style={{ position: "absolute", left: 260 - 180, top: 22, display: "flex", gap: 0 }}>
            {bars.map((b, i) => (
              <div key={i} style={{ position: "absolute", left: i * (bw + gap) + bw / 2, transform: "translateX(-50%)", fontFamily: HEAD, fontWeight: 500, fontSize: 42, color: CORE, whiteSpace: "nowrap" }}>{b.label}</div>
            ))}
          </div>
        } />
      {note && <Tape x={1820} y={990} text={note} size={28} r={-1.5} seed={640} anchor="right" at={at} />}
    </>
  );
};

// ---------- lower third / source ----------
// Lower third: a torn tomato strip with the name slid in from the left, the role on a strip of tape beneath.
export const LowerThird: FC<{ name: string; role?: string; at?: number; x?: number; y?: number }> = ({ name, role, at = 0, x = 120, y = 840 }) => {
  const { t } = useTime();
  const w = name.length * 38 + 120;
  return (
    <>
      <Sheet x={x + w / 2} y={y} w={w} h={112} sides="r" amp={8} color={TOMATO} seed={700} r={-1.5} z={1.4} pose={slide(t, at, [-w - 200, 0], 5)}
        print={<Print size={66} weight={600} color={CORE} style={{ height: "100%", display: "flex", alignItems: "center", paddingLeft: 48 }}>{name}</Print>} />
      {role && <Tape x={x + 40} y={y + 92} text={role} r={-1} seed={701} anchor="left" at={at + 0.6} size={30} />}
    </>
  );
};

// Source label: a typed strip of tape stuck in a corner, with a smaller strip for the detail.
export const SourceTape: FC<{ source: string; detail?: string; at?: number; x?: number; y?: number }> = ({ source, detail, at = 0, x = 1824, y = 900 }) => (
  <>
    <Tape x={x} y={y} text={`Source · ${source}`} size={30} r={1.5} seed={710} anchor="right" at={at} />
    {detail && <Tape x={x - 20} y={y + 70} text={detail} size={28} r={-1} seed={711} anchor="right" at={at + 0.25} color="rgba(243,233,210,0.92)" />}
  </>
);

