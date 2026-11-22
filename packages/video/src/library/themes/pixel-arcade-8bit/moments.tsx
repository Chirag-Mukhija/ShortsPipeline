// Arcade explainer pieces, part 2: the versus screen, the stacked-brick chart, the power-up key word and the stage-clear transition.
import type { FC } from "react";
import { AbsoluteFill, random } from "remotion";
import { W } from "../../core/video";
import { BitText, Place, PxText, Sprite, SpriteAnim } from "./pixel";
import { PixelWipe, Shake } from "./screen";
import { TITLE_BANDS } from "./pieces";
import { blinkOn, countStep, cycleCol, dropLook, hop, onN, pop, since, slide, typedN, useCue } from "./motion";
import { FLAG, SPARK, SPRITES, TROPHY, type SpriteName } from "./sprites";
import { CYAN, CYAN_DK, GROUND, GROUND_LT, INK, PINK, PINK_DK, SHADE, YELLOW, YELLOW_DK, snap } from "./theme";


export type Fighter = { name: string; sprite?: SpriteName; tag?: string; stats?: [string, number][] };
export type VersusProps = { at: number; left: Fighter; right: Fighter; vs?: number; stats?: number };

// A vs B as a fighting-game select screen: two coloured halves slam in on a stair-stepped diagonal, VS pops with a shake, stat bars fill a segment per 2 frames.
export const Versus: FC<VersusProps> = ({ at, left, right, vs = at + 0.45, stats = at + 0.9 }) => {
  const { f, lf } = useCue(at);
  const lv = since(f, vs);
  const ls = since(f, stats);
  const rows = 27;
  const edge = (r: number) => snap(1040 - (r * 160) / rows);
  const lx = slide(lf, -1100, 10);
  const rx = slide(lf, 1100, 10);
  const side = (fi: Fighter, cx: number, dir: 1 | -1, fill: string, line: string) => {
    const frames = SPRITES[fi.sprite ?? (dir === 1 ? "bit" : "glitch")];
    return (
      <>
        <Place x={cx} y={232}>
          <PxText text={fi.tag ?? (dir === 1 ? "1P" : "2P")} size={32} color={dir === 1 ? CYAN : PINK} lh={1} />
        </Place>
        <div style={{ position: "absolute", left: cx - 136, top: 560, width: 272, height: 16, background: SHADE, opacity: 0.6 }} />
        <Place x={cx} y={568} ay={1}>
          <SpriteAnim frames={frames} every={8} px={16} />
        </Place>
        <Place x={cx} y={656}>
          <BitText text={fi.name} px={10} outline={SHADE} shadow={line} />
        </Place>
        {(fi.stats ?? []).map(([label, v], r) => (
          <div key={r} style={{ position: "absolute", left: cx - 272, top: 744 + r * 72, display: "flex", alignItems: "center", gap: 24 }}>
            <PxText text={label.padEnd(4, " ")} size={28} lh={1} />
            <div style={{ display: "flex", gap: 8 }}>
              {Array.from({ length: 10 }, (_, i) => {
                const on = i < v && ls - r * 6 - i * 2 >= 0;
                return <div key={i} style={{ width: 32, height: 32, background: on ? YELLOW : fill, boxShadow: on ? `inset 0 -8px 0 ${YELLOW_DK}` : `inset 0 0 0 4px ${SHADE}` }} />;
              })}
            </div>
          </div>
        ))}
      </>
    );
  };
  const speed = (seed: number, color: string, dir: 1 | -1) =>
    Array.from({ length: 7 }, (_, i) => {
      const y = snap(120 + random(`vy${seed}${i}`) * 840);
      const len = snap(120 + random(`vl${seed}${i}`) * 260);
      const x = ((onN(f, 2) * 32 + random(`vx${seed}${i}`) * W) % (W + len)) - len;
      return <rect key={i} x={dir === 1 ? x : W - x - len} y={y} width={len} height={8} fill={color} opacity={0.45} />;
    });
  return (
    <Shake cues={[vs]} amp={8}>
      <AbsoluteFill style={{ background: SHADE }} />
      <AbsoluteFill style={{ transform: `translateX(${lx}px)`, clipPath: `polygon(${Array.from({ length: rows }, (_, r) => `${edge(r)}px ${r * 40}px, ${edge(r)}px ${(r + 1) * 40}px`).join(", ")}, 0 1080px, 0 0)` }}>
        <AbsoluteFill style={{ background: CYAN_DK }} />
        <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
          {speed(1, CYAN, 1)}
        </svg>
        {side(left, 456, 1, "rgba(5,7,26,0.35)", SHADE)}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${rx}px)`, clipPath: `polygon(${Array.from({ length: rows }, (_, r) => `${edge(r) + 24}px ${r * 40}px, ${edge(r) + 24}px ${(r + 1) * 40}px`).join(", ")}, ${W}px 1080px, ${W}px 0)` }}>
        <AbsoluteFill style={{ background: PINK_DK }} />
        <svg width={W} height={1080} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
          {speed(2, PINK, -1)}
        </svg>
        {side(right, 1472, -1, "rgba(5,7,26,0.35)", SHADE)}
      </AbsoluteFill>
      {lv >= 0 && (
        <Place x={968} y={440} style={{ scale: String(pop(lv)) }}>
          <BitText text="VS" px={24} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} />
        </Place>
      )}
    </Shake>
  );
};

export type ChartDatum = { label: string; value: number; at?: number };
export type PixelChartProps = { at: number; data: ChartDatum[]; max?: number; rows?: number; unit?: string; title?: string; highlight?: number; base?: number; hero?: boolean };

// A bar chart of stacked bricks: each brick drops one step into place on 2s, the value pops on top, the highlighted column is yellow and the hero hops onto it.
export const PixelChart: FC<PixelChartProps> = ({ at, data, max, rows = 8, unit = "", title, highlight, base = 840, hero = true }) => {
  const { f, lf } = useCue(at);
  const top = max ?? Math.max(...data.map((d) => d.value));
  const n = data.length;
  const step = 1440 / n;
  const bh = 48;
  const bw = snap(Math.min(176, step * 0.6));
  const cue = (i: number) => data[i]!.at ?? at + 0.3 + i * 0.35;
  return (
    <AbsoluteFill>
      {title && (
        <Place x={960} y={176}>
          <PxText text={title} size={40} color={CYAN} n={typedN(lf)} lh={1} />
        </Place>
      )}
      {Array.from({ length: rows / 2 }, (_, g) => (
        <div key={g} style={{ position: "absolute", left: 216, width: 1488, top: base - (g + 1) * 2 * bh, height: 4, backgroundImage: `repeating-linear-gradient(to right, ${GROUND} 0 16px, transparent 16px 32px)` }} />
      ))}
      <div style={{ position: "absolute", left: 216, width: 1488, top: base, height: 8, background: INK }} />
      {data.map((d, i) => {
        const cx = snap(240 + step * (i + 0.5));
        const k = d.value > 0 ? Math.max(1, Math.round((d.value / top) * rows)) : 0;
        const li = since(f, cue(i));
        const hi = i === highlight;
        const [c, lt, dk] = hi ? [YELLOW, INK, YELLOW_DK] : [GROUND_LT, "rgba(255,255,255,0.35)", GROUND];
        const landed = li - k * 2;
        return (
          <div key={i}>
            {Array.from({ length: k }, (_, j) => {
              const lj = li - j * 2;
              if (lj < 0) return null;
              const drop = lj < 2 ? -bh : 0;
              return (
                <div
                  key={j}
                  style={{ position: "absolute", left: cx - bw / 2, top: base - (j + 1) * bh + drop, width: bw, height: bh, background: c, boxShadow: `inset 0 -4px 0 ${SHADE}, inset 8px 8px 0 ${lt}, inset -8px -12px 0 ${dk}` }}
                />
              );
            })}
            {landed >= 2 && (
              <Place x={cx} y={base - k * bh - 56} style={{ scale: String(pop(landed - 2)) }}>
                <BitText text={`${d.value}${unit}`} px={6} color={hi ? YELLOW : INK} />
              </Place>
            )}
            <Place x={cx} y={base + 48}>
              <PxText text={d.label} size={28} color={hi ? YELLOW : INK} lh={1} />
            </Place>
            {hi && hero && landed >= 8 && (
              <Place x={cx} y={base - k * bh - 112 + hop(landed - 8, 12, 64)} ay={1}>
                <Sprite map={landed - 8 < 12 ? SPRITES.bitJump[0]! : SPRITES.bit[0]!} px={6} />
              </Place>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export type PowerUpProps = { at: number; word: string; label?: string; item?: SpriteName; y?: number; px?: number };

// The key word landing on its spoken word: a power-up pops out with a spark burst, the word pops letter by letter cycling colours, then settles.
export const PowerUp: FC<PowerUpProps> = ({ at, word, label = "POWER UP!", item = "chip", y = 560, px }) => {
  const { f, lf } = useCue(at);
  if (lf < 0) return null;
  const size = px ?? Math.min(20, Math.floor(1600 / (word.length * 7 + 3)));
  const iy = y - 260 + slide(lf, 64, 8);
  const lw = lf - 4;
  return (
    <Shake cues={[at + 4 / 30]} amp={4} d={8}>
      {lf >= 4 && lf < 6 && <AbsoluteFill style={{ boxShadow: `inset 0 0 0 16px ${YELLOW}` }} />}
      {lf >= 2 && lf < 14 && (
        <div style={{ position: "absolute", left: 960 - (64 + onN(lf, 2) * 16), top: iy - (64 + onN(lf, 2) * 16), width: (64 + onN(lf, 2) * 16) * 2, height: (64 + onN(lf, 2) * 16) * 2, boxShadow: `inset 0 0 0 8px ${cycleCol(f)}` }} />
      )}
      <Place x={960} y={iy} style={{ scale: String(pop(lf)) }}>
        <SpriteAnim frames={SPRITES[item]} every={4} px={12} />
      </Place>
      {lf >= 2 &&
        lf < 20 &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const r = 96 + onN(lf - 2, 2) * 14;
          if (lf > 14 && !blinkOn(lf, 4)) return null;
          return (
            <Place key={i} x={snap(960 + Math.cos(a) * r)} y={snap(iy + Math.sin(a) * r)}>
              <Sprite map={SPARK} px={8} />
            </Place>
          );
        })}
      <Place x={960} y={y + 40}>
        <BitText text={word} px={size} outline={SHADE} shadow={PINK_DK} ch={(i) => ({ s: pop(lw - i), color: lw - i < 24 ? cycleCol(f + i * 3) : YELLOW })} />
      </Place>
      {lf >= 10 && (lf > 40 || blinkOn(lf)) && (
        <Place x={960} y={y + 40 + size * 6 + 32}>
          <PxText text={label} size={32} color={PINK} lh={1} />
        </Place>
      )}
    </Shake>
  );
};

export type StageClearProps = { at: number; text?: string; bonus?: { label: string; value: number }[]; wipe?: boolean };

// Chapter end / transition: the screen opens with a column pixel-wipe, STAGE CLEAR drops in, the hero jumps by the trophy and the bonus tally counts up.
export const StageClear: FC<StageClearProps> = ({ at, text = "STAGE CLEAR!", bonus = [], wipe = true }) => {
  const { f, lf } = useCue(at);
  const c0 = wipe ? 10 : 0;
  const lc = lf - c0;
  const px = Math.min(14, Math.floor(1600 / (text.length * 7 + 3)));
  const settled = lc - text.length * 2 - 6;
  const tallyAt = text.length * 2 + 24;
  return (
    <AbsoluteFill>
      {lc >= 0 && (
        <>
          <Place x={960} y={272}>
            <BitText text={text} px={px} bands={settled >= 0 && settled < 30 ? undefined : TITLE_BANDS} color={cycleCol(f)} outline={SHADE} shadow={PINK_DK} ch={(i) => dropLook(lc - i * 2)} />
          </Place>
          <Place x={720} y={600 + hop((lc - 12) % 16, 14, 64)} ay={1}>
            <Sprite map={lc >= 12 && (lc - 12) % 16 < 14 ? SPRITES.bitJump[0]! : SPRITES.bit[0]!} px={10} />
          </Place>
          <Place x={960} y={600} ay={1} style={{ scale: String(pop(lc - 16)) }}>
            <Sprite map={TROPHY} px={14} />
          </Place>
          <Place x={1200} y={600} ay={1}>
            <Sprite map={FLAG} px={12} />
          </Place>
          <div style={{ position: "absolute", left: 600, width: 720, top: 600, height: 8, background: GROUND_LT }} />
          {bonus.map((b, i) => {
            const lb = lc - tallyAt - i * 18;
            if (lb < 0) return null;
            return (
              <div key={i} style={{ position: "absolute", left: 480, width: 960, top: 704 + i * 80, display: "flex", justifyContent: "space-between" }}>
                <PxText text={b.label} size={36} color={CYAN} n={typedN(lb)} lh={1} />
                <PxText text={String(countStep(lb - 4, 0, b.value, 20))} size={36} color={lb - 24 >= 0 && lb - 24 < 8 ? YELLOW : INK} lh={1} />
              </div>
            );
          })}
        </>
      )}
      {wipe && <PixelWipe at={at} mode="reveal" kind="columns" color={SHADE} />}
    </AbsoluteFill>
  );
};
