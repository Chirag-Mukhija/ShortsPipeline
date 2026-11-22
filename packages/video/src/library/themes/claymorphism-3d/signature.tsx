// Clay signature moments: the corner blob wipe, a finger pressing a squishy button that bursts into clay balls, the poof exit, and a marble rolling through a clay-tube flow.
import type { FC, ReactNode } from "react";
import { Easing, random, spring } from "remotion";
import { INOUT, clamp01, ramp, useTime } from "../../core/time";
import { FPS, H, W } from "../../core/video";
import { ClayDefs, ClayScene, ContactShadow, Slab, Sweep, Thing, clayFill, clayFilter } from "./clay";
import { bodyTransform, drop, jelly, pop, press } from "./motion";
import { ClayIcon, type IconName } from "./icons";
import { Chip, Puffy } from "./type";
import { BUTTER, CLAYS, INK, LILAC, MINT, PINK, PUTTY, STONE, shade, tint } from "./theme";

type Corner = "br" | "bl" | "tr" | "tl";
const CORNERS: Record<Corner, [number, number]> = { br: [W, H], bl: [0, H], tr: [W, 0], tl: [0, 0] };

// 0 → 1 cover of the wipe, so the caller can swap scenes under it once it reads 1.
export const wipeCover = (t: number, at: number, dur = 0.8) => ramp(t, at, dur, INOUT);

// Scene transition: a lumpy clay blob swells from a corner until it fills the frame in the next scene's colour,
// with two small blobs bulging off its edge. Once covered it settles into that colour's studio sweep.
export const BlobWipe: FC<{ at: number; color: string; corner?: Corner; dur?: number }> = ({ at, color, corner = "br", dur = 0.8 }) => {
  const { t } = useTime();
  const e = wipeCover(t, at, dur);
  if (e <= 0) return null;
  if (e >= 1) return <Sweep color={color} />;
  const [cx, cy] = CORNERS[corner];
  const R = e * 2350;
  const pts = Array.from({ length: 73 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const r = R * (1 + 0.045 * Math.sin(a * 3 + t * 5) + 0.03 * Math.sin(a * 7 - t * 4));
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  });
  // The satellites ride just outside the edge on the side facing the frame centre.
  const toward = Math.atan2(H / 2 - cy, W / 2 - cx);
  const sats = [-0.38, 0.33].map((da, i) => {
    const a = toward + da;
    const r = R + 70 + 40 * Math.sin(t * 6 + i);
    const s = (60 + i * 30) * Math.sin(Math.PI * clamp01((e - 0.08) / 0.8));
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, s };
  });
  return (
    <>
      <ClayDefs />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g filter={clayFilter("xl")}>
          <polygon points={pts.join(" ")} fill={color} />
        </g>
      </svg>
      {sats.map((s, i) => s.s > 2 && (
        <div key={i} style={{ position: "absolute", left: s.x - s.s, top: s.y - s.s }}>
          <Slab w={s.s * 2} h={s.s * 2} r={s.s} color={color} size="m" />
        </div>
      ))}
    </>
  );
};

// The signature "generate" beat: a clay fingertip comes down, the button squishes into its base, and on release
// a burst of clay balls arcs out and lands with little squashes.
export const PressButton: FC<{ label: string; at: number; color?: string; base?: string; x?: number; y?: number; burst?: number; hold?: number }> = ({ label, at, color = PINK, base = BUTTER, x = 960, y = 560, burst = 9, hold = 0.2 }) => {
  const { t } = useTime();
  const p = press(t, at, hold);
  const arrive = pop(t, at - 1.0, { squash: 0.6 });
  const bw = 560;
  const bh = 180;
  const btnTop = y - bh / 2 - 40;
  const down = 36 * p;
  const release = at + 0.1 + hold;
  const fingerIn = ramp(t, at - 0.45, 0.45, Easing.inOut(Easing.quad));
  const fingerOut = ramp(t, release + 0.05, 0.45, Easing.in(Easing.quad));
  const tipY = btnTop - 620 + 620 * fingerIn - 760 * fingerOut + down;
  const floorY = y + 230;
  const g = 2800;
  return (
    <ClayScene>
      <ContactShadow x={x} y={y + 160} w={720} o={arrive.o} />
      {/* Base plate and button share one squash so the button reads as sitting in its socket. */}
      <div style={{ position: "absolute", left: x - 360, top: y - 40, width: 720, height: 200, transformOrigin: "50% 100%", transform: `scale(${arrive.sx}, ${arrive.sy})`, opacity: arrive.o }}>
        <Slab w={720} h={200} r={100} color={base} size="xl" floor />
      </div>
      <div style={{ position: "absolute", left: x - bw / 2, top: btnTop + down, width: bw, height: bh, transformOrigin: "50% 100%", transform: `scale(${arrive.sx * (1 + 0.05 * p)}, ${arrive.sy * (1 - 0.1 * p)})`, opacity: arrive.o }}>
        <Slab w={bw} h={bh} r={bh / 2} color={color} size="l">
          <Puffy text={label} size={76} />
        </Slab>
      </div>
      {Array.from({ length: burst }, (_, i) => {
        const a = (-160 + 140 * (i / Math.max(1, burst - 1)) + (random(`pa${i}`) - 0.5) * 14) * (Math.PI / 180);
        const v = 1050 + random(`pv${i}`) * 550;
        const vx = Math.cos(a) * v * 0.85;
        const vy = Math.sin(a) * v;
        const s = 40 + random(`ps${i}`) * 34;
        const y0 = btnTop + 30;
        // Landing time from y0 + vy·k + g·k²/2 = floor.
        const land = (-vy + Math.sqrt(vy * vy + 2 * g * (floorY - s / 2 - y0))) / g;
        const k = Math.min(t - release, land);
        if (t < release) return null;
        const bx = x + vx * k;
        const by = y0 + vy * k + 0.5 * g * k * k;
        const landed = t - release >= land;
        const sq = landed ? 1 - spring({ frame: (t - release - land) * FPS, fps: FPS, config: { stiffness: 260, damping: 10 } }) : 0;
        const c = CLAYS[i % CLAYS.length]!;
        return (
          <div key={i}>
            <ContactShadow x={bx} y={floorY + 4} w={s * 1.2} lift={clamp01((floorY - by) / 400)} o={0.8} />
            <div style={{ position: "absolute", left: bx - s / 2, top: by - s / 2, transformOrigin: "50% 100%", transform: `scale(${1 + 0.3 * sq}, ${1 - 0.35 * sq})` }}>
              <Slab w={s} h={s} r={s / 2} color={c} size="m" floor />
            </div>
          </div>
        );
      })}
      {tipY > -300 && (
        // The finger reaches in from above the frame: a long peach capsule, two knuckle creases, a nail and a lilac sleeve.
        <div style={{ position: "absolute", left: x + 40, top: tipY - 760, width: 136, height: 760, filter: clayFilter("l") }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: 68, background: clayFill("#F6C7A6") }} />
          {[250, 268].map((k) => (
            <div key={k} style={{ position: "absolute", left: 34, right: 34, bottom: k, height: 7, borderRadius: 4, background: shade("#F6C7A6", 0.18) }} />
          ))}
          <div style={{ position: "absolute", left: 30, bottom: 26, width: 76, height: 90, borderRadius: "40% 40% 46% 46%", background: tint(PINK, 0.6) }} />
          <div style={{ position: "absolute", left: -14, right: -14, top: 0, height: 330, borderRadius: 60, background: clayFill(LILAC) }} />
        </div>
      )}
    </ClayScene>
  );
};

// Exit for a debunked claim: the slab squashes flat, pops into three blobs and a puff of putty smoke, then `then` drops in.
export const Poof: FC<{ at: { in: number; poof: number; then?: number }; color: string; w: number; h: number; x?: number; y?: number; children: ReactNode; then?: { color: string; w: number; h: number; children: ReactNode } }> = ({ at, color, w, h, x = 960, y = 760, children, then }) => {
  const { t } = useTime();
  const b = drop(t, at.in, { h: 420 });
  const sq = ramp(t, at.poof, 0.14, Easing.in(Easing.quad));
  const gone = t >= at.poof + 0.14;
  const k = t - at.poof - 0.14;
  const cy = y - h * 0.35;
  return (
    <ClayScene>
      {!gone && (
        <Thing x={x} y={y} w={w} h={h} body={{ ...b, sx: b.sx * (1 + 0.45 * sq), sy: b.sy * (1 - 0.72 * sq) }} wobble={jelly(t, at.poof - 0.55, 0.08)}>
          <Slab w={w} h={h} r={Math.min(70, h / 2)} color={color} size="xl" floor>
            {children}
          </Slab>
        </Thing>
      )}
      {gone &&
        k < 0.9 &&
        [0, 1, 2].map((i) => {
          const a = ((-150 + i * 60 + (random(`pf${i}`) - 0.5) * 20) * Math.PI) / 180;
          const d = (300 + random(`pd${i}`) * 140) * Easing.out(Easing.cubic)(clamp01(k / 0.55));
          const s = h * 0.55 * (1 - ramp(k, 0.25, 0.45, Easing.in(Easing.quad))) * (0.7 + 0.15 * i);
          return s > 1 ? (
            <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * d - s / 2, top: cy + Math.sin(a) * d - s / 2 }}>
              <Slab w={s} h={s} r={s / 2} color={color} size="l" />
            </div>
          ) : null;
        })}
      {gone &&
        k < 0.8 &&
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const e = Easing.out(Easing.cubic)(clamp01(k / 0.5));
          const s = (70 + random(`sm${i}`) * 50) * (0.3 + e) * (1 - ramp(k, 0.4, 0.4));
          return s > 1 ? (
            <div key={`s${i}`} style={{ position: "absolute", left: x + Math.cos(a) * (w * 0.32) * e - s / 2, top: cy + Math.sin(a) * (h * 0.5) * e - s / 2 }}>
              <Slab w={s} h={s} r={s / 2} color={PUTTY} size="m" />
            </div>
          ) : null;
        })}
      {then && at.then !== undefined && (
        <Thing x={x} y={y} w={then.w} h={then.h} body={drop(t, at.then, { h: 460 })} wobble={jelly(t, at.then + 0.6, 0.06)}>
          <Slab w={then.w} h={then.h} r={Math.min(70, then.h / 2)} color={then.color} size="xl" floor>
            {then.children}
          </Slab>
        </Thing>
      )}
    </ClayScene>
  );
};

export type FlowStation = { icon: IconName; label: string; t: number; tile?: string };
type P = [number, number];
const bez = (a: P, b: P, c: P, d: P, u: number): P => {
  const v = 1 - u;
  return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]];
};

// A flow as a marble run: clay stations joined by a fat clay tube; a marble rolls into each station on its cue,
// the station gulps it with a wobble and its label pops.
export const MarbleFlow: FC<{ stations: FlowStation[]; at: number; y?: number; marble?: string; x0?: number; x1?: number }> = ({ stations, at, y = 470, marble = PINK, x0 = 330, x1 = 1590 }) => {
  const { t } = useTime();
  const n = stations.length;
  const pos: P[] = stations.map((_, i) => [x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y + (i % 2 ? 70 : -30)]);
  const segs = pos.slice(1).map((p, i) => {
    const a = pos[i]!;
    const dx = (p[0] - a[0]) / 2;
    const sag = i % 2 ? -150 : 170;
    return [a, [a[0] + dx, a[1] + sag], [p[0] - dx, p[1] + sag], p] as [P, P, P, P];
  });
  const d = segs.map(([a, b, c, e], i) => `${i ? "" : `M${a[0]} ${a[1]} `}C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${e[0]} ${e[1]}`).join(" ");
  const lens = segs.map((s) => {
    let L = 0;
    let prev = s[0];
    for (let k = 1; k <= 30; k++) {
      const q = bez(...s, k / 30);
      L += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      prev = q;
    }
    return L;
  });
  const total = lens.reduce((a, b) => a + b, 0);
  const draw = ramp(t, at + 0.3, 0.8, INOUT);
  // Which segment the marble is on: leaves station i just after its cue, reaches i+1 exactly on the next cue.
  let mp: P | null = null;
  let rolled = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = stations[i]!.t + 0.15;
    const e = stations[i + 1]!.t;
    if (t >= s && t < e) {
      const u = ramp(t, s, e - s, Easing.inOut(Easing.sin));
      mp = bez(...segs[i]!, u);
      rolled = lens.slice(0, i).reduce((a, b) => a + b, 0) + lens[i]! * u;
    }
  }
  const ms = 76;
  return (
    <ClayScene>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g filter={clayFilter("l", true)}>
          <path d={d} fill="none" stroke={tint(STONE, 0.3)} strokeWidth={70} strokeLinecap="round" strokeDasharray={`${total * draw} ${total}`} />
        </g>
        <path d={d} fill="none" stroke={shade(STONE, 0.12)} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${total * draw} ${total}`} opacity={0.35} />
      </svg>
      {mp && (
        <div style={{ position: "absolute", left: mp[0] - ms / 2, top: mp[1] - ms / 2, width: ms, height: ms, filter: clayFilter("m") }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: clayFill(marble), overflow: "hidden" }}>
            {/* A putty band shows the roll: it turns by distance / radius. */}
            <div style={{ position: "absolute", left: -10, right: -10, top: ms / 2 - 9, height: 18, background: PUTTY, transform: `rotate(${(rolled / (ms / 2)) * (180 / Math.PI)}deg)` }} />
          </div>
        </div>
      )}
      {stations.map((s, i) => {
        const [sx, sy] = pos[i]!;
        const b = pop(t, at + i * 0.12);
        const tag = pop(t, i === 0 ? s.t - 0.3 : s.t);
        const tile = s.tile ?? [BUTTER, MINT, LILAC, PINK][i % 4]!;
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: sx - 85, top: sy - 85, transformOrigin: "50% 80%", transform: bodyTransform(b, jelly(t, s.t, 0.14)), opacity: b.o }}>
              <ClayIcon icon={s.icon} tile={tile} size={170} />
            </div>
            <div style={{ position: "absolute", left: sx, top: sy + 150, transform: "translateX(-50%)" }}>
              <div style={{ transformOrigin: "50% 0%", transform: `scale(${tag.sx}, ${tag.sy})`, opacity: tag.o }}>
                <Chip label={s.label} color={PUTTY} textColor={INK} size={32} />
              </div>
            </div>
          </div>
        );
      })}
    </ClayScene>
  );
};

