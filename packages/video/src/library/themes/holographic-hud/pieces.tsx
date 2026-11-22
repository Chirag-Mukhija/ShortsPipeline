// Holographic HUD pieces for narrated beats: projected title, keyword lock, card deck, stat ring, versus scan, transmission quote, source tag and chapter card.
import type { FC } from "react";
import { FPS } from "../../core/video";
import { INOUT, ramp, useTime } from "../../core/time";
import { ALERT, HEAD, HOLO, INK, LABEL_STYLE, MONO, MUTED, OK, TONE, chroma, glowText, rgba, shadows, type Tone } from "./theme";
import { EXPO, IN, collapse, flash, flickerIn, group, noise, roll, typeEnd } from "./motion";
import { DataChip, Emitter, HoloCard, Label, Readouts, RingGauge, ScrambleText, headStyle, type ReadoutRow } from "./primitives";

const T = (frames: number) => frames / FPS;
// Dark text for solid cyan / green / red tags.
const BG_ON = "#04131A";

// ---------- title / hook ----------

export type TitleProjectionProps = { kicker: string; code?: string; lines: string[]; accent?: string; meta?: { k: string; v: string }[]; at: number; out?: number };

// The hook card: a floor projector powers up, throws a cone of light, and the title card materialises inside the beam, typing its lines on.
export const TitleProjection: FC<TitleProjectionProps> = ({ kicker, code = "01", lines, accent, meta = [], at, out }) => {
  const { t } = useTime();
  const on = ramp(t, at, 0.35, EXPO) * (1 - (out === undefined ? 0 : ramp(t, out + 0.3, 0.3)));
  const cardAt = at + 0.3;
  const lineAt = (i: number) => cardAt + 0.75 + i * 0.45;
  const size = lines.some((l) => l.length > 22) ? 92 : 108;
  const h = 250 + lines.length * size * 1.08;
  return (
    <>
      <Emitter x={960} y={985} w={560} top={560} topW={1240} on={on} seed={4} />
      <HoloCard x={960} y={490} w={1300} h={h} at={cardAt} out={out} rx={7} glow seed={3} pad={56}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: MONO, fontSize: 30, color: HOLO }}>{code}</span>
          <span style={{ width: 48, height: 2, background: HOLO }} />
          <ScrambleText text={kicker} at={cardAt + 0.55} cps={45} seed={7} style={{ ...LABEL_STYLE, fontSize: 34, color: HOLO }} />
        </div>
        <div style={{ marginTop: 22 }}>
          {lines.map((l, i) => (
            <div key={i} style={headStyle(size, 0.9)}>
              <ScrambleText text={l} at={lineAt(i)} cps={32} seed={11 + i} accent={accent && l.includes(accent) ? accent : undefined} cursor={i === lines.length - 1} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 56 + 10, bottom: 40, display: "flex", gap: 16 }}>
          {meta.map((m, i) => (
            <DataChip key={i} k={m.k} v={m.v} at={typeEnd(lines[lines.length - 1] ?? "", lineAt(lines.length - 1), 32) + 0.15 + i * 0.12} seed={20 + i} />
          ))}
        </div>
      </HoloCard>
    </>
  );
};

// ---------- keyword lock ----------

export type LockWord = { w: string; t: number; key?: boolean; dim?: boolean };

const Bracket: FC<{ corner: 0 | 1 | 2 | 3; color: string; L?: number }> = ({ corner, color, L = 36 }) => {
  const right = corner === 1 || corner === 2;
  const bottom = corner >= 2;
  return (
    <span
      style={{
        position: "absolute",
        [right ? "right" : "left"]: 0,
        [bottom ? "bottom" : "top"]: 0,
        width: L,
        height: L,
        borderColor: color,
        borderStyle: "solid",
        borderWidth: `${bottom ? 0 : 4}px ${right ? 4 : 0}px ${bottom ? 4 : 0}px ${right ? 0 : 4}px`,
      }}
    />
  );
};

// A claim builds word by word on the spoken words; the key word lands bigger, a bounding box pinches in around it like an iris, then a red/cyan flash and a tag lock it.
export const KeywordLock: FC<{ lines: LockWord[][]; size?: number; keySize?: number; tag?: string; y?: number }> = ({ lines, size = 92, keySize = 190, tag = "Key term", y = 540 }) => {
  const { t } = useTime();
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: "0.28em", alignItems: "baseline", fontSize: line.some((w) => w.key) ? keySize : size }}>
          {line.map((w, wi) => {
            const seed = li * 31 + wi * 7 + 1;
            if (!w.key) return <ScrambleText key={wi} text={w.w} at={w.t - T(3)} cps={70} seed={seed} style={{ ...headStyle(size, 0.6, w.dim ? MUTED : INK), fontWeight: w.dim ? 500 : 600 }} />;
            const lockAt = w.t + T(4);
            const e = ramp(t, lockAt, T(12), INOUT);
            const fl = flash(t, lockAt + T(12), 5);
            const inset = -(22 + (1 - e) * 110);
            return (
              <span key={wi} style={{ position: "relative", display: "inline-block", padding: "0 0.06em" }}>
                <span style={{ position: "absolute", inset: `${inset * 0.6}px ${inset}px`, background: rgba(HOLO, 0.07 * e), opacity: t >= lockAt ? flickerIn(t, lockAt, seed, 4) : 0 }}>
                  {([0, 1, 2, 3] as const).map((c) => (
                    <Bracket key={c} corner={c} color={fl > 0 && Math.floor(t * FPS) % 2 ? ALERT : HOLO} L={30 + e * 16} />
                  ))}
                  <span style={{ position: "absolute", left: "100%", top: "50%", marginLeft: 26, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start", opacity: ramp(t, lockAt + T(14), T(6)), whiteSpace: "nowrap" }}>
                    <span style={{ ...LABEL_STYLE, fontSize: 30, color: BG_ON, background: HOLO, padding: "4px 10px" }}>{tag}</span>
                    <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED }}>{`@ ${w.t.toFixed(2)}s`}</span>
                  </span>
                </span>
                <ScrambleText text={w.w} at={w.t - T(3)} cps={50} seed={seed} style={{ ...headStyle(keySize, 1 + fl * 9, HOLO), textShadow: shadows(chroma(1 + fl * 9), glowText(HOLO, 1.4)), display: "inline-block", transform: `scale(${1 + 0.05 * fl})` }} />
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
// ---------- card deck (list / steps) ----------

export type DeckStep = { title: string; sub?: string; t: number };

// A list as a deck of holo cards: each step pops out of the vanishing point into its slot as it's named; the live card glows, finished ones step back.
export const CardDeck: FC<{ steps: DeckStep[]; heading?: string; kicker?: string; headingAt?: number; focus?: boolean; w?: number; cardH?: number }> = ({ steps, heading, kicker, headingAt = 0, focus = true, w = 1080, cardH = 132 }) => {
  const { t } = useTime();
  const gap = 26;
  const head = heading ? 150 : 0;
  const total = steps.length * cardH + (steps.length - 1) * gap + head;
  const top = 540 - total / 2 + head;
  const cx = 1010;
  const live = steps.reduce((k, s, i) => (t >= s.t ? i : k), -1);
  const railX = cx - w / 2 - 70;
  const y = (i: number) => top + i * (cardH + gap) + cardH / 2;
  const rail = live < 0 ? 0 : ramp(t, steps[live]!.t, 0.4, EXPO);
  return (
    <>
      {heading && (
        <div style={{ position: "absolute", left: cx - w / 2, top: top - head, opacity: flickerIn(t, headingAt, 2, 5) }}>
          {kicker && <ScrambleText text={kicker} at={headingAt} cps={45} seed={3} style={{ ...LABEL_STYLE, fontSize: 32, color: HOLO, display: "block", marginBottom: 12 }} />}
          <div style={headStyle(68)}>
            <ScrambleText text={heading} at={headingAt + 0.15} cps={40} seed={4} />
          </div>
        </div>
      )}
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <line x1={railX} y1={y(0)} x2={railX} y2={y(steps.length - 1)} stroke={rgba(HOLO, 0.25)} strokeWidth={2} strokeDasharray="4 8" />
        {live >= 0 && <line x1={railX} y1={y(0)} x2={railX} y2={y(Math.max(0, live - 1)) + (y(live) - y(Math.max(0, live - 1))) * rail} stroke={HOLO} strokeWidth={3} />}
        {steps.map((s, i) => (
          <g key={i} opacity={t >= s.t ? 1 : 0.35}>
            <circle cx={railX} cy={y(i)} r={i === live ? 11 : 7} fill={t >= s.t ? (i === live || !focus ? HOLO : rgba(HOLO, 0.6)) : "none"} stroke={HOLO} strokeWidth={2} />
            {i === live && <circle cx={railX} cy={y(i)} r={11 + ((t * 30) % 20)} fill="none" stroke={HOLO} strokeWidth={1.5} opacity={1 - ((t * 30) % 20) / 20} />}
          </g>
        ))}
      </svg>
      {steps.map((s, i) => {
        const done = focus && i < live;
        const isLive = i === live;
        return (
          <HoloCard key={i} x={cx} y={y(i)} w={w} h={cardH} at={s.t - T(4)} ry={-7} rx={2} depth={900} fly={[960 - cx, 420 - y(i)]} dim={done ? 0.75 : 0} glow={isLive} lock={isLive ? ramp(t, s.t + 0.3, 0.2) : 0} seed={i + 2} pad={0} notch={20}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 30, padding: "0 40px 0 34px" }}>
              <span style={{ fontFamily: MONO, fontWeight: 300, fontSize: 72, color: isLive ? HOLO : MUTED, width: 100, textShadow: isLive ? glowText(HOLO, 0.8) : "none" }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ width: 2, alignSelf: "stretch", margin: "26px 0", background: rgba(HOLO, 0.35) }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <ScrambleText text={s.title} at={s.t + 0.1} cps={45} seed={i * 9 + 1} style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 48, color: INK }} />
                {s.sub && <ScrambleText text={s.sub} at={s.t + 0.3} cps={60} seed={i * 9 + 4} style={{ ...LABEL_STYLE, letterSpacing: "0.06em", textTransform: "none", fontWeight: 600, fontSize: 32, color: MUTED }} />}
              </div>
              <span style={{ ...LABEL_STYLE, fontSize: 28, color: isLive ? HOLO : done ? OK : MUTED, border: `1.5px solid ${isLive ? HOLO : done ? rgba(OK, 0.6) : rgba(MUTED, 0.4)}`, padding: "6px 12px" }}>{isLive ? "Now" : done ? "Done" : "Next"}</span>
            </div>
          </HoloCard>
        );
      })}
    </>
  );
};

// ---------- big number ----------

export type StatRingProps = { value: number; decimals?: number; prefix?: string; suffix?: string; label: string; context?: string; fill: number; at: number; rows?: ReadoutRow[]; panelTitle?: string; tone?: Tone };

// The big number: rings spin up, the value rolls through scrambled digits and lands with a punch and a red/cyan flash; the context line and readouts follow.
export const StatRing: FC<StatRingProps> = ({ value, decimals = 0, prefix = "", suffix = "", label, context, fill, at, rows, panelTitle = "Breakdown", tone = "holo" }) => {
  const { t } = useTime();
  const col = TONE[tone];
  const dur = 1.2;
  const r = roll(t, at + 0.2, value, dur, decimals, 5);
  const settle = at + 0.2 + dur;
  const fl = flash(t, settle, 5);
  const text = `${prefix}${group(r.text)}${suffix}`;
  const size = Math.min(170, 470 / (text.length * 0.64));
  const cx = rows ? 640 : 960;
  const ringSize = 620;
  const panelX = 1350;
  const leader = ramp(t, settle + 0.2, 0.4, EXPO);
  return (
    <>
      <div style={{ position: "absolute", left: cx - ringSize / 2, top: 520 - ringSize / 2 }}>
        <RingGauge size={ringSize} value={fill} at={at} dur={dur + 0.2} tone={tone}>
          <Label size={30} color={col} style={{ opacity: flickerIn(t, at + 0.15, 4, 4), marginBottom: 8 }}>{label}</Label>
          <div style={{ fontFamily: MONO, fontWeight: 300, fontSize: size, lineHeight: 1, color: INK, fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.07 * fl})`, textShadow: shadows(chroma(0.8 + fl * 8), glowText(col, 0.9)), opacity: t >= at + 0.2 ? 1 : 0 }}>{text}</div>
        </RingGauge>
      </div>
      {context && (
        <div style={{ position: "absolute", left: cx - 500, width: 1000, top: 520 + ringSize / 2 + 30, textAlign: "center", ...headStyle(46, 0.6) }}>
          <ScrambleText text={context} at={settle + T(8)} cps={40} seed={9} />
        </div>
      )}
      {rows && (
        <>
          <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
            <path d={`M ${cx + ringSize / 2 - 10} 520 H ${cx + ringSize / 2 + 50} L ${panelX - 290} 400 H ${panelX - 250}`} fill="none" stroke={col} strokeWidth={2} pathLength={1} strokeDasharray={`${leader} 1`} />
            {leader > 0.98 && <circle cx={panelX - 250} cy={400} r={6} fill={col} />}
          </svg>
          <HoloCard x={panelX} y={520} w={500} h={rows.length * 96 + 120} at={settle + 0.35} ry={-10} title={panelTitle} code="02" seed={6}>
            <Readouts rows={rows} width={432} size={38} />
          </HoloCard>
        </>
      )}
    </>
  );
};

// ---------- comparison ----------

export type VsSide = { name: string; tag: string; rows: { label: string; value: string; score: number }[] };

// A vs B as two panels angled toward each other; a scan beam sweeps both, the rows fill in, then the verdict snaps the winner's brackets in and greys the other side.
export const VersusScan: FC<{ a: VsSide; b: VsSide; at: number; verdictAt: number; winner: "a" | "b" }> = ({ a, b, at, verdictAt, winner }) => {
  const { t } = useTime();
  const decided = t >= verdictAt;
  const beam = ramp(t, at + 0.5, 1.0, INOUT);
  const beamX = 180 + beam * 1560;
  const side = (s: VsSide, k: 0 | 1) => {
    const isWin = (winner === "a") === (k === 0);
    const x = k === 0 ? 560 : 1360;
    const tone: Tone = decided ? (isWin ? "ok" : "alert") : "holo";
    const col = TONE[tone];
    const rowsAt = at + 0.6 + k * 0.5;
    return (
      <HoloCard x={x} y={560} w={640} h={600} at={at + k * 0.18} ry={k === 0 ? 14 : -14} tone={tone} dim={decided && !isWin ? ramp(t, verdictAt, 0.3) * 0.7 : 0} lock={decided && isWin ? ramp(t, verdictAt, T(8), EXPO) : 0} glow={decided && isWin} seed={k + 8} title={s.tag} code={k === 0 ? "A" : "B"}>
        <div style={headStyle(68, 0.7)}>
          <ScrambleText text={s.name} at={at + 0.35 + k * 0.18} cps={30} seed={k * 5 + 2} />
        </div>
        <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 26 }}>
          {s.rows.map((r, i) => {
            const ra = rowsAt + i * 0.22;
            const lit = Math.round(r.score * 16 * ramp(t, ra + 0.1, 0.6, EXPO));
            return (
              <div key={i} style={{ opacity: flickerIn(t, ra, k * 10 + i, 4) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ ...LABEL_STYLE, fontSize: 30, color: MUTED }}>{r.label}</span>
                  <ScrambleText text={r.value} at={ra + 0.08} cps={40} seed={k * 20 + i} style={{ fontFamily: MONO, fontWeight: 500, fontSize: 36, color: INK }} />
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                  {Array.from({ length: 16 }, (_, j) => (
                    <span key={j} style={{ flex: 1, height: 10, background: j < lit ? col : rgba(col, 0.12) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {decided && (
          <span style={{ position: "absolute", right: 30, bottom: 28, ...LABEL_STYLE, fontSize: 30, color: BG_ON, background: col, padding: "6px 14px", opacity: flickerIn(t, verdictAt + T(4), k + 3, 5) }}>{isWin ? "Selected" : "Rejected"}</span>
        )}
      </HoloCard>
    );
  };
  const vsIn = ramp(t, at + 0.3, 0.4, EXPO);
  return (
    <>
      {side(a, 0)}
      {side(b, 1)}
      <div style={{ position: "absolute", left: 960 - 1, top: 300, width: 2, height: 520, background: `linear-gradient(180deg, transparent, ${rgba(HOLO, 0.6)}, transparent)`, transform: `scaleY(${vsIn})` }} />
      <div style={{ position: "absolute", left: 960 - 56, top: 560 - 56, width: 112, height: 112, transform: `rotate(45deg) scale(${vsIn})`, border: `2px solid ${HOLO}`, background: "rgba(4,7,13,0.85)" }} />
      <div style={{ position: "absolute", left: 960 - 80, top: 560 - 30, width: 160, textAlign: "center", ...headStyle(48, 1), opacity: vsIn }}>VS</div>
      {beam > 0 && beam < 1 && (
        <div style={{ position: "absolute", left: beamX - 2, top: 220, width: 4, height: 680, background: INK, boxShadow: `0 0 24px 6px ${rgba(HOLO, 0.7)}`, opacity: Math.sin(beam * Math.PI) }} />
      )}
    </>
  );
};

// ---------- quote ----------

// A quote as an intercepted transmission: the line types on beside a live waveform that talks while it types and settles after.
export const Transmission: FC<{ quote: string; by: string; role?: string; source?: string; at: number; channel?: string }> = ({ quote, by, role, source, at, channel = "CH-04" }) => {
  const { t, f } = useTime();
  const qAt = at + 0.7;
  const end = typeEnd(quote, qAt, 42);
  const talking = t >= qAt && t <= end ? 1 : Math.max(0.12, 1 - ramp(t, end, 0.6));
  const bars = 44;
  const lines = Math.ceil(quote.length / 38);
  const h = 320 + lines * 70;
  return (
    <HoloCard x={960} y={540} w={quote.length < 50 ? 1240 : 1360} h={h} at={at} rx={4} title="Incoming transmission" code={channel} seed={12} pad={52}>
      <div style={{ display: "flex", gap: 34 }}>
        <span style={{ width: 4, alignSelf: "stretch", background: HOLO, boxShadow: glowText(HOLO), transform: `scaleY(${ramp(t, qAt - 0.1, 0.4, EXPO)})`, transformOrigin: "top" }} />
        <div style={{ flex: 1, ...headStyle(54, 0.6), lineHeight: 1.22, fontWeight: 500 }}>
          <ScrambleText text={`“${quote}”`} at={qAt} cps={42} seed={14} cursor />
        </div>
      </div>
      <div style={{ position: "absolute", left: 52 + 38, right: 52, bottom: 36, display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ opacity: ramp(t, end + 0.1, 0.3), display: "flex", flexDirection: "column", gap: 6, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 38, color: INK }}>{by}</span>
          {role && <span style={{ ...LABEL_STYLE, letterSpacing: "0.08em", fontSize: 28, color: MUTED }}>{role}</span>}
        </div>
        <span style={{ flex: 1 }} />
        <svg width={bars * 7} height={56} style={{ opacity: ramp(t, at + 0.5, 0.3) }}>
          {Array.from({ length: bars }, (_, i) => {
            const a = 0.15 + 0.85 * noise(i + 3, Math.floor(f / 2)) * talking * (0.6 + 0.4 * Math.sin(i * 0.35 + t * 3));
            const hh = 4 + a * 50;
            return <rect key={i} x={i * 7} y={28 - hh / 2} width={4} height={hh} fill={i / bars < 0.5 ? HOLO : rgba(HOLO, 0.55)} />;
          })}
        </svg>
        {source && <span style={{ fontFamily: MONO, fontSize: 28, color: MUTED, whiteSpace: "nowrap", opacity: ramp(t, end + 0.3, 0.3) }}>{source}</span>}
      </div>
    </HoloCard>
  );
};

// ---------- lower third / source ----------

// A source label: a hairline stands up, the tag unfolds sideways from it with a barcode tail, and on exit it folds back to the line and blinks out as a dot.
export const SourceTag: FC<{ kind?: string; title: string; meta?: string; at: number; out?: number; x?: number; y?: number }> = ({ kind = "Source", title, meta, at, out, x = 96, y = 880 }) => {
  const { t } = useTime();
  if (t < at) return null;
  const line = ramp(t, at, T(8), EXPO);
  const open = ramp(t, at + T(6), T(14), EXPO);
  const c = collapse(t, out);
  if (c.gone) return null;
  const fold = out === undefined ? 1 : 1 - ramp(t, out, T(8), IN);
  const lineK = out === undefined ? 1 : 1 - ramp(t, out + T(8), T(6), IN);
  const hgt = 132;
  return (
    <div style={{ position: "absolute", left: x, top: y - hgt / 2, height: hgt, display: "flex", alignItems: "stretch" }}>
      <span style={{ width: 4, background: HOLO, boxShadow: `0 0 12px ${rgba(HOLO, 0.8)}`, transform: `scaleY(${line * lineK})`, transformOrigin: "center" }} />
      <div
        style={{
          transform: `scaleX(${open * fold})`,
          transformOrigin: "left",
          display: "flex",
          alignItems: "center",
          gap: 30,
          padding: "0 34px 0 28px",
          background: `linear-gradient(90deg, ${rgba(HOLO, 0.16)}, ${rgba(HOLO, 0.06)})`,
          borderTop: `1px solid ${rgba(HOLO, 0.55)}`,
          borderBottom: `1px solid ${rgba(HOLO, 0.55)}`,
          clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Label size={28} color={HOLO}>{kind}</Label>
            <span style={{ fontFamily: MONO, fontSize: 28, color: rgba(HOLO, 0.7) }}>{`#${(Math.floor(noise(title.length) * 9000) + 1000).toString(16).toUpperCase()}`}</span>
          </span>
          <ScrambleText text={title} at={at + T(14)} cps={45} seed={title.length} style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 44, color: INK }} />
          {meta && <ScrambleText text={meta} at={at + T(22)} cps={60} seed={7} style={{ fontFamily: MONO, fontSize: 28, color: MUTED }} />}
        </div>
        <svg width={90} height={84} style={{ opacity: ramp(t, at + 0.6, 0.2) }}>
          {Array.from({ length: 18 }, (_, i) => (
            <rect key={i} x={i * 5} y={0} width={noise(i + title.length, 1) > 0.5 ? 3 : 1.5} height={84} fill={rgba(HOLO, 0.6)} />
          ))}
        </svg>
      </div>
      {c.dot > 0 && <span style={{ position: "absolute", left: -4, top: hgt / 2 - 6, width: 12, height: 12, borderRadius: 12, background: INK, opacity: c.dot, boxShadow: `0 0 16px 6px ${rgba(HOLO, 0.8)}` }} />}
    </div>
  );
};

// ---------- chapter ----------

// A chapter card: index in light mono, the chapter name, and a progress tick row showing where in the video we are.
export const ChapterCard: FC<{ index: number; of: number; name: string; at: number; out?: number; tone?: Tone }> = ({ index, of, name, at, out, tone = "holo" }) => {
  const { t } = useTime();
  const col = TONE[tone];
  return (
    <HoloCard x={960} y={520} w={1100} h={380} at={at} out={out} rx={5} ry={-6} glow tone={tone} seed={index + 30} pad={56}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <span style={{ fontFamily: MONO, fontWeight: 300, fontSize: 120, lineHeight: 1, color: col, textShadow: glowText(col, 0.8) }}>{String(index).padStart(2, "0")}</span>
        <Label size={32} color={MUTED}>{`Chapter / ${String(of).padStart(2, "0")}`}</Label>
      </div>
      <div style={{ ...headStyle(84), marginTop: 18 }}>
        <ScrambleText text={name} at={at + 0.6} cps={30} seed={index * 3} />
      </div>
      <div style={{ position: "absolute", left: 56 + 10, right: 56, bottom: 44, display: "flex", gap: 10 }}>
        {Array.from({ length: of }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 8, background: i < index ? col : rgba(col, 0.15), opacity: flickerIn(t, at + 0.5 + i * 0.05, i, 3) }} />
        ))}
      </div>
    </HoloCard>
  );
};

