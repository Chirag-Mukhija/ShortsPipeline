// Ma pieces for narrated explainers: margin title, a line with emphasis dots, stepping stones, a quiet figure, a hairline divide, a source colophon and one object on its stage.
import { useId, type FC, type ReactNode } from "react";
import { Easing, interpolate, interpolateColors } from "remotion";
import { ramp } from "../../core/time";
import { GREY, MARGIN, SERIF, SHU, SUMI, SUMI_SOFT } from "./theme";
import { closedSmooth, pebble, type P } from "./geometry";
import { Caps, Fill, Hairline, Hanko, InkDot, Stage, Text, VerticalText, breathe, hush, rise, sink, useMa } from "./primitives";

// ---------- title ----------
export type MarginTitleProps = {
  lines: string[];
  kicker?: string;
  // The signature column at the right edge, read top to bottom, with the seal pressed under it.
  side?: string;
  at?: number;
  until?: number;
  seal?: boolean;
};

// A title set small and low on the left third, a hairline under it, and the right-edge column signed with the seal, like a hanging scroll.
export const MarginTitle: FC<MarginTitleProps> = ({ lines, kicker, side, at = 0, until, seal = true }) => {
  const { t } = useMa();
  const size = 104;
  const top = 860 - lines.length * size * 1.18 - 40;
  const sideAt = at + 1.6 + lines.length * 0.35;
  const sideLen = side ? [...side].length * 30 * 0.98 : 0;
  const sealAt = sideAt + (side ? [...side].length * 0.05 + 0.9 : 0.6);
  const dim = hush(t, seal ? sealAt : undefined);
  return (
    <Fill>
      <Fill style={{ opacity: dim }}>
        {kicker && <Caps x={MARGIN} y={top - 64} at={at} until={until}>{kicker}</Caps>}
        {lines.map((l, i) => (
          <Text key={i} x={MARGIN - 4} y={top + i * size * 1.18} size={size} at={at + 0.5 + i * 0.35} until={until}>
            {l}
          </Text>
        ))}
        <Stage>
          <Hairline pts={[[MARGIN, 900], [MARGIN + 620, 900]]} at={at + 1.2 + lines.length * 0.3} until={until} breath />
        </Stage>
        {side && <VerticalText x={1716} y={150} columns={[side]} size={30} at={sideAt} until={until} />}
      </Fill>
      {seal && (
        <Stage>
          <Hanko x={1716} y={Math.min(880, 150 + sideLen + 80)} size={84} at={sealAt} until={until} />
        </Stage>
      )}
    </Fill>
  );
};

// ---------- a line that lands word by word ----------
export type MaWord = { w: string; t: number; key?: boolean };

// Words fade up on their spoken times; the key word turns italic and gets bōten, the dots Japanese type sets beside a word to stress it.
export const KeyLine: FC<{ words: MaWord[]; x?: number; y?: number; size?: number; maxWidth?: number; until?: number; accent?: boolean }> = ({ words, x = 320, y = 430, size = 96, maxWidth = 1400, until, accent = true }) => {
  const { t } = useMa();
  const key = words.find((w) => w.key);
  const dim = hush(t, key ? key.t + 0.3 : undefined);
  const out = 1 - sink(t, until);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: maxWidth, display: "flex", flexWrap: "wrap", columnGap: size * 0.26, rowGap: size * 0.2, fontFamily: SERIF, fontSize: size, fontWeight: 300, lineHeight: 1.15, color: SUMI, opacity: out }}>
      {words.map((wd, i) => {
        const e = rise(t, wd.t - 0.12, 0.9);
        const style = { display: "inline-block", opacity: e * (wd.key ? 1 : dim), transform: `translateY(${(1 - e) * 6}px)` };
        if (!wd.key) return <span key={i} style={style}>{wd.w}</span>;
        return (
          <span key={i} style={{ ...style, fontStyle: "italic", fontWeight: 400 }}>
            {[...wd.w].map((ch, k) => {
              const d = ramp(t, wd.t + 0.35 + k * 0.07, 0.3, Easing.out(Easing.cubic));
              const dot = /[A-Za-z0-9]/.test(ch);
              return (
                <span key={k} style={{ position: "relative", display: "inline-block" }}>
                  {ch}
                  {dot && d > 0 && (
                    <span style={{ position: "absolute", left: "50%", top: "0.08em", width: size * 0.095, height: size * 0.095, marginLeft: -size * 0.0475, borderRadius: "50%", background: accent ? SHU : SUMI, opacity: d, transform: `scale(${0.4 + 0.6 * d})` }} />
                  )}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
};

// ---------- stepping stones ----------
export type Step = { label: string; at: number };
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi"];

const Stone: FC<{ pts: P[]; dark: number; o: number; id: string }> = ({ pts, dark, o, id }) => {
  const d = closedSmooth(pts);
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const ry = Math.max(...pts.map((p) => p[1])) - cy;
  return (
    <g opacity={o}>
      <defs>
        <radialGradient id={`${id}l`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#DCD6CB" />
          <stop offset="1" stopColor="#B5AEA2" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#5A5853" />
          <stop offset="0.55" stopColor="#2A2927" />
          <stop offset="1" stopColor={SUMI} />
        </radialGradient>
        <filter id={`${id}s`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation={9} />
        </filter>
      </defs>
      <ellipse cx={cx + 8} cy={cy + ry * 0.75} rx={(Math.max(...pts.map((p) => p[0])) - cx) * 1.02} ry={ry * 0.45} fill={SUMI} opacity={0.16} filter={`url(#${id}s)`} />
      <path d={d} fill={`url(#${id}l)`} />
      <path d={d} fill={`url(#${id}d)`} opacity={dark} />
    </g>
  );
};

// A list as stones across raked sand: each stone settles as its step is said and turns to ink, earlier ones return to pale stone; the current one gets raked rings.
export const SteppingStones: FC<{ steps: Step[]; until?: number; y?: number }> = ({ steps, until, y = 700 }) => {
  const { t } = useMa();
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const n = steps.length;
  const span = Math.min(1360, 340 * (n - 1));
  const out = 1 - sink(t, until);
  const layout = steps.map((s, i) => {
    const x = 960 - span / 2 + (n > 1 ? (span * i) / (n - 1) : 0);
    const yy = y - i * 34 + (i % 2 ? 26 : -8);
    const rx = 104 + ((i * 37) % 23);
    const ry = 36 + ((i * 13) % 7);
    return { ...s, x, y: yy, rx, ry, pts: pebble(x, yy, rx, ry, 70 + i * 11, 0.06) };
  });
  return (
    <Fill style={{ opacity: out }}>
      <Stage>
        {layout.map((s, i) => {
          const on = rise(t, s.at - 0.15, 0.9);
          const next = layout[i + 1];
          const now = on * (next ? 1 - rise(t, next.at, 1.0) : 1);
          const ring = ramp(t, s.at, 1.8, Easing.out(Easing.cubic));
          return (
            <g key={i}>
              {[1, 2, 3].map((k) => (
                <ellipse
                  key={k}
                  cx={s.x}
                  cy={s.y + 4}
                  rx={s.rx + k * 26 * ring}
                  ry={s.ry + k * 14 * ring}
                  fill="none"
                  stroke={GREY}
                  strokeWidth={1.4}
                  opacity={(0.7 - k * 0.15) * now * ring * breathe(t, k)}
                />
              ))}
              <g transform={`translate(0 ${(1 - on) * 6})`}>
                <Stone pts={s.pts} dark={now} o={on} id={`${id}${i}`} />
              </g>
            </g>
          );
        })}
      </Stage>
      {layout.map((s, i) => {
        const next = layout[i + 1];
        const now = next ? 1 - rise(t, next.at, 1.0) : 1;
        const col = interpolateColors(now, [0, 1], [SUMI_SOFT, SUMI]);
        return (
          <div key={i}>
            <Text x={s.x} y={s.y - s.ry - 112} size={52} align="center" at={s.at} color={col}>
              {s.label}
            </Text>
            <Text x={s.x} y={s.y + s.ry + 34} size={38} italic align="center" at={s.at + 0.2} color={SUMI_SOFT}>
              {ROMAN[i] ?? String(i + 1)}
            </Text>
          </div>
        );
      })}
    </Fill>
  );
};

// ---------- a quiet figure ----------
const fmt = (v: number, decimals: number) => {
  const [a, b] = v.toFixed(decimals).split(".");
  return a!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? `.${b}` : "");
};

export type QuietFigureProps = { value: number; at: number; label: string; note?: string; prefix?: string; suffix?: string; decimals?: number; x?: number; y?: number; size?: number; until?: number; folio?: string; accent?: boolean };

// A large, light numeral that counts up slowly and settles on the word, a hairline running out from it to a single vermillion dot, the label in tracked caps.
export const QuietFigure: FC<QuietFigureProps> = ({ value, at, label, note, prefix = "", suffix = "", decimals = 0, x = MARGIN + 48, y = 250, size = 300, until, folio, accent = true }) => {
  const { t } = useMa();
  const k = ramp(t, at - 1.2, 1.4, Easing.out(Easing.exp));
  const rule = y + size * 1.05;
  return (
    <Fill>
      <Text x={x - size * 0.04} y={y} size={size} at={at - 1.3} d={1.0} until={until} style={{ fontVariantNumeric: "lining-nums tabular-nums", lineHeight: 1 }}>
        {prefix + fmt(value * k, decimals) + suffix}
      </Text>
      <Stage>
        <Hairline pts={[[x, rule], [x + 820, rule]]} at={at + 0.1} d={1.2} until={until} />
        {accent && <InkDot x={x + 820} y={rule} r={9} at={at + 1.25} d={0.6} until={until} color={SHU} />}
      </Stage>
      <Caps x={x} y={rule + 36} size={30} at={at + 0.4} until={until}>
        {label}
      </Caps>
      {note && (
        <Text x={x} y={rule + 92} size={46} italic at={at + 0.8} until={until} color={SUMI_SOFT}>
          {note}
        </Text>
      )}
      {folio && <VerticalText x={1716} y={150} columns={[folio]} size={28} at={at + 1.2} until={until} />}
    </Fill>
  );
};

// ---------- A vs B ----------
export type Side = { word: string; note?: string };

// One hairline divides the page; each side lands on its word, then the chosen side keeps its ink, the other recedes, and a vermillion dot marks the line where it leans.
export const HairlineDivide: FC<{ left: Side; right: Side; at: { line: number; left: number; right: number; pick?: number }; pick?: "left" | "right"; until?: number }> = ({ left, right, at, pick, until }) => {
  const { t } = useMa();
  const p = at.pick === undefined ? 0 : ramp(t, at.pick, 1.0, Easing.inOut(Easing.cubic));
  const fadeL = pick === "right" ? 1 - 0.68 * p : 1;
  const fadeR = pick === "left" ? 1 - 0.68 * p : 1;
  const ly = 330;
  const ry = 590;
  return (
    <Fill>
      <Stage>
        <Hairline pts={[[960, 170], [960, 910]]} at={at.line} d={1.8} until={until} />
        {pick && at.pick !== undefined && <InkDot x={960} y={pick === "left" ? ly + 80 : ry + 80} r={12} at={at.pick + 0.3} d={0.7} color={SHU} until={until} />}
      </Stage>
      <Text x={900} y={ly} size={128} align="right" at={at.left} until={until} opacity={fadeL}>
        {left.word}
      </Text>
      {left.note && (
        <Text x={900} y={ly + 168} size={46} italic align="right" at={at.left + 0.5} until={until} color={SUMI_SOFT} opacity={fadeL}>
          {left.note}
        </Text>
      )}
      <Text x={1022} y={ry} size={128} at={at.right} until={until} opacity={fadeR}>
        {right.word}
      </Text>
      {right.note && (
        <Text x={1022} y={ry + 168} size={46} italic at={at.right + 0.5} until={until} color={SUMI_SOFT} opacity={fadeR}>
          {right.note}
        </Text>
      )}
    </Fill>
  );
};

// ---------- source ----------
// The colophon: a short vertical rule and three quiet lines, low on the left, for a source or a name.
export const Colophon: FC<{ text: string; detail?: string; kicker?: string; at: number; until?: number; x?: number; y?: number }> = ({ text, detail, kicker = "Source", at, until, x = MARGIN, y = 818 }) => (
  <Fill>
    <Stage>
      <Hairline pts={[[x, y + 4], [x, y + 140]]} at={at} d={0.9} until={until} w={1.8} />
    </Stage>
    <Caps x={x + 30} y={y} at={at + 0.2} until={until}>
      {kicker}
    </Caps>
    <Text x={x + 30} y={y + 40} size={46} weight={400} at={at + 0.45} until={until}>
      {text}
    </Text>
    {detail && (
      <Caps x={x + 30} y={y + 106} at={at + 0.75} until={until} tracking="0.22em">
        {detail}
      </Caps>
    )}
  </Fill>
);

// ---------- one object ----------
// A river stone in ink wash, the default object for a OneObject stage.
export const Pebble: FC<{ rx?: number; ry?: number; seed?: number }> = ({ rx = 180, ry = 88, seed = 5 }) => {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const d = closedSmooth(pebble(0, 0, rx, ry, seed, 0.05));
  return (
    <g>
      <defs>
        <radialGradient id={`${id}g`} cx="0.34" cy="0.26" r="0.9">
          <stop offset="0" stopColor="#8C8982" />
          <stop offset="0.5" stopColor="#47453F" />
          <stop offset="1" stopColor="#24231F" />
        </radialGradient>
        <radialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${id}g)`} />
      <ellipse cx={-rx * 0.32} cy={-ry * 0.42} rx={rx * 0.34} ry={ry * 0.16} fill={`url(#${id}h)`} transform={`rotate(-12 ${-rx * 0.32} ${-ry * 0.42})`} />
    </g>
  );
};

// One thing, centred low, on a breathing horizon with a soft ink shadow, turning so slowly you only feel it.
export const OneObject: FC<{ at?: number; until?: number; x?: number; y?: number; children?: ReactNode; ground?: number }> = ({ at = 0, until, x = 960, y = 735, children, ground = 96 }) => {
  const { t } = useMa();
  const id = `o${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const e = rise(t, at, 1.5);
  const o = e * (1 - sink(t, until));
  if (o <= 0) return null;
  const rot = Math.sin((t - at) * 0.35) * 1.2;
  const s = interpolate(e, [0, 1], [0.985, 1]) * (1 + 0.006 * Math.sin((t - at) * 0.9));
  return (
    <Stage>
      <defs>
        <filter id={id} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation={14} />
        </filter>
      </defs>
      <Hairline pts={[[x - 470, y + ground], [x + 470, y + ground]]} at={at + 0.3} d={1.8} until={until} color={GREY} breath />
      <ellipse cx={x + 14} cy={y + ground - 4} rx={200} ry={20} fill={SUMI} opacity={0.22 * o} filter={`url(#${id})`} />
      <g opacity={o} transform={`translate(${x} ${y + (1 - e) * 6}) rotate(${rot}) scale(${s})`}>
        {children ?? <Pebble />}
      </g>
    </Stage>
  );
};

