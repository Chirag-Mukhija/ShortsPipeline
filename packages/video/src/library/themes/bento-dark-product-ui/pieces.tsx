// Bento composed pieces: Linear's three-up figure columns with isometric art, and the A-vs-B comparison where the loser drops back and the winner lights.
import type { FC } from "react";
import { interpolateColors } from "remotion";
import { INOUT, ramp, useTime } from "../../core/time";
import { HUE, MONO, MUTED, SANS, SOFT, TEXT, TRACK, fr, hair, withAlpha } from "./theme";
import { Card, Icon, Mono, appear, exitStyle } from "./primitives";
import { IsoWireframe, type IsoVariant } from "./art";

export type FeatureCol = { fig: string; variant: IsoVariant; title: string; body: string; t: number };

// Three columns split by hairlines: a mono FIG caption, an isometric wireframe drawing on, then a white title and a grey line, each column landing on its word.
export const FeatureColumns: FC<{ cols: FeatureCol[]; y?: number; hue?: string; focus?: { index: number; at: number }; out?: number }> = ({ cols, y = 300, hue = HUE.indigo, focus, out }) => {
  const { t } = useTime();
  const cw = (1920 - 192) / cols.length;
  const fo = focus ? ramp(t, focus.at, fr(18), INOUT) : 0;
  return (
    <div style={{ position: "absolute", left: 96, right: 96, top: y, height: 720, display: "flex", ...exitStyle(t, out) }}>
      {cols.map((c, i) => {
        const me = focus?.index === i;
        const dim = focus ? (me ? 1 : 1 - 0.7 * fo) : 1;
        return (
          <div key={i} style={{ position: "relative", width: cw, height: "100%", padding: "0 44px", boxSizing: "border-box", borderLeft: i ? `1px solid ${hair(0.07 * appear(t, c.t - 0.4).p)}` : undefined, opacity: dim }}>
            <div style={appear(t, c.t - 0.3).style}>
              <Mono color={me && fo > 0.5 ? TEXT : MUTED}>{c.fig}</Mono>
            </div>
            <div style={{ height: 410, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IsoWireframe variant={c.variant} at={c.t - 0.2} drawFrames={45} size={c.variant === "fins" ? 380 : 330} hue={hue} lit={me ? fo : 0} />
            </div>
            <div style={{ ...appear(t, c.t + 0.3).style, fontFamily: SANS, fontWeight: 500, fontSize: 42, color: TEXT, letterSpacing: "-0.02em" }}>{c.title}</div>
            <div style={{ ...appear(t, c.t + 0.4).style, marginTop: 12, fontFamily: SANS, fontWeight: 400, fontSize: 36, lineHeight: 1.3, color: MUTED, letterSpacing: "-0.01em" }}>{c.body}</div>
          </div>
        );
      })}
    </div>
  );
};

export type Side = { label: string; title: string; rows: { text: string; good: boolean }[] };

// Two cards side by side with a VS chip on a hairline; at pickAt the other side drops to 30 % and the winner's border brightens with a hue glow.
export const CompareCards: FC<{ left: Side; right: Side; at: number; pick?: "left" | "right"; pickAt?: number; hue?: string; out?: number }> = ({ left, right, at, pick = "right", pickAt, hue = HUE.indigo, out }) => {
  const { t } = useTime();
  const p = pickAt === undefined ? 0 : ramp(t, pickAt, fr(18), INOUT);
  const vs = appear(t, at + fr(10), { s: 0.8, y: 0 });
  const side = (s: Side, k: 0 | 1) => {
    const win = (pick === "left" ? 0 : 1) === k;
    const a = appear(t, at + fr(4 * k), { d: 24, y: 40, s: 1.02 });
    const lit = win ? p : 0;
    return (
      <div style={{ position: "absolute", left: k ? 1004 : 136, top: 220, ...a.style, opacity: (a.style.opacity as number) * (win ? 1 : 1 - 0.7 * p) }}>
        <Card w={780} h={660} lit={lit} glow={hue}>
          <div style={{ padding: "40px 48px" }}>
            <Mono color={win && p > 0.5 ? interpolateColors(p, [0, 1], [MUTED, "#B9C0FF"]) : MUTED}>{s.label}</Mono>
            <div style={{ marginTop: 18, fontFamily: SANS, fontWeight: 500, fontSize: 64, letterSpacing: TRACK, color: TEXT }}>{s.title}</div>
            <div style={{ marginTop: 34, height: 1, background: hair(0.07) }} />
            {s.rows.map((r, i) => {
              const ra = appear(t, at + fr(14 + 4 * k + 5 * i));
              const tone = r.good ? (win ? interpolateColors(p, [0, 1], [SOFT, HUE.green]) : SOFT) : MUTED;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, height: 96, borderBottom: `1px solid ${hair(0.05)}`, ...ra.style }}>
                  <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", background: r.good ? withAlpha(HUE.green, win ? 0.08 + 0.12 * p : 0.06) : hair(0.04) }}>
                    <Icon name={r.good ? "check" : "x"} size={28} color={tone} sw={2.2} />
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: 38, color: r.good ? TEXT : MUTED, letterSpacing: "-0.01em" }}>{r.text}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, ...exitStyle(t, out) }}>
      <div style={{ position: "absolute", left: 959, top: 220, width: 1, height: 660, background: `linear-gradient(180deg, transparent, ${hair(0.14)}, transparent)`, opacity: vs.p }} />
      {side(left, 0)}
      {side(right, 1)}
      <div style={{ position: "absolute", left: 960 - 46, top: 550 - 30, width: 92, height: 60, borderRadius: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "#0B0C0E", boxShadow: `inset 0 0 0 1px ${hair(0.16)}`, fontFamily: MONO, fontSize: 28, fontWeight: 500, color: SOFT, letterSpacing: "0.1em", ...vs.style }}>VS</div>
    </div>
  );
};
