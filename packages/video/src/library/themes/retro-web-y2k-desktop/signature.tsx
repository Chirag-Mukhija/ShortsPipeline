// Signature moments only this theme does: the planet orbit menu, the frozen-dialog trail, the vaporwave media player, the dock a cursor opens, and the dial-up glitch cut.
import { useId, type FC, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTime } from "../../core/time";
import { H, W } from "../../core/video";
import { synthSpectrum, useSong } from "../../core/beat";
import { CREAM, CYAN, GREY, INK, LIME, MAGENTA, NAVY, ORANGE, PINK, PINK_HOT, PIXEL, SPACE, TEAL, UI, VIOLET, WHITE, WORD, YELLOW, dither, sunken } from "./theme";
import { Btn, Field, Marquee, OsWindow, type Rect } from "./chrome";
import { FakeCursor } from "./cursor";
import { COMPUTER, G_NEXT, G_PLAY, G_PREV, G_STOP, GLOBE, ICONS, MUSIC, Pix, WARN, type IconName } from "./pixels";
import { WordArt, type WordArtLook } from "./type";
import { blink, clamp, fr, lerp, local, popS, quant, rng } from "./motion";

// ---------- planets ----------
export type PlanetLook = { color: string; band: string; ring?: string };
export const PLANETS: PlanetLook[] = [
  { color: CYAN, band: "#0088AA" },
  { color: ORANGE, band: "#B03A00", ring: MAGENTA },
  { color: LIME, band: "#2F8A00" },
  { color: MAGENTA, band: VIOLET },
  { color: "#3D6BFF", band: CYAN, ring: YELLOW },
  { color: YELLOW, band: ORANGE },
  { color: PINK_HOT, band: "#7A1450", ring: CYAN },
];

// A drawn planet: lit radial body, two wavy bands, a checker-dithered night side and an optional tilted ring.
export const Planet: FC<{ r: number; look: PlanetLook; spin?: number }> = ({ r, look, spin = 0 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ring = (front: boolean) =>
    look.ring ? (
      <path
        d={front ? `M ${-r * 1.75} 0 A ${r * 1.75} ${r * 0.42} 0 0 0 ${r * 1.75} 0` : `M ${-r * 1.75} 0 A ${r * 1.75} ${r * 0.42} 0 0 1 ${r * 1.75} 0`}
        fill="none" stroke={look.ring} strokeWidth={r * 0.16} transform="rotate(-16)"
      />
    ) : null;
  return (
    <g>
      <defs>
        <radialGradient id={`g${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={WHITE} />
          <stop offset="28%" stopColor={look.color} />
          <stop offset="100%" stopColor={look.band} />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <circle r={r} />
        </clipPath>
        <pattern id={`d${id}`} width={6} height={6} patternUnits="userSpaceOnUse">
          <rect width={3} height={3} fill={INK} />
          <rect x={3} y={3} width={3} height={3} fill={INK} />
        </pattern>
      </defs>
      {ring(false)}
      <circle r={r} fill={`url(#g${id})`} />
      <g clipPath={`url(#c${id})`}>
        {[-0.35, 0.25].map((o, i) => (
          <path key={i} d={`M ${-r * 1.2 + (spin % (r * 0.8))} ${o * r} q ${r * 0.4} ${-r * 0.18} ${r * 0.8} 0 t ${r * 0.8} 0 t ${r * 0.8} 0`} fill="none" stroke={look.band} strokeWidth={r * 0.17} opacity={0.75} />
        ))}
        <circle cx={r * 0.55} cy={r * 0.5} r={r * 1.05} fill={`url(#d${id})`} opacity={0.55} />
      </g>
      <circle r={r} fill="none" stroke={INK} strokeWidth={4} />
      {ring(true)}
    </g>
  );
};

export type OrbitItem = { label: string; at: number; look?: PlanetLook };

export const PlanetOrbitMenu: FC<{ items: OrbitItem[]; logo: string; logoAt?: number; logoLook?: WordArtLook; cx?: number; cy?: number; rx?: number; ry?: number; r?: number; speed?: number; focus?: { index: number; at: number } }> = ({
  items, logo, logoAt, logoLook = "chrome", cx = 960, cy = 530, rx = 650, ry = 300, r = 74, speed = 0.06, focus,
}) => {
  const { f } = useTime();
  const n = items.length;
  const spin = (quant(f, 3) / 30) * speed;
  const focused = focus && local(f, focus.at) >= 0 ? focus.index : -1;
  const pl = items.map((it, i) => {
    const th = -Math.PI / 2 + (i / n) * Math.PI * 2 + spin;
    const depth = Math.sin(th);
    return { it, i, x: cx + Math.cos(th) * rx, y: cy + depth * ry, depth, s: (0.8 + 0.2 * (depth + 1) / 2) * popS(local(f, it.at)) };
  });
  const layer = (front: boolean) => (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {pl.filter((p) => (p.depth >= 0) === front && p.s > 0).sort((a, b) => a.depth - b.depth).map(({ it, i, x, y, s }) => {
        const dim = focused >= 0 && focused !== i;
        const on = focused === i;
        return (
          <g key={i} transform={`translate(${x} ${y})`} opacity={dim ? 0.5 : 1}>
            <g transform={`scale(${s})`}>
              <Planet r={r} look={it.look ?? PLANETS[i % PLANETS.length]!} spin={quant(f, 3) * 0.8} />
            </g>
            <text y={-r * s - 26} textAnchor="middle" fontFamily={WORD} fontSize={42} fill={on ? CYAN : YELLOW} stroke={INK} strokeWidth={9} paintOrder="stroke" strokeLinejoin="round">{it.label.toUpperCase()}</text>
            {on && (local(f, focus!.at) > 30 || blink(f, 2)) && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => {
              const o = r * s + 22;
              return <path key={k} d={`M ${sx! * o} ${sy! * o + -sy! * 26} V ${sy! * o} H ${sx! * o - sx! * 26}`} stroke={CYAN} strokeWidth={8} fill="none" />;
            })}
          </g>
        );
      })}
    </svg>
  );
  return (
    <>
      {layer(false)}
      <WordArt text={logo} x={cx} y={cy} size={150} at={logoAt} look={logoLook} shape="arch" />
      {layer(true)}
    </>
  );
};

// ---------- the frozen dialog trail ----------
// Dragging a dialog over a frozen screen leaves a copy every 2 frames; the last copy carries the message.
export const DialogCascade: FC<{ text: string; sub?: string; title?: string; at: number; count?: number; from?: { x: number; y: number }; to?: { x: number; y: number }; w?: number; h?: number; clearAt?: number }> = ({
  text, sub, title = "Warning", at, count = 12, from = { x: 140, y: 120 }, to = { x: 640, y: 380 }, w = 1000, h = 400, clearAt,
}) => {
  const { f } = useTime();
  const l = local(f, at);
  if (l < 0) return null;
  const shown = Math.min(count, Math.floor(l / 2) + 1);
  const lc = clearAt === undefined ? -1 : local(f, clearAt);
  const pos = (i: number) => ({ x: lerp(from.x, to.x, count > 1 ? i / (count - 1) : 1), y: lerp(from.y, to.y, count > 1 ? i / (count - 1) : 1) });
  const top = pos(shown - 1);
  const dragging = shown < count;
  return (
    <>
      {Array.from({ length: shown }, (_, i) => {
        if (i < shown - 1 && lc >= 0 && i < lc) return null;
        const p = pos(i);
        return (
          <OsWindow key={i} x={p.x} y={p.y} w={w} h={h} title={title} icon={WARN} body="grey" pad={34}>
            <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
              <Pix sprite={WARN} px={8} />
              <div>
                <div style={{ fontFamily: PIXEL, fontSize: 76, lineHeight: 1, color: INK }}>{text}</div>
                {sub && <div style={{ fontFamily: PIXEL, fontSize: 44, color: "#404040", marginTop: 10 }}>{sub}</div>}
              </div>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", gap: 20 }}>
              <Btn label="OK" w={200} primary />
              <Btn label="Cancel" w={200} />
            </div>
          </OsWindow>
        );
      })}
      <FakeCursor keys={[{ t: 0, x: top.x + w * 0.42, y: top.y + 28 }]} px={4} kinds={[[0, dragging ? "hand" : "arrow"]]} />
    </>
  );
};

// ---------- vaporwave media player ----------
const Palm: FC<{ x: number; y: number; s: number; flip?: boolean }> = ({ x, y, s, flip }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={INK}>
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={-6 + i * 2.2} y={-i * 22} width={14} height={20} />)}
    {[-150, -115, -70, -30, 10].map((a, i) => (
      <path key={i} d="M 0 0 q 40 -30 90 6 q -46 -16 -90 2 z" transform={`translate(24 -200) rotate(${a + 90})`} />
    ))}
  </g>
);

const Screen: FC<{ w: number; h: number; pulse: number; t: number }> = ({ w, h, pulse, t }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const hz = h * 0.6;
  const vx = w / 2;
  const phase = (quant(Math.round(t * 30), 2) / 30) * 0.9 % 1;
  const sr = h * 0.27 * (1 + pulse * 0.04);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A0742" />
          <stop offset="55%" stopColor={MAGENTA} />
          <stop offset="100%" stopColor={ORANGE} />
        </linearGradient>
        <linearGradient id={`sun${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={YELLOW} />
          <stop offset="100%" stopColor={PINK_HOT} />
        </linearGradient>
        <mask id={`m${id}`}>
          <rect width={w} height={h} fill={WHITE} />
          {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={0} y={hz - sr * 0.55 + k * sr * 0.2} width={w} height={3 + k * 3} fill="black" />)}
        </mask>
      </defs>
      <rect width={w} height={hz} fill={`url(#sky${id})`} />
      <circle cx={vx} cy={hz - sr * 0.15} r={sr} fill={`url(#sun${id})`} mask={`url(#m${id})`} />
      <polygon points={`0,${hz} ${w * 0.12},${hz - 70} ${w * 0.22},${hz - 30} ${w * 0.3},${hz - 95} ${w * 0.42},${hz} `} fill="#2A0B5A" stroke={CYAN} strokeWidth={3} />
      <polygon points={`${w * 0.58},${hz} ${w * 0.7},${hz - 85} ${w * 0.8},${hz - 40} ${w * 0.9},${hz - 110} ${w},${hz - 50} ${w},${hz}`} fill="#2A0B5A" stroke={CYAN} strokeWidth={3} />
      <rect y={hz} width={w} height={h - hz} fill="#160530" />
      <g stroke={MAGENTA} strokeWidth={3}>
        {Array.from({ length: 21 }, (_, k) => <line key={k} x1={vx + (k - 10) * 24} y1={hz} x2={vx + (k - 10) * 190} y2={h} />)}
        {Array.from({ length: 8 }, (_, j) => {
          const q = (j + phase) / 8;
          const yy = hz + (h - hz) * q * q;
          return <line key={j} x1={0} y1={yy} x2={w} y2={yy} />;
        })}
      </g>
      <Palm x={w * 0.1} y={h * 0.98} s={1.15} />
      <Palm x={w * 0.9} y={h * 0.98} s={0.95} flip />
    </svg>
  );
};

export type PlayerTrack = { title: string; artist: string; len: string };

export const PlayerWindow: FC<{ tracks: PlayerTrack[]; current?: number; title?: string; at?: number; seed?: number }> = ({ tracks, current = 0, title = "sunset.fm", at, seed = 3 }) => {
  const { f } = useTime();
  const { t, pulse, clock } = useSong();
  const spec = synthSpectrum(clock, t, 22, seed);
  const tr = tracks[current]!;
  const secs = Math.max(0, Math.floor(t));
  const time = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const SW = 860;
  const SH = 484;
  return (
    <OsWindow x={150} y={104} w={1620} h={836} title={title} icon={MUSIC} tone="pastel" body="cream" pad={24} at={at}>
      <div style={{ display: "flex", gap: 30, height: "100%" }}>
        <div style={{ width: SW, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ position: "relative", width: SW, height: SH, border: `3px solid ${INK}`, overflow: "hidden" }}>
            <Screen w={SW} h={SH} pulse={pulse} t={t} />
            <div style={{ position: "absolute", left: 22, top: 14, display: "flex", alignItems: "center", gap: 12, fontFamily: PIXEL, fontSize: 44, color: LIME, textShadow: `3px 3px 0 ${INK}` }}>
              <Pix sprite={G_PLAY} px={4} recolor={{ k: LIME }} />
              PLAY
            </div>
            <div style={{ position: "absolute", right: 22, top: 14, fontFamily: PIXEL, fontSize: 44, color: WHITE, textShadow: `3px 3px 0 ${INK}` }}>CH 03</div>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)" }} />
          </div>
          <div style={{ display: "flex", gap: 22, flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[G_PREV, G_PLAY, G_STOP, G_NEXT].map((g, i) => (
                  <Btn key={i} w={78} h={70} down={i === 1} style={{ padding: 0, background: i === 1 ? "#9FE8E0" : GREY }} label={<Pix sprite={g} px={4} />} />
                ))}
              </div>
              <div style={{ background: INK, ...sunken(), padding: "0 18px", height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: PIXEL, fontSize: 72, color: LIME }}>
                <span style={{ fontSize: 36, color: "#3E7A10" }}>TIME</span>
                {time}
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", gap: 4, alignItems: "flex-end", justifyContent: "space-between", padding: 10, background: INK, ...sunken(2) }}>
              {spec.map((v, i) => {
                // The synthetic spectrum sits low; stretch it so the peak section fills the meter.
                const lit = Math.max(1, Math.round(Math.min(1, v * 1.9) * 11));
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column-reverse", gap: 4 }}>
                    {Array.from({ length: 11 }, (_, k) => (
                      <div key={k} style={{ height: 10, background: k < lit ? (k > 8 ? MAGENTA : k > 6 ? YELLOW : LIME) : "#1C1C1C" }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 28, color: INK, display: "flex", alignItems: "center", gap: 12 }}>
            NOW PLAYING
            <span style={{ width: 16, height: 16, borderRadius: 8, background: blink(f, 1) ? "#FF2A2A" : "#7A2020", border: `2px solid ${INK}` }} />
          </div>
          <Field style={{ padding: "6px 14px" }}>
            <Marquee text={`${tr.title} - ${tr.artist}   ***`} width={600} size={50} speed={5} />
          </Field>
          <div style={{ fontFamily: UI, fontWeight: 700, fontSize: 28, color: INK, marginTop: 10 }}>PLAYLIST</div>
          <div style={{ background: WHITE, border: `3px solid ${INK}`, flex: 1, padding: 8 }}>
            {tracks.map((k, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 66, padding: "0 12px", fontFamily: PIXEL, fontSize: 46, background: i === current ? NAVY : "transparent", color: i === current ? WHITE : INK }}>
                <span style={{ width: 28 }}>{i === current && blink(f, 2) ? <Pix sprite={G_PLAY} px={4} recolor={{ k: YELLOW }} /> : null}</span>
                <span style={{ width: 44 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{k.title}</span>
                <span>{k.len}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: UI, fontSize: 28, color: INK }}>
            VOL
            <div style={{ flex: 1, height: 16, background: CREAM, ...sunken(2), position: "relative" }}>
              <div style={{ position: "absolute", left: "68%", top: -14, width: 26, height: 44, background: PINK, border: `3px solid ${INK}` }} />
            </div>
          </div>
        </div>
      </div>
    </OsWindow>
  );
};

// ---------- dock ----------
export type DockItem = { label: string; icon: IconName };
const CELL = 170;

export const dockRect = (n: number, i: number, y = H - 96 - CELL): Rect => ({ x: W / 2 - (n * CELL) / 2 + i * CELL, y, w: CELL, h: CELL });

export const DesktopDock: FC<{ items: DockItem[]; at?: number; hover?: number; down?: boolean; y?: number }> = ({ items, at = 0, hover = -1, down, y }) => {
  const { f } = useTime();
  return (
    <>
      {items.map((it, i) => {
        const r = dockRect(items.length, i, y);
        const s = popS(local(f, at) - i * 3);
        if (s <= 0) return null;
        const hv = hover === i;
        return (
          <div key={i} style={{ position: "absolute", left: r.x, top: r.y - (hv ? 14 : 0) + (hv && down ? 6 : 0), width: r.w, height: r.h, boxSizing: "border-box", background: hv ? PINK : CREAM, border: `3px solid ${INK}`, marginLeft: i ? -3 : 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, transform: `scale(${s})` }}>
            <Pix sprite={ICONS[it.icon]} px={5} />
            <div style={{ fontFamily: UI, fontSize: 28, color: INK }}>{it.label}</div>
          </div>
        );
      })}
    </>
  );
};

// The cursor glides to a dock icon, it lifts, a click, and a window zooms out of the icon.
export const DockOpen: FC<{ items: DockItem[]; open: number; at: number; win: Rect & { title: string }; start?: { x: number; y: number }; children?: ReactNode }> = ({ items, open, at, win, start = { x: 1500, y: 300 }, children }) => {
  const { f } = useTime();
  const t = f / 30;
  const r = dockRect(items.length, open);
  const target = { x: r.x + r.w * 0.62, y: r.y + r.h * 0.3 };
  const hover = t >= at - 0.35 ? open : -1;
  const down = local(f, at) >= 0 && local(f, at) < 3;
  return (
    <>
      <DesktopDock items={items} hover={hover} down={down} />
      <OsWindow {...win} tone="pastel" body="cream" icon={ICONS[items[open]!.icon]} at={at + 0.1} from={{ x: r.x, y: r.y - 14, w: r.w, h: r.h }}>
        {children}
      </OsWindow>
      <FakeCursor keys={[{ t: 0, x: start.x, y: start.y }, { t: at - 1.1, x: start.x, y: start.y }, { t: at - 0.25, x: target.x, y: target.y }]} clicks={[at]} />
    </>
  );
};

// ---------- dial-up glitch cut ----------
const BAND_COLS = [TEAL, MAGENTA, INK, WHITE, CYAN, NAVY];

// Horizontal bands of the scene slid sideways, some swapped for solid noise colours; re-rolled every 2 frames.
export const GlitchBands: FC<{ scene: ReactNode; seed: number; amount: number }> = ({ scene, seed, amount }) => {
  const r = rng(seed);
  const bands: { y: number; h: number; dx: number; col?: string }[] = [];
  let y = 0;
  while (y < H) {
    const h = 20 + Math.floor(r() * 110);
    const solid = r() < 0.28 * amount;
    bands.push({ y, h, dx: (r() - 0.5) * 260 * amount, col: solid ? BAND_COLS[Math.floor(r() * BAND_COLS.length)] : undefined });
    y += h;
  }
  return (
    <AbsoluteFill>
      {bands.map((b, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${b.y}px 0 ${Math.max(0, H - b.y - b.h)}px 0)`, transform: `translateX(${b.dx}px)` }}>
          {b.col ? <div style={{ position: "absolute", inset: 0, background: b.col, ...dither(b.col === INK ? "#333" : "rgba(0,0,0,0.25)", "transparent", 3) }} /> : scene}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const STATUS = ["Dialing...", "Handshaking... bee-boo-kssshh", "Connected at 56k!"];

const Connecting: FC<{ l: number; hold: number }> = ({ l, hold }) => {
  const k = Math.min(2, Math.floor((l / hold) * 3));
  return (
    <AbsoluteFill style={{ background: SPACE }}>
      <OsWindow x={460} y={320} w={1000} h={440} title="Dial-Up Connection" icon={COMPUTER} body="grey" pad={36}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <Pix sprite={COMPUTER} px={8} />
          <div style={{ display: "flex", gap: 18 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} style={{ width: 22, height: 22, background: quant(l, 3) / 3 % 6 === i ? YELLOW : GREY, border: `3px solid ${INK}` }} />
            ))}
          </div>
          <Pix sprite={GLOBE} px={8} />
        </div>
        <div style={{ fontFamily: PIXEL, fontSize: 50, color: INK, marginTop: 36, textAlign: "center" }}>{STATUS[k]}</div>
      </OsWindow>
    </AbsoluteFill>
  );
};

export const GlitchCut: FC<{ a: ReactNode; b: ReactNode; at: number; hold?: number; glitch?: number; seed?: number }> = ({ a, b, at, hold = 0.9, glitch = 8, seed = 11 }) => {
  const { f } = useTime();
  const l = local(f, at);
  const hf = fr(hold);
  if (l < 0) return <AbsoluteFill>{a}</AbsoluteFill>;
  if (l < glitch) return <GlitchBands scene={a} seed={seed * 97 + quant(l, 2)} amount={clamp((l + 2) / glitch)} />;
  if (l < glitch + hf) {
    const m = l - glitch;
    return m < 3 || m > hf - 3 ? <GlitchBands scene={<Connecting l={m} hold={hf} />} seed={seed * 131 + quant(m, 2)} amount={0.7} /> : <Connecting l={m} hold={hf} />;
  }
  const m = l - glitch - hf;
  if (m < glitch) return <GlitchBands scene={b} seed={seed * 71 + quant(m, 2)} amount={clamp(1 - m / glitch)} />;
  return <AbsoluteFill>{b}</AbsoluteFill>;
};
