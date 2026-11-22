// Clay explainer pieces: hook title, key word on a slab, step trays, ring stat, A vs B with a deflating loser, talking quote buddy, pillar chart and lower thirds.
import type { CSSProperties, FC, ReactNode } from "react";
import { Easing, interpolate, spring } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { FPS } from "../../core/video";
import { ClayScene, clayFill, clayFilter, Slab, Thing } from "./clay";
import { bob, bodyTransform, drop, jelly, pop, type Body } from "./motion";
import { ClayIcon, type IconName } from "./icons";
import { Buddy, ClayCoin, ClayCube, ClayRing, Label } from "./shapes";
import { Chip, Puffy, PuffyWords, extrude, puffyStyle, PuffyDefs, type ClayWord } from "./type";
import { BUTTER, CREAM, INK, INK_SOFT, LILAC, LILAC_D, MINT, PINK, PUTTY, ROUND, STONE, mix } from "./theme";

const abs = (x: number, y: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: x, top: y, ...extra });

// Centre a block on (x, y) with an animated body; pivots on its base like everything clay.
export const Centered: FC<{ x: number; y: number; body?: Body; wobble?: number; origin?: string; children: ReactNode }> = ({ x, y, body, wobble = 0, origin = "50% 100%", children }) => (
  <div style={abs(x, y, { transform: "translate(-50%, -50%)" })}>
    <div style={{ transformOrigin: origin, transform: body ? bodyTransform(body, wobble) : `scale(${1 + wobble}, ${1 - wobble})`, opacity: body?.o ?? 1 }}>{children}</div>
  </div>
);

// Hook / title card: a kicker chip, then up to two lines of puffy words that each land on their spoken word,
// with four small clay shapes dropping in around it and floating.
export const HookTitle: FC<{ kicker?: { text: string; at: number; color?: string }; lines: ClayWord[][]; size?: number; y?: number; satellites?: boolean }> = ({ kicker, lines, size = 150, y = 540, satellites = true }) => {
  const { t } = useTime();
  const lh = size * 1.18;
  const top = y - ((lines.length - 1) * lh) / 2 + (kicker ? 50 : 0);
  const last = Math.max(...lines.flat().map((w) => w.t));
  const sats = [
    { x: 300, y: 330, el: <Slab w={110} h={110} r={55} color={BUTTER} floor />, w: 110, d: 0.1 },
    { x: 1640, y: 300, el: <Slab w={150} h={70} r={35} color={MINT} floor style={{ transform: "rotate(-14deg)" }} />, w: 150, d: 0.25 },
    { x: 1600, y: 800, el: <ClayCube size={130} color={LILAC} floor />, w: 130, d: 0.4 },
    { x: 330, y: 790, el: <ClayRing size={120} color={PINK} floor />, w: 120, d: 0.55 },
  ];
  return (
    <ClayScene>
      {satellites &&
        sats.map((s, i) => {
          const b = drop(t, last + s.d, { h: 300 });
          return (
            <Thing key={i} x={s.x} y={s.y + bob(t, i * 1.7) * (t > last + s.d + 0.8 ? 1 : 0)} w={s.w} h={s.w} body={b}>
              {s.el}
            </Thing>
          );
        })}
      {kicker && (
        <Centered x={960} y={top - lh * 0.5 - 40} body={pop(t, kicker.at)}>
          <Chip label={kicker.text} color={kicker.color ?? LILAC} size={32} />
        </Centered>
      )}
      {lines.map((ln, i) => (
        <PuffyWords key={i} words={ln} size={size} y={top + i * lh} />
      ))}
    </ClayScene>
  );
};

// The claim with its key word on a clay slab: a quiet lead line, then the key word drops onto the beat and wobbles on emphasis.
export const KeyWord: FC<{ lead?: ClayWord[]; before?: ClayWord[]; word: string; at: number; wobbleAt?: number; color?: string; size?: number; y?: number }> = ({ lead, before = [], word, at, wobbleAt, color = PINK, size = 140, y = 600 }) => {
  const { t } = useTime();
  const b = drop(t, at, { h: 380, fall: 0.35 });
  // Fredoka averages ~0.55 em per character; the gap between words is 0.26 em.
  const bw = before.reduce((a, w) => a + w.w.length * size * 0.55, 0) + (before.length - 1) * size * 0.26;
  return (
    <ClayScene>
      {lead && <PuffyWords words={lead.map((w) => ({ ...w, color: w.color ?? INK_SOFT }))} size={78} y={y - size * 1.25} />}
      <div style={abs(0, y - size * 0.75, { width: 1920, display: "flex", justifyContent: "center", alignItems: "center", gap: size * 0.3 })}>
        {before.length > 0 && (
          <div style={{ position: "relative", width: bw, height: size * 1.3 }}>
            <PuffyWords words={before} size={size} x={bw / 2} y={size * 0.7} />
          </div>
        )}
        <div style={{ transformOrigin: "50% 100%", transform: bodyTransform(b, wobbleAt !== undefined ? jelly(t, wobbleAt, 0.1) : 0), opacity: b.o }}>
          <div style={{ display: "inline-flex", alignItems: "center", padding: `${size * 0.1}px ${size * 0.36}px ${size * 0.16}px`, borderRadius: size * 0.5, background: clayFill(color), filter: clayFilter("l") }}>
            <Puffy text={word} size={size} color={INK} />
          </div>
        </div>
      </div>
    </ClayScene>
  );
};

export type Step = { title: string; note?: string; t: number };
const STEP_CLAYS = [BUTTER, MINT, LILAC, PINK];

// Steps on clay trays: each numbered coin drops into its tray on the step's word, the title slides in after it.
export const StepTrays: FC<{ steps: Step[]; x?: number; y?: number; w?: number; gap?: number }> = ({ steps, x = 960, y = 540, w = 1160, gap = 200 }) => {
  const { t } = useTime();
  const h = 156;
  const y0 = y - ((steps.length - 1) * gap) / 2;
  return (
    <ClayScene>
      {steps.map((s, i) => {
        const cy = y0 + i * gap;
        const tray = pop(t, s.t - 0.35, { squash: 0.5 });
        const coin = drop(t, s.t, { h: 340, fall: 0.35 });
        const slide = spring({ frame: (t - s.t - 0.08) * FPS, fps: FPS, config: { stiffness: 170, damping: 15 } });
        const left = x - w / 2;
        return (
          <div key={i}>
            <div style={abs(left, cy - h / 2, { transformOrigin: "10% 50%", transform: `scale(${tray.sx}, ${tray.sy})`, opacity: tray.o })}>
              <Slab w={w} h={h} r={h / 2} color={PUTTY} size="l" />
            </div>
            <div style={abs(left + 26, cy - 60, { width: 120, height: 134 })}>
              <div style={{ transformOrigin: "50% 100%", transform: bodyTransform(coin), opacity: coin.o }}>
                <ClayCoin size={120} color={STEP_CLAYS[i % STEP_CLAYS.length]!} label={i + 1} />
              </div>
            </div>
            <div style={abs(left + 190, cy - (s.note ? 58 : 34), { opacity: clamp01(slide * 2), transform: `translateX(${(1 - slide) * -50}px)` })}>
              <div style={{ fontFamily: ROUND, fontWeight: 600, fontSize: 54, color: INK, lineHeight: 1.1, whiteSpace: "nowrap" }}>{s.title}</div>
              {s.note && <div style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 36, color: INK_SOFT, marginTop: 6, whiteSpace: "nowrap" }}>{s.note}</div>}
            </div>
          </div>
        );
      })}
    </ClayScene>
  );
};

// A big stat: a donut gauge of clay rolls round to `value` while the puffy number counts up inside, then both wobble.
export const StatRing: FC<{ value: number; suffix?: string; max?: number; at: number; dur?: number; label: string; note?: string; color?: string; x?: number; y?: number; size?: number }> = ({ value, suffix = "%", max = 100, at, dur = 1.3, label, note, color = MINT, x = 700, y = 540, size = 560 }) => {
  const { t } = useTime();
  const ring = pop(t, at);
  const e = ramp(t, at + 0.25, dur, Easing.out(Easing.cubic));
  const end = at + 0.25 + dur;
  const w = jelly(t, end, 0.08);
  const n = Math.round(value * e);
  return (
    <ClayScene>
      <Centered x={x} y={y} body={ring} wobble={w} origin="50% 50%">
        <ClayRing size={size} color={color} thick={size * 0.17} p={(value / max) * e} track={STONE} />
      </Centered>
      <Centered x={x} y={y} wobble={jelly(t, end, 0.14)} origin="50% 60%">
        <div style={{ opacity: ring.o }}>
          <Puffy text={`${n}${suffix}`} size={size * 0.27} />
        </div>
      </Centered>
      <div style={abs(x + size / 2 + 110, y - 110, { width: 1920 - (x + size / 2 + 110) - 96 })}>
        <div style={{ ...puffyStyle(72), whiteSpace: "normal", opacity: ramp(t, at + 0.5, 0.4), transform: `translateY(${(1 - ramp(t, at + 0.5, 0.5, Easing.out(Easing.back(2)))) * 40}px)` }}>
          <PuffyDefs size={72} />
          {label}
        </div>
        {note && <div style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 32, color: INK_SOFT, marginTop: 22, opacity: ramp(t, end, 0.4) }}>{note}</div>}
      </div>
    </ClayScene>
  );
};

export type Side = { title: string; points: string[]; icon: IconName; color: string };

// A vs B on two clay cards with a flipping VS coin; at the verdict the loser deflates and greys while the winner jellies and earns a check.
export const ClayCompare: FC<{ left: Side; right: Side; at: { left: number; right: number; vs: number; verdict?: number }; winner?: "left" | "right" }> = ({ left, right, at, winner = "right" }) => {
  const { t } = useTime();
  const cw = 600;
  const ch = 470;
  const floor = 910;
  const verdict = at.verdict ?? Infinity;
  const deflate = ramp(t, verdict, 0.6, Easing.out(Easing.back(1.4)));
  const card = (s: Side, x: number, cue: number, side: "left" | "right") => {
    const lose = winner !== side ? deflate : 0;
    const b = drop(t, cue, { h: 420 });
    const body: Body = { ...b, sx: b.sx * (1 + 0.05 * lose), sy: b.sy * (1 - 0.1 * lose) };
    const c = mix(s.color, STONE, lose * 0.75);
    return (
      <Thing x={x} y={floor} w={cw} h={ch} body={body} wobble={winner === side ? jelly(t, verdict + 0.1, 0.07) : 0}>
        <Slab w={cw} h={ch} r={70} color={c} floor size="xl">
          <div style={{ width: cw, height: ch, padding: "54px 60px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "flex-start", opacity: 1 - lose * 0.35 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <ClayIcon icon={s.icon} tile={mix(c, "#ffffff", 0.35)} size={120} />
              <Puffy text={s.title} size={74} />
            </div>
            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 22 }}>
              {s.points.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: ROUND, fontWeight: 500, fontSize: 40, color: INK, opacity: ramp(t, cue + 0.35 + i * 0.18, 0.3) }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: clayFill(PUTTY), filter: clayFilter("s") }} />
                  {p}
                </div>
              ))}
            </div>
          </div>
        </Slab>
      </Thing>
    );
  };
  const vs = drop(t, at.vs, { h: 360, fall: 0.4 });
  const turn = interpolate(t, [at.vs - 0.4, at.vs + 0.35], [540, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const wx = winner === "left" ? 530 : 1390;
  const badge = pop(t, verdict + 0.15);
  return (
    <ClayScene>
      {card(left, 530, at.left, "left")}
      {card(right, 1390, at.right, "right")}
      <Thing x={960} y={640} w={170} h={190} body={vs} shadow={false} z={2}>
        <ClayCoin size={170} color={BUTTER} label="vs" turn={turn} />
      </Thing>
      {badge.o > 0 && (
        <Centered x={wx + cw / 2 - 30} y={floor - ch + 20} body={badge} origin="50% 50%">
          <ClayIcon icon="check" tile={MINT} size={130} />
        </Centered>
      )}
    </ClayScene>
  );
};

// A quote in a clay speech bubble, said by the clay buddy: the buddy drops in, the bubble pops, and the buddy's mouth moves while it "talks".
export const QuoteBuddy: FC<{ quote: string; by: string; role?: string; at: number; talkFor?: number; color?: string }> = ({ quote, by, role, at, talkFor = 2.2, color = LILAC }) => {
  const { t } = useTime();
  const buddy = drop(t, at, { h: 380 });
  const bub = pop(t, at + 0.45);
  const talking = t > at + 0.6 && t < at + 0.6 + talkFor;
  const talk = talking ? 0.5 + 0.5 * Math.sin((t - at) * 17) * Math.sin((t - at) * 5.3) : 0;
  return (
    <ClayScene>
      <Thing x={430} y={900} w={320} h={346} body={buddy} wobble={jelly(t, at + 0.6, 0.05)}>
        <Buddy size={320} color={color} talk={Math.max(0, talk)} mood={talking ? "smile" : "happy"} look={0.6} seed={4} />
      </Thing>
      <div style={abs(660, 210, { transformOrigin: "0% 90%", transform: `scale(${bub.sx}, ${bub.sy})`, opacity: bub.o })}>
        <div style={{ position: "relative", width: 1150, filter: clayFilter("xl") }}>
          <div style={{ position: "absolute", left: 40, bottom: -42, width: 120, height: 120, borderRadius: 30, transform: "rotate(45deg)", background: PUTTY }} />
          <div style={{ position: "relative", borderRadius: 90, background: clayFill(PUTTY), padding: "90px 96px 70px 110px" }}>
            <div style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 56, lineHeight: 1.25, color: INK, opacity: ramp(t, at + 0.65, 0.4) }}>{quote}</div>
            <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 16, opacity: ramp(t, at + 1.0, 0.4) }}>
              <div style={{ width: 46, height: 14, borderRadius: 7, background: color }} />
              <span style={{ fontFamily: ROUND, fontWeight: 600, fontSize: 38, color: INK }}>{by}</span>
              {role && <span style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 32, color: INK_SOFT }}>· {role}</span>}
            </div>
          </div>
        </div>
        <div style={abs(40, -90)}>
          <Puffy text="“" size={230} color={PINK} />
        </div>
      </div>
    </ClayScene>
  );
};

export type Bar = { label: string; value: number; color?: string };

// Clay pillars grow out of a plinth with a springy overshoot (thinning as they stretch, fattening as they settle); value coins pop on top.
export const PillarChart: FC<{ data: Bar[]; max?: number; at: number; stagger?: number; title?: string; highlight?: number; unit?: string }> = ({ data, max, at, stagger = 0.18, title, highlight, unit = "" }) => {
  const { t } = useTime();
  const top = max ?? Math.max(...data.map((d) => d.value));
  const floorY = 860;
  const maxH = 470;
  const pw = 150;
  const step = 250;
  const x0 = 960 - ((data.length - 1) * step) / 2;
  const plinth = pop(t, at - 0.3, { squash: 0.4 });
  return (
    <ClayScene>
      {title && (
        <div style={abs(120, 110, { opacity: ramp(t, at - 0.4, 0.4) })}>
          <Puffy text={title} size={64} />
        </div>
      )}
      <div style={abs(960 - 700, floorY - 10, { transform: `scale(${plinth.sx}, ${plinth.sy})`, opacity: plinth.o })}>
        <Slab w={1400} h={64} r={32} color={STONE} size="m" floor />
      </div>
      {data.map((d, i) => {
        const c = d.color ?? (i === highlight ? PINK : LILAC);
        const k = at + i * stagger;
        const s = t < k ? 0 : spring({ frame: (t - k) * FPS, fps: FPS, config: { stiffness: 120, damping: 10 } });
        const h = Math.max(0, (d.value / top) * maxH * s);
        // Volume-keeping: a stretched pillar thins, a squashed one fattens.
        const sx = Math.min(1.18, Math.max(0.86, 1 / Math.sqrt(Math.max(0.6, s))));
        const x = x0 + i * step;
        const tag = pop(t, k + 0.55);
        return (
          <div key={i}>
            {h > 1 && (
              <div style={abs(x - pw / 2, floorY - h, { width: pw, height: h + pw / 2, transformOrigin: "50% 100%", transform: `scaleX(${sx})` })}>
                <Slab w={pw} h={h + pw / 2} r={pw / 2} color={c} size="l" floor />
              </div>
            )}
            <Centered x={x} y={floorY - (d.value / top) * maxH - 70} body={tag} origin="50% 100%">
              <Chip label={`${d.value}${unit}`} color={i === highlight ? PINK : PUTTY} textColor={INK} size={30} />
            </Centered>
            <div style={abs(x - 120, floorY + 72, { width: 240, opacity: ramp(t, at - 0.2, 0.4) })}>
              <Label text={d.label} size={32} color={INK_SOFT} />
            </div>
          </div>
        );
      })}
    </ClayScene>
  );
};

// Source label: a putty pill with a clay book tile; slides in from the left and squashes against its stop like soft clay.
export const SourceLabel: FC<{ title: string; sub?: string; kicker?: string; at: number; icon?: IconName; tile?: string; x?: number; y?: number }> = ({ title, sub, kicker = "SOURCE", at, icon = "book", tile = BUTTER, x = 96, y = 984 }) => {
  const { t } = useTime();
  const s = t < at ? 0 : spring({ frame: (t - at) * FPS, fps: FPS, config: { stiffness: 190, damping: 13 } });
  // Overshoot past 1 becomes horizontal squash instead of travel: clay hits the stop and bulges.
  const over = Math.max(0, s - 1);
  return (
    <ClayScene>
      <div style={abs(x, y, { transform: `translate(${(Math.min(1, s) - 1) * 900}px, -100%) scale(${1 - over * 0.9}, ${1 + over * 0.6})`, transformOrigin: "0% 100%" })}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 26, padding: "18px 44px 18px 20px", borderRadius: 80, background: clayFill(PUTTY), filter: clayFilter("l") }}>
          <ClayIcon icon={icon} tile={tile} size={104} />
          <div>
            <div style={{ fontFamily: ROUND, fontWeight: 600, fontSize: 28, letterSpacing: 3, color: LILAC_D }}>{kicker}</div>
            <div style={{ fontFamily: ROUND, fontWeight: 600, fontSize: 42, color: INK, whiteSpace: "nowrap" }}>{title}</div>
            {sub && <div style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 30, color: INK_SOFT, whiteSpace: "nowrap" }}>{sub}</div>}
          </div>
        </div>
      </div>
    </ClayScene>
  );
};

// Name tag lower third: a coloured clay pill with a tiny buddy avatar that pops up and blinks.
export const NameTag: FC<{ name: string; role?: string; at: number; color?: string; x?: number; y?: number }> = ({ name, role, at, color = MINT, x = 1824, y = 984 }) => {
  const { t } = useTime();
  const b = pop(t, at);
  const av = drop(t, at + 0.25, { h: 160, fall: 0.25 });
  return (
    <ClayScene>
      <div style={abs(x, y, { transform: `translate(-100%, -100%)` })}>
        <div style={{ transformOrigin: "100% 100%", transform: `scale(${b.sx}, ${b.sy})`, opacity: b.o }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 24, padding: "16px 48px 16px 22px", borderRadius: 80, background: clayFill(color), filter: clayFilter("l") }}>
            <div style={{ width: 104, height: 112, transformOrigin: "50% 100%", transform: bodyTransform(av), opacity: av.o }}>
              <Buddy size={104} color={CREAM} mood="happy" seed={9} floor={false} />
            </div>
            <div>
              <div style={{ fontFamily: ROUND, fontWeight: 700, fontSize: 46, color: INK, whiteSpace: "nowrap", textShadow: extrude(color, 20) }}>{name}</div>
              {role && <div style={{ fontFamily: ROUND, fontWeight: 500, fontSize: 30, color: INK, opacity: 0.75, whiteSpace: "nowrap" }}>{role}</div>}
            </div>
          </div>
        </div>
      </div>
    </ClayScene>
  );
};

