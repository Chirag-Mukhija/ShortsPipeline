// Isometric objects built from blocks: server rack with blinking LEDs, buildings with windows and roofs, database cylinder, laptop, and the district plate they stand on.
import { useId, type FC, type ReactNode } from "react";
import { random } from "remotion";
import { useTime } from "../../core/time";
import { ACCENT, INK, LEDS, SIGNAL, toneOf, type Tone, type ToneName } from "./theme";
import { C30, S30, ViewCtx, faceQuad, floorMatrix, proj, pts, riseState, useView } from "./iso";
import { GroundShadow, IsoBlock } from "./primitives";

type Anim = { at?: number; out?: number; lift?: number; glow?: number };

// ---------- server rack ----------
// A stack of server units that pop in bottom-up, each with blinking status LEDs and a vent groove on every visible side.
export const IsoRack: FC<{ gx: number; gy: number; units?: number; w?: number; d?: number; tone?: ToneName; ledSeed?: number } & Anim> = ({ gx, gy, units = 5, w = 1, d = 1, tone = "ink", ledSeed = 1, at, out, lift = 0, glow = 0 }) => {
  const { f } = useTime();
  const uh = 0.34;
  const gap = 0.05;
  return (
    <>
      {Array.from({ length: units }, (_, i) => (
        <IsoBlock
          key={i}
          gx={gx}
          gy={gy}
          w={w}
          d={d}
          z={i * (uh + gap)}
          h={uh}
          tone={tone}
          at={at === undefined ? undefined : at + i * 0.07}
          out={out === undefined ? undefined : out + (units - 1 - i) * 0.05}
          lift={lift}
          glow={glow}
          shadow={i === 0}
          deco={(geo, v) =>
            geo.sides.map((s, j) => {
              const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
              const zc = s.z0 + uh / 2;
              const led = 0.09 / len;
              return (
                <g key={j}>
                  <polygon points={pts(faceQuad(v, s, 0.45, 0.9, zc - 0.025, zc + 0.025))} fill="#0B1022" opacity={0.55} />
                  {[0, 1, 2].map((k) => {
                    const on = random(`${ledSeed}-${i}-${j}-${k}-${Math.floor((f + k * 2) / 7)}`) < 0.72;
                    const col = LEDS[Math.floor(random(`${ledSeed}c${i}${j}${k}`) * LEDS.length)]!;
                    const s0 = 0.08 + k * (led + 0.05);
                    return <polygon key={k} points={pts(faceQuad(v, s, s0, s0 + led, zc - 0.045, zc + 0.045))} fill={on ? col : "#3A4570"} />;
                  })}
                </g>
              );
            })
          }
        />
      ))}
    </>
  );
};

// ---------- building ----------
// A block with floors of windows (some lit, flickering slowly) and a roof: flat tower with antenna, gable house, or flat roof with vents.
export const IsoBuilding: FC<{ gx: number; gy: number; w?: number; d?: number; floors?: number; style?: "tower" | "house" | "flat"; tone?: ToneName; roof?: ToneName; seed?: number } & Anim> = ({ gx, gy, w = 2, d = 2, floors = 4, style = "tower", tone = "white", roof = "blue", seed = 3, at, out, lift = 0, glow = 0 }) => {
  const { t, f } = useTime();
  const fh = 0.62;
  const H = floors * fh;
  const rt = toneOf(roof);
  return (
    <IsoBlock
      gx={gx}
      gy={gy}
      w={w}
      d={d}
      h={H}
      tone={tone}
      at={at}
      out={out}
      lift={lift}
      glow={glow}
      deco={(geo, v) => {
        const windows = geo.sides.flatMap((s, j) => {
          const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
          const cols = Math.max(1, Math.round(len * 1.6));
          const out: ReactNode[] = [];
          for (let fl = 0; fl < floors; fl++) {
            for (let c = 0; c < cols; c++) {
              const door = style === "house" && fl === 0 && j === 1 && c === Math.floor(cols / 2);
              const s0 = (c + 0.22) / cols;
              const s1 = (c + 0.78) / cols;
              const z0 = fl * fh + (door ? 0 : 0.16);
              const z1 = fl * fh + (door ? 0.5 : 0.46);
              const lit = random(`${seed}-${j}-${fl}-${c}-${Math.floor((f + c * 37 + fl * 13) / 75)}`) < 0.38;
              out.push(<polygon key={`${j}-${fl}-${c}`} points={pts(faceQuad(v, s, s0, s1, z0, z1))} fill={door ? INK : lit ? "#FFD98A" : "#2B3762"} opacity={door ? 1 : lit ? 1 : 0.82} />);
            }
          }
          return out;
        });
        let roofArt: ReactNode = null;
        if (style === "tower") {
          const [ax, ay] = proj(v, gx + w * 0.7, gy + d * 0.3, H);
          const blinkOn = Math.floor(t * 1.5) % 2 === 0;
          roofArt = (
            <>
              <IsoBlock gx={gx + w * 0.2} gy={gy + d * 0.45} w={w * 0.35} d={d * 0.35} z={H} h={0.3} tone="mist" shadow={false} />
              <line x1={ax} y1={ay} x2={ax} y2={ay - v.u * 0.9} stroke={INK} strokeWidth={3} strokeLinecap="round" />
              <circle cx={ax} cy={ay - v.u * 0.9} r={6} fill={blinkOn ? ACCENT : "#7A86AE"} />
            </>
          );
        } else if (style === "flat") {
          roofArt = (
            <>
              {[0, 1, 2].map((k) => (
                <IsoBlock key={k} gx={gx + 0.2 + k * ((w - 0.4) / 3)} gy={gy + d * 0.35} w={(w - 0.4) / 3 - 0.12} d={d * 0.3} z={H} h={0.16} tone="mist" shadow={false} />
              ))}
            </>
          );
        } else {
          // Gable roof, ridge along x; drawn for the default view (houses don't take part in turns).
          const r = Math.min(d, 2) * 0.42;
          const o = 0.1;
          const P = (x: number, y: number, z: number) => proj(v, x, y, z);
          const back = [P(gx - o, gy - o, H), P(gx + w + o, gy - o, H), P(gx + w + o, gy + d / 2, H + r), P(gx - o, gy + d / 2, H + r)];
          const gable = [P(gx + w, gy, H), P(gx + w, gy + d, H), P(gx + w, gy + d / 2, H + r)];
          const front = [P(gx - o, gy + d + o, H), P(gx + w + o, gy + d + o, H), P(gx + w + o, gy + d / 2, H + r), P(gx - o, gy + d / 2, H + r)];
          const wallR = geo.sides.find((s) => s.k > 0.5)?.color ?? toneOf(tone).right;
          roofArt = (
            <>
              <polygon points={pts(back)} fill={rt.right} stroke={rt.right} strokeWidth={0.8} />
              <polygon points={pts(gable)} fill={wallR} stroke={wallR} strokeWidth={0.8} />
              <polygon points={pts(front)} fill={rt.left} stroke={rt.left} strokeWidth={0.8} />
              <line x1={front[3]![0]} y1={front[3]![1]} x2={front[2]![0]} y2={front[2]![1]} stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={2} />
            </>
          );
        }
        return (
          <>
            {windows}
            {roofArt}
          </>
        );
      }}
    />
  );
};

// ---------- database ----------
// A banded cylinder (the universal "database"), shaded across its curve from the left face to the right face colour.
export const IsoDatabase: FC<{ cx: number; cy: number; r?: number; h?: number; bands?: number; tone?: ToneName } & Anim> = ({ cx, cy, r = 0.6, h = 1.3, bands = 3, tone = "blue", at, out, lift = 0, glow = 0 }) => {
  const v = useView();
  const { t } = useTime();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const st = riseState(t, at, out);
  if (!st.visible) return null;
  const tn = toneOf(tone);
  const rx = r * v.u * Math.SQRT2 * C30;
  const ry = r * v.u * Math.SQRT2 * S30;
  const [bx, by] = proj(v, cx, cy, 0);
  const yTop = by - h * v.u;
  const arc = (y: number) => `M${bx - rx} ${y} A${rx} ${ry} 0 0 0 ${bx + rx} ${y}`;
  return (
    <g opacity={st.op}>
      <GroundShadow x={cx - r} y={cy - r} w={2 * r} d={2 * r} scale={st.k * st.scale * (1 - 0.12 * lift)} />
      <g
        transform={`translate(${bx} ${by + st.dy - 12 * lift}) scale(${st.scale}) translate(${-bx} ${-by})`}
        style={glow > 0 ? { filter: `drop-shadow(0 0 ${18 * glow}px rgba(255,122,89,${0.75 * glow}))` } : undefined}
      >
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={tn.left} />
            <stop offset="0.55" stopColor={tn.left} />
            <stop offset="1" stopColor={tn.right} />
          </linearGradient>
        </defs>
        <path d={`M${bx - rx} ${yTop} L${bx - rx} ${by} A${rx} ${ry} 0 0 0 ${bx + rx} ${by} L${bx + rx} ${yTop} Z`} fill={`url(#g${id})`} />
        {Array.from({ length: bands - 1 }, (_, i) => (
          <path key={i} d={arc(by - ((i + 1) * h * v.u) / bands)} fill="none" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={3} />
        ))}
        <ellipse cx={bx} cy={yTop} rx={rx} ry={ry} fill={tn.top} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={2} />
        <ellipse cx={bx - rx * 0.62} cy={by - (h * v.u) / bands / 2 + ry * 0.55} rx={5} ry={5} fill={SIGNAL} />
      </g>
    </g>
  );
};

// ---------- laptop ----------
// The client: a thin base with a keyboard and a standing screen showing a few lines of code.
export const IsoLaptop: FC<{ gx: number; gy: number; s?: number } & Anim> = ({ gx, gy, s = 1, at, out, lift = 0, glow = 0 }) => {
  const w = 1.4 * s;
  const d = 1.0 * s;
  const lines: [number, number, string][] = [[0.12, 0.55, SIGNAL], [0.2, 0.75, "#AFC0EE"], [0.2, 0.62, "#AFC0EE"], [0.12, 0.4, ACCENT]];
  return (
    <>
      <IsoBlock
        gx={gx} gy={gy} w={w} d={d} h={0.08 * s} tone="white" at={at} out={out} lift={lift} glow={glow}
        deco={(_, v) => (
          <g transform={floorMatrix(v, gx, gy, 0.08 * s)}>
            {Array.from({ length: 3 }, (_, row) => (
              <rect key={row} x={0.18 * s} y={(0.3 + row * 0.16) * s} width={w - 0.36 * s} height={0.1 * s} rx={0.02} fill="#C1D0F1" />
            ))}
            <rect x={w * 0.35} y={0.8 * s} width={w * 0.3} height={0.12 * s} rx={0.02} fill="#C1D0F1" />
          </g>
        )}
      />
      <IsoBlock
        gx={gx} gy={gy} w={w} d={0.07 * s} z={0.08 * s} h={0.92 * s} tone="ink" shadow={false} at={at === undefined ? undefined : at + 0.1} out={out} lift={lift} glow={glow}
        deco={(geo, v) => {
          const front = geo.sides.find((f) => f.k < 0.5);
          if (!front) return null;
          const z0 = 0.08 * s;
          const span = (a: number) => z0 + 0.92 * s * a;
          return (
            <>
              <polygon points={pts(faceQuad(v, front, 0.06, 0.94, span(0.1), span(0.92)))} fill="#10172E" />
              {lines.map(([a, b, c], i) => (
                <polygon key={i} points={pts(faceQuad(v, front, a, b, span(0.74 - i * 0.16), span(0.8 - i * 0.16)))} fill={c} />
              ))}
            </>
          );
        }}
      />
    </>
  );
};

// ---------- plate ----------
// A district plate (a floating slab of world) with its own tile grid on top; everything in a scene stands on one.
export const IsoPlate: FC<{ gx: number; gy: number; w: number; d: number; h?: number; tone?: ToneName | Tone; grid?: boolean; at?: number; out?: number; children?: ReactNode }> = ({ gx, gy, w, d, h = 0.35, tone = "white", grid = true, at, out, children }) => {
  const parent = useView();
  return (
  <IsoBlock
    gx={gx} gy={gy} w={w} d={d} h={h} tone={tone} at={at} out={out}
    deco={(_, v) => (
      <>
        {grid && (
          <g transform={floorMatrix(v, gx, gy, h)} stroke={INK} strokeOpacity={0.1} strokeWidth={0.03} fill="none">
            {Array.from({ length: Math.floor(w) - 1 }, (_, i) => <line key={`x${i}`} x1={i + 1} y1={0.08} x2={i + 1} y2={d - 0.08} />)}
            {Array.from({ length: Math.floor(d) - 1 }, (_, i) => <line key={`y${i}`} x1={0.08} y1={i + 1} x2={w - 0.08} y2={i + 1} />)}
          </g>
        )}
        <ViewCtx.Provider value={{ ...parent, gz: parent.gz + h }}>{children}</ViewCtx.Provider>
      </>
    )}
  />
  );
};

// Lays a flat drawing (text, a number) on a top face; local units are grid units.
export const OnFloor: FC<{ x: number; y: number; z: number; children?: ReactNode }> = ({ x, y, z, children }) => {
  const v = useView();
  return <g transform={floorMatrix(v, x, y, z)}>{children}</g>;
};

