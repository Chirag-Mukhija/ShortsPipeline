// Narration pieces in liquid glass: condensing pills, the title slab, a lens landing on the spoken keyword, steps, a stat seen through a dome, the A/B split, a quote and the lower third.
import type { CSSProperties, FC, ReactNode } from "react";
import { interpolateColors } from "remotion";
import { clamp01, ramp, useTime } from "../../core/time";
import { Behind, Glass, SMOKE, type Tint } from "./glass";
import { condense, glintAt, squash } from "./moves";
import { HALO, INK, LIME, MONO, SANS, SOFT, fr, sp } from "./theme";

// Inter Tight advance widths, roughly, per em: good enough to size glass around a label without measuring the DOM.
export const textW = (s: string, size: number) => {
  let w = 0;
  for (const ch of s) {
    if (" ".includes(ch)) w += 0.25;
    else if ("iljI.,:;'!|".includes(ch)) w += 0.26;
    else if ("mwMW".includes(ch)) w += 0.82;
    else if (ch >= "A" && ch <= "Z") w += 0.64;
    else if (ch >= "0" && ch <= "9") w += 0.57;
    else w += 0.52;
  }
  return w * size;
};

export const label = (size: number, weight = 600, color = INK): CSSProperties => ({
  fontFamily: SANS, fontSize: size, fontWeight: weight, color, textShadow: HALO, letterSpacing: -0.01 * size, lineHeight: 1.12, whiteSpace: "nowrap",
});
export const kicker = (size = 28, color = SOFT): CSSProperties => ({
  fontFamily: MONO, fontSize: size, fontWeight: 600, color, letterSpacing: "0.18em", textTransform: "uppercase", textShadow: HALO, whiteSpace: "nowrap",
});

// ---------- GlassPill ----------
export const GlassPill: FC<{
  x: number; y: number; text: string; at: number; out?: number; size?: number; h?: number; w?: number; tint?: Tint; color?: string; mono?: boolean; glint?: number[]; icon?: ReactNode;
}> = ({ x, y, text, at, out, size = 44, h, w, tint = SMOKE, color = INK, mono, glint = [], icon }) => {
  const { t } = useTime();
  const c = condense(t, at, out);
  if (t < at) return null;
  const hh = h ?? size * 2.1;
  const ww = w ?? textW(text, mono ? size * 1.15 : size) + hh * 0.95 + (icon ? hh * 0.6 : 0);
  return (
    <Glass shape={{ blobs: [{ x, y, w: ww, h: hh }] }} {...c} tint={tint} bevel={Math.min(40, hh * 0.32)} glint={glintAt(t, glint)}>
      <div style={{ display: "flex", alignItems: "center", gap: hh * 0.18, opacity: c.content }}>
        {icon}
        <span style={mono ? { ...kicker(size, color), letterSpacing: "0.12em" } : label(size, 600, color)}>{text}</span>
      </div>
    </Glass>
  );
};

// ---------- GlassTitle: the hook card ----------
export const GlassTitle: FC<{ title: string; sub?: string; kick?: string; at: number; out?: number; y?: number; glint?: number }> = ({ title, sub, kick, at, out, y = 520, glint }) => {
  const { t } = useTime();
  const size = 116;
  const w = Math.max(textW(title, size) + 220, sub ? textW(sub, 42) + 200 : 0, 900);
  const h = sub ? 330 : 240;
  const c = condense(t, at + 0.25, out);
  return (
    <>
      {kick ? <GlassPill x={960} y={y - h / 2 - 78} text={kick} at={at} out={out} size={28} mono /> : null}
      {t >= at + 0.25 ? (
        <Glass shape={{ blobs: [{ x: 960, y, w, h, r: 110 }] }} {...c} tint={[12, 30, 14, 0.2]} bevel={46} glint={glintAt(t, [glint ?? at + 1.3])}>
          <div style={{ textAlign: "center", opacity: c.content, transform: `translateY(${(1 - c.content) * 14}px)` }}>
            <div style={label(size, 700)}>{title}</div>
            {sub ? <div style={{ ...label(42, 500, SOFT), marginTop: 22 }}>{sub}</div> : null}
          </div>
        </Glass>
      ) : null}
    </>
  );
};

// ---------- KeywordLens: a dome lands on the spoken keyword and magnifies it ----------
export type Word = { w: string; t: number };
export const KeywordLens: FC<{ words: Word[]; keyIndex: number; y?: number; size?: number; zoom?: number; lead?: number }> = ({ words, keyIndex, y = 560, size = 64, zoom = 1.42, lead = fr(4) }) => {
  const { t } = useTime();
  const gap = size * 0.3;
  const ws = words.map((w) => textW(w.w, size));
  const lw = Math.max(ws[keyIndex]! * zoom + size * 1.5, size * 2.6);
  const lh = size * 2.5;
  // The keyword gets room for its lens, so the magnified word never swallows its neighbours.
  const pad = (i: number) => (i === keyIndex || i === keyIndex + 1 ? Math.max(gap, (lw - ws[keyIndex]!) / 2 + gap * 0.4) : gap);
  const total = ws.reduce((a, b) => a + b, 0) + words.slice(1).reduce((a, _, i) => a + pad(i + 1), 0);
  let x = 960 - total / 2;
  const xs = ws.map((w, i) => {
    if (i > 0) x += pad(i);
    const v = x;
    x += w;
    return v;
  });
  const kAt = (words[keyIndex]?.t ?? 0) - lead;
  const lit = ramp(t, kAt + fr(4), fr(8));
  const kx = xs[keyIndex]! + ws[keyIndex]! / 2;
  const svg = (
    <g>
      {words.map((w, i) => {
        const a = ramp(t, w.t - fr(3), fr(8));
        const isKey = i === keyIndex;
        return (
          <text
            key={i} x={xs[i]} y={y + size * 0.36 + (1 - a) * 18} fontFamily={SANS} fontWeight={isKey ? 700 : 600} fontSize={size}
            opacity={a * (isKey ? 1 : 1 - 0.18 * lit)}
            fill={isKey ? interpolateColors(lit, [0, 1], [INK, LIME]) : INK} stroke="rgba(6,24,10,0.4)" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round"
          >
            {w.w}
          </text>
        );
      })}
    </g>
  );
  const c = condense(t, kAt);
  const sq = squash(t, kAt + fr(5), 0.1);
  return (
    <Behind svg={svg}>
      {t >= kAt ? (
        <Glass shape={{ blobs: [{ x: kx, y, w: lw * sq.sx, h: lh * sq.sy }] }} mode="dome" zoom={zoom} res={0.75} {...c} tint={[10, 26, 12, 0.18]} bevel={34} glint={glintAt(t, [kAt + 0.7])} />
      ) : null}
    </Behind>
  );
};

// ---------- GlassSteps: pills condense row by row; a liquid lens slides down and magnifies the live number ----------
export const GlassSteps: FC<{ steps: { text: string; at: number }[]; title?: string; x?: number; y?: number; width?: number }> = ({ steps, title, x = 960, y = 250, width = 1080 }) => {
  const { t } = useTime();
  const rowH = 112, step = 142;
  const nx = x - width / 2 + 76;
  const live = steps.reduce((k, s, i) => (t >= s.at ? i : k), -1);
  const rows = steps.map((_, i) => y + 150 + i * step);
  // The lens follows the live row on a liquid spring: stretched tall while moving, round when it lands.
  let lead = rows[0]!, trail = rows[0]!;
  steps.forEach((s, i) => {
    if (i === 0) return;
    const d = rows[i]! - rows[i - 1]!;
    lead += d * sp(t, s.at, { stiffness: 230, damping: 15 });
    trail += d * sp(t, s.at + fr(3), { stiffness: 110, damping: 16 });
  });
  const ly = (lead + trail) / 2, stretch = Math.abs(lead - trail);
  const lensC = condense(t, steps[0]?.at ?? 0);
  const nums = (
    <g>
      {steps.map((s, i) => (
        <text key={i} x={nx} y={rows[i]! + 15} textAnchor="middle" fontFamily={MONO} fontWeight={600} fontSize={42} fill={i === live ? LIME : INK} opacity={ramp(t, s.at, fr(8))} stroke="rgba(6,24,10,0.5)" strokeWidth={5} paintOrder="stroke">
          {String(i + 1).padStart(2, "0")}
        </text>
      ))}
    </g>
  );
  return (
    <>
      {title ? <GlassPill x={x - width / 2 + textW(title, 40) / 2 + 60} y={y} text={title} at={(steps[0]?.at ?? 0) - 0.4} size={40} /> : null}
      {steps.map((s, i) => {
        const c = condense(t, s.at - 0.15);
        if (t < s.at - 0.15) return null;
        const done = i < live;
        return (
          <Glass key={i} shape={{ blobs: [{ x, y: rows[i]!, w: width, h: rowH }] }} {...c} tint={SMOKE} bevel={34} glow={i === live ? 0.6 : 0}>
            <div style={{ width: width, display: "flex", alignItems: "center", paddingLeft: 150, opacity: c.content * (done ? 0.62 : 1) }}>
              <span style={label(46, i === live ? 700 : 600)}>{s.text}</span>
            </div>
          </Glass>
        );
      })}
      <Behind svg={nums}>
        {t >= (steps[0]?.at ?? 0) ? (
          <Glass shape={{ blobs: [{ x: nx, y: ly, w: 96 - stretch * 0.06, h: 96 + stretch * 0.55 }] }} mode="dome" zoom={1.5} {...lensC} tint={[228, 255, 138, 0.1]} bevel={30} res={0.5} margin={40} shadow={0.18} />
        ) : null}
      </Behind>
    </>
  );
};

// ---------- GlassStat: a big number seen through a dome that condenses onto it and swells it ----------
export const GlassStat: FC<{ value: number; decimals?: number; prefix?: string; suffix?: string; caption: string; at: number; countFor?: number; x?: number; y?: number }> = ({
  value, decimals = 0, prefix = "", suffix = "", caption, at, countFor = 1.1, x = 960, y = 470,
}) => {
  const { t } = useTime();
  const v = value * ramp(t, at, countFor);
  const num = `${prefix}${v.toFixed(decimals)}`;
  const size = 190;
  const nw = textW(`${prefix}${value.toFixed(decimals)}`, size);
  const sw = textW(suffix, size * 0.55);
  const a = ramp(t, at - 0.2, fr(8));
  const svg = (
    <g opacity={a}>
      <text x={x - (nw + sw) / 2} y={y + size * 0.35} fontFamily={SANS} fontWeight={700} fontSize={size} fill={INK} stroke="rgba(6,24,10,0.5)" strokeWidth={8} paintOrder="stroke" style={{ fontVariantNumeric: "tabular-nums" }}>
        {num}
        <tspan fontSize={size * 0.55} fill={LIME} dx={8}>{suffix}</tspan>
      </text>
    </g>
  );
  const lensAt = at + countFor * 0.55;
  const c = condense(t, lensAt);
  const sq = squash(t, lensAt + fr(6), 0.08, 2.6);
  const R = Math.max(nw + sw + 60, 520);
  return (
    <>
      <Behind svg={svg}>
        {t >= lensAt ? (
          <Glass shape={{ blobs: [{ x, y, w: R * 1.18 * sq.sx, h: 360 * sq.sy }] }} mode="dome" zoom={1.28} {...c} tint={[8, 24, 12, 0.1]} bevel={48} glint={glintAt(t, [lensAt + 0.8])} res={0.5} />
        ) : null}
      </Behind>
      <GlassPill x={x} y={y + 270} text={caption} at={lensAt + 0.35} size={40} />
    </>
  );
};

// ---------- GlassCompare: one droplet splits into A and B, still joined by a liquid bridge through "vs" ----------
export type Side = { title: string; lines: string[] };
export const GlassCompare: FC<{ a: Side; b: Side; at: number; splitAt?: number; winner?: "a" | "b"; decideAt?: number }> = ({ a, b, at, splitAt, winner, decideAt }) => {
  const { t } = useTime();
  const sAt = splitAt ?? at + 0.5;
  const c = condense(t, at);
  const s = sp(t, sAt, { stiffness: 120, damping: 14 });
  const grow = clamp01(s);
  const pw = 200 + 440 * grow, ph = 200 + 330 * grow;
  const off = 410 * s;
  const y = 560;
  const vs = sp(t, sAt + 0.2, { stiffness: 200, damping: 12 });
  const blobs = [
    { x: 960 - off, y, w: pw, h: ph, r: Math.min(pw, ph) / 2 - 64 * grow },
    { x: 960 + off, y, w: pw, h: ph, r: Math.min(pw, ph) / 2 - 64 * grow },
    { x: 960, y, w: 116 * vs, h: 116 * vs },
  ];
  const dec = decideAt === undefined ? 0 : ramp(t, decideAt, 0.4);
  const settled = ramp(t, sAt + 0.35, 0.4);
  const side = (sd: Side, key: "a" | "b") => {
    const win = winner === key ? dec : 0;
    const lose = winner && winner !== key ? dec : 0;
    return (
      <div style={{ width: 560, opacity: settled * (1 - 0.55 * lose) }}>
        <div style={{ ...label(58, 700, interpolateColors(win, [0, 1], [INK, LIME])) }}>{sd.title}</div>
        <div style={{ height: 3, width: 80 + 120 * win, background: interpolateColors(win, [0, 1], ["rgba(255,255,255,0.6)", LIME]), borderRadius: 2, margin: "22px 0 26px" }} />
        {sd.lines.map((l, i) => (
          <div key={i} style={{ ...label(38, 500, SOFT), marginTop: i ? 16 : 0, opacity: ramp(t, sAt + 0.45 + i * 0.15, 0.3) }}>{l}</div>
        ))}
      </div>
    );
  };
  return (
    <>
      {t >= at ? (
        <Glass shape={{ blobs, k: 70 }} {...c} tint={SMOKE} bevel={44} res={0.5} wobble={c.wobble + Math.min(1, Math.abs(1 - s) * 1.5)} glint={decideAt !== undefined ? glintAt(t, [decideAt]) : undefined} />
      ) : null}
      <div style={{ position: "absolute", left: 960 - 410 - 280, top: y - 200, opacity: settled }}>{side(a, "a")}</div>
      <div style={{ position: "absolute", left: 960 + 410 - 280, top: y - 200, opacity: settled }}>{side(b, "b")}</div>
      <div style={{ position: "absolute", left: 960 - 60, top: y - 60, width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center", opacity: ramp(t, sAt + 0.3, 0.3) }}>
        <span style={{ ...kicker(34, INK), letterSpacing: "0.06em", textTransform: "none" }}>vs</span>
      </div>
    </>
  );
};

// ---------- GlassQuote ----------
export const GlassQuote: FC<{ lines: string[]; who: string; role?: string; at: number; glint?: number; out?: number }> = ({ lines, who, role, at, glint, out }) => {
  const { t } = useTime();
  const c = condense(t, at, out);
  const w = Math.max(...lines.map((l) => textW(l, 60))) + 260;
  const h = 150 + lines.length * 76;
  const y = 470;
  return (
    <>
      {t >= at ? (
        <Glass shape={{ blobs: [{ x: 960, y, w, h, r: 72 }] }} {...c} tint={[10, 26, 12, 0.24]} bevel={44} glint={glintAt(t, [glint ?? at + 1.6])}>
          <div style={{ width: w - 200, opacity: c.content }}>
            {lines.map((l, i) => (
              <div key={i} style={{ ...label(60, 600), lineHeight: 1.26, opacity: ramp(t, at + 0.3 + i * 0.25, 0.4) }}>{l}</div>
            ))}
          </div>
        </Glass>
      ) : null}
      {t >= at ? (
        <div style={{ position: "absolute", left: 960 - w / 2 + 50, top: y - h / 2 - 60, ...label(170, 700, LIME), opacity: c.content, transform: `scale(${0.6 + 0.4 * c.content})`, transformOrigin: "left bottom" }}>“</div>
      ) : null}
      <GlassPill x={960 + w / 2 - textW(`${who}${role ? ` · ${role}` : ""}`, 34) / 2 - 80} y={y + h / 2 + 70} text={`${who}${role ? ` · ${role}` : ""}`} at={at + 0.9} out={out} size={34} />
    </>
  );
};

// ---------- GlassLowerThird + source chip ----------
export const GlassLowerThird: FC<{ name: string; role: string; at: number; out?: number; source?: string; sourceAt?: number }> = ({ name, role, at, out, source, sourceAt }) => {
  const { t } = useTime();
  const c = condense(t, at, out);
  const w = Math.max(textW(name, 48), textW(role, 34)) + 220;
  const h = 150;
  const x = 96 + w / 2, y = 1080 - 96 - h / 2;
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  return (
    <>
      {t >= at ? (
        <Glass shape={{ blobs: [{ x, y, w, h }] }} {...c} tint={SMOKE} bevel={38}>
          <div style={{ width: w, display: "flex", alignItems: "center", gap: 26, paddingLeft: 30, opacity: c.content }}>
            <div style={{ width: 90, height: 90, borderRadius: 45, background: "radial-gradient(circle at 35% 30%, rgba(228,255,138,0.55), rgba(228,255,138,0.12) 70%)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", ...label(36, 700) }}>{initials}</div>
            <div>
              <div style={label(48, 700)}>{name}</div>
              <div style={{ ...label(34, 500, SOFT), marginTop: 6 }}>{role}</div>
            </div>
          </div>
        </Glass>
      ) : null}
      {source ? <GlassPill x={1920 - 96 - (textW(source, 30) + 150) / 2} y={y + 20} text={source} at={sourceAt ?? at + 0.4} out={out} size={30} icon={<span style={{ ...kicker(24, LIME) }}>src</span>} /> : null}
    </>
  );
};
