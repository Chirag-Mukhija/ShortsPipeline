// Isometric narrative pieces: diorama title card, block-letter key word, rising steps, stat tower, district comparison, quote from an object, block bar chart and source plate.
import type { FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { FPS } from "../../core/video";
import { useTime } from "../../core/time";
import { ACCENT, BLUE, CARD, HEAD, INK, LABEL, MONO, RULE, SIGNAL, SUB, TONES, type ToneName } from "./theme";
import { boxGeo, bob, ease, lPath, proj, pts, stagger, type WP } from "./iso";
import { Faces, IsoBlock, IsoLabel, IsoPipe, IsoWorld, PacketDot, TilePulse } from "./primitives";
import { IsoBuilding, IsoDatabase, IsoLaptop, IsoPlate, IsoRack, OnFloor } from "./objects";
import { BlockWord, Kicker, WordsUp, extrude, riseStyle, type Word } from "./type";

const OUTC = Easing.out(Easing.cubic);

// ---------- title card ----------
// The default diorama: a tiny system on a 6×6 plate (laptop → server → rack → database) with packets looping.
export const MiniCity: FC<{ at: number }> = ({ at }) => {
  const s = (gx: number, gy: number) => stagger(at + 0.25, gx, gy);
  const pk = { count: 2, speed: 5, start: at + 1.2, tone: "coral" as ToneName };
  return (
    <IsoPlate gx={0} gy={0} w={6} d={6} at={at}>
      <IsoPipe path={[[1.3, 3.9], [1.3, 2.6]]} at={at + 0.7} packets={pk} />
      <IsoPipe path={[[2.6, 1.3], [3.9, 1.3]]} at={at + 0.8} packets={{ ...pk, tone: "mint" }} />
      <IsoPipe path={[[4.5, 1.9], [4.5, 3.7]]} at={at + 0.9} packets={pk} />
      <IsoBuilding gx={0.4} gy={0.4} w={2} d={2} floors={4} at={s(0, 0)} seed={7} />
      <IsoRack gx={4} gy={0.7} units={5} at={s(4, 0)} ledSeed={4} />
      <IsoLaptop gx={0.6} gy={4.1} at={s(0, 4)} />
      <IsoDatabase cx={4.5} cy={4.4} r={0.65} h={1.2} at={s(4, 4)} />
    </IsoPlate>
  );
};

// Title / hook: mono kicker, a Space Grotesk headline rising line by line, a quiet sub, and a floating diorama that assembles beside it.
export const IsoTitle: FC<{ kicker: string; lines: (string | { text: string; accent?: boolean })[]; sub?: string; at?: number; island?: ReactNode }> = ({ kicker, lines, sub, at = 0.2, island }) => {
  const { t } = useTime();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 250, width: 820, display: "flex", flexDirection: "column", gap: 26 }}>
        <Kicker text={kicker} at={at} />
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 104, lineHeight: 1.02, letterSpacing: -3, color: INK }}>
          {lines.map((l, i) => {
            const L = typeof l === "string" ? { text: l } : l;
            return (
              <div key={i} style={{ ...riseStyle(t, at + 0.25 + (i * 4) / FPS, 40), color: L.accent ? ACCENT : INK }}>
                {L.text}
              </div>
            );
          })}
        </div>
        {sub && <div style={{ ...riseStyle(t, at + 0.75), fontFamily: LABEL, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: SUB, maxWidth: 760 }}>{sub}</div>}
      </div>
      <AbsoluteFill style={{ transform: `translateY(${bob(t)}px)` }}>
        <IsoWorld view={{ u: 78, ox: 1380, oy: 600, cx: 3, cy: 3 }}>{island ?? <MiniCity at={at + 0.3} />}</IsoWorld>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- key word ----------
// The claim line pops word by word; the key word lands in extruded block letters and a pipe underline races a packet across.
export const IsoKeyWord: FC<{ lead: Word[]; word: string; at: number; size?: number; color?: string; side?: string }> = ({ lead, word, at, size = 230, color = ACCENT, side = "#C24A2D" }) => {
  const { t } = useTime();
  const bar = ease(t, at + 0.35, 0.5, OUTC);
  const run = ease(t, at + 0.55, 0.7, Easing.inOut(Easing.quad));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <WordsUp words={lead} size={76} color={INK} style={{ justifyContent: "center", marginBottom: 34 }} />
      <BlockWord text={word} at={at} size={size} color={color} side={side} />
      <div style={{ position: "relative", width: 900, height: 40, marginTop: 40 }}>
        <div style={{ position: "absolute", left: 450 - 450 * bar, width: 900 * bar, top: 12, height: 22, borderRadius: 11, background: "#9DB0DC" }} />
        <div style={{ position: "absolute", left: 450 - 450 * bar, width: 900 * bar, top: 6, height: 22, borderRadius: 11, background: "#E4EDFF", boxShadow: "inset 0 0 0 2px #C1D0F1" }} />
        {run > 0 && run < 1 && <div style={{ position: "absolute", left: 20 + run * 840, top: 4, width: 24, height: 24, background: SIGNAL, borderRadius: 5, transform: "rotate(45deg)", boxShadow: `-18px 18px 0 -4px rgba(34,211,166,0.35), -34px 34px 0 -8px rgba(34,211,166,0.18)` }} />}
      </div>
    </AbsoluteFill>
  );
};

// ---------- steps ----------
// Platforms that climb left to right; each rises, lifts and glows when its step is named while a packet runs in from the last one.
export const IsoSteps: FC<{ steps: { label: string; tag?: string; t: number }[]; title?: string; titleAt?: number }> = ({ steps, title, titleAt = 0 }) => {
  const { t } = useTime();
  const n = steps.length;
  const gap = n <= 3 ? 4.2 : 3.3;
  const pos = steps.map((_, i) => {
    const k = (i - (n - 1) / 2) * gap;
    return [k, -k] as WP;
  });
  const H = (i: number) => 0.45 + i * 0.42;
  const fp = 1.6;
  const labelY = 430;
  const oy = 720;
  const u = 70;
  return (
    <AbsoluteFill>
      {title && (
        <div style={{ position: "absolute", left: 140, top: 120, ...riseStyle(t, titleAt) }}>
          <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: 72, color: INK, letterSpacing: -2 }}>{title}</div>
        </div>
      )}
      <IsoWorld view={{ u, ox: 960, oy, cx: 0, cy: 0 }}>
        {pos.slice(1).map((p, i) => {
          const a = pos[i]!;
          const path = lPath(a, p);
          return (
            <g key={`p${i}`}>
              <IsoPipe path={path} at={steps[i + 1]!.t - 0.7} />
              <PacketDot path={path} z={0.08} start={steps[i + 1]!.t - 0.55} speed={10} tone="coral" />
            </g>
          );
        })}
        {pos.map(([x, y], i) => {
          const s = steps[i]!;
          const next = steps[i + 1]?.t ?? Infinity;
          const act = ease(t, s.t, 0.3) * (1 - ease(t, next, 0.3));
          const done = ease(t, next, 0.3);
          return (
            <g key={i}>
              <TilePulse gx={x - fp / 2} gy={y - fp / 2} w={fp} d={fp} at={s.t} until={next} />
              <IsoBlock
                gx={x - fp / 2} gy={y - fp / 2} w={fp} d={fp} h={H(i)}
                tone={i === n - 1 ? "blue" : "white"} at={s.t - 0.12} lift={act} glow={act}
                deco={() => (
                  <OnFloor x={x - fp / 2} y={y - fp / 2} z={H(i)}>
                    <g transform={`translate(${fp / 2} ${fp / 2}) rotate(-90) scale(0.01)`}>
                      <text x={0} y={30} textAnchor="middle" fontFamily={HEAD} fontWeight={700} fontSize={92} fill={i === n - 1 ? "#FFFFFF" : act > 0.5 ? ACCENT : "#7F92C4"}>
                        {String(i + 1).padStart(2, "0")}
                      </text>
                    </g>
                  </OnFloor>
                )}
              />
              <IsoLabel x={x} y={y} z={H(i)} text={s.label} tag={s.tag} at={s.t} lift={oy - H(i) * u - labelY} accent={act > 0.5} led={done > 0.5 ? SIGNAL : act > 0.5 ? ACCENT : BLUE} />
            </g>
          );
        })}
      </IsoWorld>
    </AbsoluteFill>
  );
};

// ---------- stat ----------
// A big extruded number counting up beside a tower of slabs that stack as it counts; a label and source follow.
export const IsoStat: FC<{ value: number; at: number; dur?: number; format?: (n: number) => string; label: string; note?: string; slabs?: number }> = ({ value, at, dur = 1.3, format = (n) => Math.round(n).toLocaleString("en-US"), label, note, slabs = 7 }) => {
  const { t } = useTime();
  const k = ease(t, at, dur, Easing.out(Easing.exp));
  const punch = 1 + 0.06 * Math.sin(Math.PI * ease(t, at + dur, 0.18, Easing.linear));
  const landT = (i: number) => at + (i / slabs) * dur * 0.75;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 140, top: 300, width: 980 }}>
        <div style={{ transform: `scale(${punch})`, transformOrigin: "0% 60%", ...riseStyle(t, at - 0.2, 20) }}>
          <BlockWordStatic text={format(t >= at + dur ? value : value * k)} size={230} />
        </div>
        <div style={{ ...riseStyle(t, at + 0.4), fontFamily: LABEL, fontWeight: 700, fontSize: 52, color: INK, marginTop: 36 }}>{label}</div>
        {note && <div style={{ ...riseStyle(t, at + 0.65), fontFamily: MONO, fontWeight: 500, fontSize: 30, color: SUB, marginTop: 14 }}>{note}</div>}
      </div>
      <IsoWorld view={{ u: 100, ox: 1400, oy: 720, cx: 1.6, cy: 1.6 }}>
        <IsoPlate gx={0} gy={0} w={3.2} d={3.2} at={at - 0.4} grid={false}>
          <TilePulse gx={0.5} gy={0.5} w={2.2} d={2.2} at={at + dur} pad={0.1} color={BLUE} />
          {Array.from({ length: slabs }, (_, i) => {
            const fall = ease(t, landT(i), 0.32, Easing.out(Easing.back(1.5)));
            if (fall <= 0) return null;
            const last = i === slabs - 1;
            return (
              <g key={i} transform={`translate(0 ${-(1 - fall) * 160})`} opacity={Math.min(1, fall * 3)}>
                <IsoBlock gx={0.5} gy={0.5} w={2.2} d={2.2} z={i * 0.36} h={0.3} tone={last ? "coral" : i % 2 ? "sky" : "white"} shadow={i === 0} />
              </g>
            );
          })}
        </IsoPlate>
      </IsoWorld>
    </AbsoluteFill>
  );
};
// Block letters without the per-letter rise, for counters whose digits change every frame.
const BlockWordStatic: FC<{ text: string; size: number }> = ({ text, size }) => (
  <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.03, color: INK, fontVariantNumeric: "tabular-nums", textShadow: extrude("#9DB0DC", Math.round(size / 15)), whiteSpace: "nowrap" }}>{text}</div>
);

// ---------- versus ----------
export type Side = { title: string; note?: string; children: ReactNode };
// Two districts on their own plates, a diamond VS between them; at the verdict the winner lifts and glows and the other greys back.
export const IsoVersus: FC<{ left: Side; right: Side; at: { left: number; right: number; verdict?: number }; winner?: "left" | "right" }> = ({ left, right, at, winner = "right" }) => {
  const { t } = useTime();
  const verdict = at.verdict === undefined ? 0 : ease(t, at.verdict, 0.4);
  const side = (s: Side, which: "left" | "right", x: number, a: number) => {
    const win = which === winner;
    const dim = win ? 1 : 1 - 0.55 * verdict;
    return (
      <>
        <div style={{ position: "absolute", left: x - 400, width: 800, top: 140, textAlign: "center", opacity: dim, ...riseStyle(t, a) }}>
          <div style={{ display: "inline-block", fontFamily: HEAD, fontWeight: 700, fontSize: 68, color: INK, letterSpacing: -2, position: "relative" }}>
            {s.title}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 8, borderRadius: 4, background: ACCENT, transform: `scaleX(${win ? verdict : 0})`, transformOrigin: "0 50%" }} />
          </div>
        </div>
        {s.note && <div style={{ position: "absolute", left: x - 400, width: 800, top: 880, textAlign: "center", fontFamily: MONO, fontWeight: 500, fontSize: 32, color: SUB, opacity: dim, ...riseStyle(t, a + 0.6) }}>{s.note}</div>}
      </>
    );
  };
  const world = (s: Side, which: "left" | "right", ox: number, a: number) => {
    const win = which === winner;
    return (
      <IsoWorld view={{ u: 64, ox, oy: 600, cx: 2.5, cy: 2.5 }} opacity={win ? 1 : 1 - 0.55 * verdict}>
        <g transform={`translate(0 ${win ? -14 * verdict : 0})`} style={win && verdict > 0 ? { filter: `drop-shadow(0 0 ${22 * verdict}px rgba(255,122,89,${0.45 * verdict}))` } : undefined}>
          <IsoPlate gx={0} gy={0} w={5} d={5} at={a}>{s.children}</IsoPlate>
        </g>
      </IsoWorld>
    );
  };
  const vs = ease(t, Math.min(at.left, at.right) + 0.3, 0.4, Easing.out(Easing.back(1.8)));
  return (
    <AbsoluteFill>
      {world(left, "left", 520, at.left)}
      {world(right, "right", 1400, at.right)}
      {side(left, "left", 520, at.left)}
      {side(right, "right", 1400, at.right)}
      <div style={{ position: "absolute", left: 960 - 56, top: 560 - 56, width: 112, height: 112, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${vs})` }}>
        <div style={{ position: "absolute", inset: 14, background: INK, borderRadius: 14, transform: "rotate(45deg)", boxShadow: "8px 12px 0 -2px #9DB0DC" }} />
        <div style={{ position: "relative", fontFamily: MONO, fontWeight: 600, fontSize: 34, color: "#FFFFFF" }}>VS</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- quote ----------
// A quote card fed by its source: a line draws out of an object on the grid, a packet carries the words over, then the card lands.
export const IsoQuote: FC<{ lines: string[]; by: string; role?: string; at: number; speaker?: ReactNode; width?: number }> = ({ lines, by, role, at, speaker, width = 1100 }) => {
  const { t } = useTime();
  const card = ease(t, at + 0.55, 0.45, Easing.out(Easing.back(1.3)));
  const mark = ease(t, at + 0.75, 0.4, Easing.out(Easing.back(2)));
  const link = ease(t, at + 0.2, 0.5);
  const A: WP = [1520, 560];
  const B: WP = [140 + width + 22, 420];
  return (
    <AbsoluteFill>
      <IsoWorld view={{ u: 74, ox: 1520, oy: 760, cx: 1.75, cy: 1.75 }}>
        <IsoPlate gx={0} gy={0} w={3.5} d={3.5} at={at - 0.3} grid>
          {speaker ?? <IsoBuilding gx={0.75} gy={0.75} w={2} d={2} floors={3} style="flat" tone="white" at={at - 0.15} seed={21} />}
        </IsoPlate>
        <Leader pts={[A, [A[0], B[1]], B]} p={link} />
      </IsoWorld>
      <div style={{ position: "absolute", left: 140, top: 200, width, opacity: card, transform: `translateY(${(1 - card) * 30}px) scale(${0.96 + 0.04 * card})`, transformOrigin: "100% 60%" }}>
        <div style={{ background: CARD, border: `2px solid ${RULE}`, borderRadius: 22, padding: "70px 64px 52px 64px", boxShadow: "14px 16px 0 -2px #C1D0F1, 0 24px 50px rgba(27,35,64,0.14)" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ ...riseStyle(t, at + 0.75 + i * 0.12, 16), fontFamily: HEAD, fontWeight: 500, fontSize: 62, lineHeight: 1.18, color: INK, letterSpacing: -1 }}>{l}</div>
          ))}
          <div style={{ ...riseStyle(t, at + 1.1 + lines.length * 0.12), display: "flex", alignItems: "center", gap: 16, marginTop: 36 }}>
            <span style={{ width: 14, height: 14, background: ACCENT, borderRadius: 3, transform: "rotate(45deg)" }} />
            <span style={{ fontFamily: LABEL, fontWeight: 800, fontSize: 36, color: INK }}>{by}</span>
            {role && <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 30, color: SUB }}>{role}</span>}
          </div>
        </div>
        <div style={{ position: "absolute", left: 48, top: -96, fontFamily: HEAD, fontWeight: 700, fontSize: 220, lineHeight: 1, color: ACCENT, textShadow: extrude("#C24A2D", 12), transform: `translateY(${(1 - mark) * 30}px)`, opacity: Math.min(1, mark * 2) }}>“</div>
      </div>
    </AbsoluteFill>
  );
};

// A dotted leader that draws along a screen polyline, with a ring at its root.
const Leader: FC<{ pts: WP[]; p: number }> = ({ pts: P, p }) => {
  if (p <= 0) return null;
  const segs = P.slice(1).map((b, i) => Math.hypot(b[0] - P[i]![0], b[1] - P[i]![1]));
  let rest = p * segs.reduce((a, b) => a + b, 0);
  const out: WP[] = [P[0]!];
  for (let i = 0; i < segs.length && rest > 0; i++) {
    const a = P[i]!;
    const b = P[i + 1]!;
    const q = Math.min(1, rest / segs[i]!);
    out.push([a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q]);
    rest -= segs[i]!;
  }
  return (
    <g>
      <polyline points={pts(out)} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={P[0]![0]} cy={P[0]![1]} r={7} fill={CARD} stroke={INK} strokeWidth={2.5} />
    </g>
  );
};

// ---------- bar chart ----------
// Bars as blocks on their own tiles, growing in turn; values count above, one highlighted bar in coral.
export const IsoBars: FC<{ data: { label: string; value: number }[]; at: number; highlight?: number; max?: number; unit?: string; title?: string }> = ({ data, at, highlight, max, unit = "", title }) => {
  const { t } = useTime();
  const n = data.length;
  const top = max ?? Math.max(...data.map((d) => d.value));
  const u = 64;
  const gap = 230 / (2 * 0.866 * u);
  const oy = 800;
  const fp = 1.3;
  const maxH = 4.6;
  return (
    <AbsoluteFill>
      {title && <div style={{ position: "absolute", left: 140, top: 120, fontFamily: HEAD, fontWeight: 700, fontSize: 68, color: INK, letterSpacing: -2, ...riseStyle(t, at - 0.3) }}>{title}</div>}
      <IsoWorld view={{ u, ox: 960, oy, cx: 0, cy: 0 }}>
        {data.map((d, i) => {
          const k = (i - (n - 1) / 2) * gap;
          const x = k - fp / 2;
          const y = -k - fp / 2;
          const a = at + i * 0.12;
          const g = ease(t, a, 0.8, OUTC);
          const h = Math.max(0.02, (d.value / top) * maxH * g);
          const hi = i === highlight;
          const [lx, ly] = proj({ u, ox: 960, oy, cx: 0, cy: 0, rot: 0, gz: 0 }, k, -k, h);
          const tile = boxGeo({ u, ox: 960, oy, cx: 0, cy: 0, rot: 0, gz: 0 }, x - 0.2, y - 0.2, 0, fp + 0.4, fp + 0.4, 0.1, TONES.white);
          return (
            <g key={i} opacity={ease(t, a - 0.1, 0.2)}>
              <Faces geo={tile} tone={TONES.white} />
              {hi && <TilePulse gx={x} gy={y} w={fp} d={fp} z={0.1} at={a + 0.8} pad={0.15} />}
              <IsoBlock gx={x} gy={y} w={fp} d={fp} z={0.1} h={h} tone={hi ? "coral" : "sky"} shadow={false} />
              <text x={lx} y={ly - 58} textAnchor="middle" fontFamily={MONO} fontWeight={600} fontSize={36} fill={hi ? ACCENT : INK} opacity={g}>
                {Math.round(d.value * g).toLocaleString("en-US")}{unit}
              </text>
              <text x={proj({ u, ox: 960, oy, cx: 0, cy: 0, rot: 0, gz: 0 }, k, -k, 0)[0]} y={oy + 112} textAnchor="middle" fontFamily={LABEL} fontWeight={700} fontSize={32} fill={hi ? INK : SUB}>
                {d.label}
              </text>
            </g>
          );
        })}
      </IsoWorld>
    </AbsoluteFill>
  );
};

// ---------- source plate ----------
// Lower third: a little LED cube rises on its tile, then a card wipes out of it with a mono SOURCE kicker.
export const SourcePlate: FC<{ title: string; meta?: string; at: number; out?: number; kicker?: string }> = ({ title, meta, at, out, kicker = "SOURCE" }) => {
  const { t, f } = useTime();
  const wipe = ease(t, at + 0.25, 0.4, OUTC);
  const gone = out === undefined ? 0 : ease(t, out, 0.3, Easing.in(Easing.cubic));
  const led = Math.floor(f / 12) % 3 !== 0;
  return (
    <AbsoluteFill style={{ opacity: 1 - gone }}>
      <IsoWorld view={{ u: 56, ox: 196, oy: 930, cx: 0.5, cy: 0.5 }}>
        <IsoBlock gx={-0.15} gy={-0.15} w={1.3} d={1.3} h={0.12} tone="white" at={at} />
        <IsoBlock gx={0.1} gy={0.1} w={0.8} d={0.8} z={0.12} h={0.8} tone="blue" at={at + 0.05} shadow={false} out={out}
          deco={(geo, v) => {
            const s = geo.sides.find((x) => x.k < 0.5);
            if (!s) return null;
            const q = proj(v, s.a[0] + (s.b[0] - s.a[0]) * 0.3, s.a[1] + (s.b[1] - s.a[1]) * 0.3, 0.6);
            return <circle cx={q[0]} cy={q[1]} r={6} fill={led ? SIGNAL : "#2B3762"} />;
          }}
        />
      </IsoWorld>
      <div style={{ position: "absolute", left: 270, bottom: 96, clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}>
        <div style={{ background: CARD, border: `2px solid ${RULE}`, borderLeft: `8px solid ${BLUE}`, borderRadius: 14, padding: "16px 30px 18px 26px", boxShadow: "0 14px 30px rgba(27,35,64,0.14)" }}>
          <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 28, letterSpacing: 4, color: BLUE }}>{kicker}</div>
          <div style={{ fontFamily: LABEL, fontWeight: 800, fontSize: 40, color: INK, marginTop: 4, whiteSpace: "nowrap" }}>{title}</div>
          {meta && <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: SUB, marginTop: 4, whiteSpace: "nowrap" }}>{meta}</div>}
        </div>
      </div>
    </AbsoluteFill>
  );
};
