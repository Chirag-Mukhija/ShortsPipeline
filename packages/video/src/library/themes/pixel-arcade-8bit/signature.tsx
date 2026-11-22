// Signature arcade moments: GAME OVER with a two-stage iris, the boss battle with hit-stop, the high-score table with initials entry, and the chiptune stage on the beat clock.
import type { FC } from "react";
import { AbsoluteFill, random } from "remotion";
import { holdFor, useSong, type Cue } from "../../core/beat";
import { useTime } from "../../core/time";
import { BitText, Place, PxText, Sprite, SpriteAnim } from "./pixel";
import { GROUND_Y, Iris, Shake } from "./screen";
import { TITLE_BANDS } from "./pieces";
import { blinkOn, cycleCol, dropLook, hop, onN, pop, since, typedN, useCue } from "./motion";
import { BIT_BLINK, COIN, CURSOR, SPARK, SPRITES, type SpriteName } from "./sprites";
import { CYAN, CYAN_DK, DANGER, DANGER_DK, GROUND, GROUND_LT, INK, PINK, PINK_DK, SHADE, YELLOW, YELLOW_DK, snap } from "./theme";

export type GameOverProps = { at: number; text?: string; cont?: boolean; count?: number };

// A failure beat: the hero is knocked out, the iris closes on it in two stages, GAME OVER types in red and CONTINUE? counts down.
export const GameOver: FC<GameOverProps> = ({ at, text = "GAME OVER", cont = true, count = 9 }) => {
  const { lf } = useCue(at);
  if (lf < 0) return null;
  const cy = GROUND_Y - 80;
  const black = lf >= 48;
  const ko = lf < 12 && !blinkOn(lf, 4);
  const textAt = 52;
  const contAt = textAt + text.length * 3 + 18;
  const left = Math.max(0, count - Math.floor(Math.max(0, lf - contAt) / 30));
  return (
    <AbsoluteFill>
      {!black && (
        <Place x={960} y={GROUND_Y} ay={1}>
          <Sprite map={SPRITES.bitKo[0]!} px={10} tint={ko ? INK : undefined} />
        </Place>
      )}
      <Iris at={at + 12 / 30} d={18} cx={960} cy={cy} to={136} />
      <Iris at={at + 42 / 30} d={6} cx={960} cy={cy} from={136} to={0} />
      {black && <AbsoluteFill style={{ background: SHADE }} />}
      {black && (
        <Place x={960} y={440}>
          <BitText text={text} px={16} color={DANGER} shadow={DANGER_DK} ch={(i) => ({ hide: lf - textAt - i * 3 < 0 })} />
        </Place>
      )}
      {black && cont && lf >= contAt && (
        <Place x={960} y={680}>
          <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
            <PxText text="CONTINUE?" size={40} color={blinkOn(lf - contAt, 16) ? INK : GROUND_LT} lh={1} />
            <BitText text={String(left)} px={10} color={YELLOW} shadow={YELLOW_DK} />
          </div>
        </Place>
      )}
    </AbsoluteFill>
  );
};

export type Hit = { at: number; dmg: number; label?: string };
export type BossBattleProps = { at: number; name: string; hits: Hit[]; boss?: SpriteName; tag?: string; segs?: number };

// A big problem being beaten down: the hero fires, each hit freezes the boss for 3 frames (hit-stop), flashes it white, shakes the screen and drains the HP bar a segment per 2 frames.
export const BossBattle: FC<BossBattleProps> = ({ at, name, hits, boss = "glitch", tag = "BOSS", segs = 20 }) => {
  const { f, lf } = useCue(at);
  const rel = hits.map((h) => since(f, h.at));
  // Hit-stop: the boss's own clock stops for 3 frames on every hit.
  const stopped = rel.reduce((s, r) => s + Math.min(3, Math.max(0, r)), 0);
  const fb = f - stopped;
  const drained = hits.reduce((s, h, i) => s + Math.min(Math.round(h.dmg * segs), Math.floor(Math.max(0, rel[i]!) / 2)), 0);
  const hp = Math.max(0, segs - drained);
  const total = hits.reduce((s, h) => s + h.dmg, 0);
  const lastRel = rel[rel.length - 1] ?? -1;
  const dead = total >= 0.999 && lastRel >= 8;
  const deadF = lastRel - 8;
  const flash = rel.some((r) => (r >= 0 && r < 2) || (r >= 4 && r < 6));
  const knock = rel.some((r) => r >= 0 && r < 6) ? 16 : 0;
  const firing = rel.findIndex((r) => r >= -8 && r < 0);
  const frames = SPRITES[boss];
  const bx = 1360;
  const by = 840 - (Math.floor(fb / 16) % 2 ? 8 : 0);
  return (
    <Shake cues={hits.map((h) => h.at)} amp={8}>
      <Place x={960} y={104}>
        <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
          <PxText text={tag} size={28} color={DANGER} lh={1} />
          <PxText text={name} size={40} lh={1} n={typedN(lf, 1)} />
        </div>
      </Place>
      <div style={{ position: "absolute", left: 320 - 16, top: 176, width: segs * 64 + 24, height: 72, background: SHADE, boxShadow: `inset 0 0 0 4px ${GROUND_LT}` }} />
      <div style={{ position: "absolute", left: 320, top: 192, display: "flex", gap: 8 }}>
        {Array.from({ length: segs }, (_, i) => {
          const on = i < hp;
          const low = hp <= segs / 4 && !blinkOn(f, 8);
          const ghost = !on && i < hp + 3 && rel.some((r) => r >= 0 && r < 14);
          return <div key={i} style={{ width: 56, height: 40, background: on ? (low ? DANGER_DK : DANGER) : ghost ? INK : GROUND, boxShadow: on ? `inset 0 -8px 0 ${DANGER_DK}, inset 0 8px 0 ${PINK}` : undefined }} />;
        })}
      </div>
      <Place x={520} y={GROUND_Y} ay={1}>
        <Sprite map={firing >= 0 ? SPRITES.bitJump[0]! : Math.floor(f / 6) % 14 === 0 ? BIT_BLINK : SPRITES.bit[0]!} px={10} />
      </Place>
      {firing >= 0 &&
        (() => {
          const p = (onN(rel[firing]!, 2) + 8) / 8;
          const x = snap(620 + (bx - 200 - 620) * p);
          const y = snap(860 + (680 - 860) * p);
          return (
            <>
              <div style={{ position: "absolute", left: x - 56, top: y + 4, width: 16, height: 16, background: CYAN_DK }} />
              <div style={{ position: "absolute", left: x - 32, top: y, width: 24, height: 24, background: CYAN }} />
              <div style={{ position: "absolute", left: x, top: y - 8, width: 48, height: 40, background: CYAN, boxShadow: `inset 0 0 0 8px ${INK}` }} />
            </>
          );
        })()}
      {!dead || (deadF < 16 && blinkOn(deadF, 4)) ? (
        <Place x={bx + knock} y={by} ay={1}>
          <SpriteAnim frames={frames} every={8} offset={-stopped} px={20} tint={flash ? INK : undefined} />
        </Place>
      ) : null}
      {dead &&
        deadF >= 0 &&
        deadF < 30 &&
        Array.from({ length: 14 }, (_, i) => {
          const k = onN(deadF, 2);
          const vx = (random(`bx${i}`) - 0.5) * 36;
          const vy = 18 + random(`by${i}`) * 22;
          return <div key={i} style={{ position: "absolute", left: snap(bx + vx * k * 0.6), top: snap(by - 160 - vy * k * 0.6 + 1.4 * k * k), width: 24, height: 24, background: i % 3 ? DANGER : YELLOW }} />;
        })}
      {hits.map((h, i) => {
        const r = rel[i]!;
        if (r < 0 || r >= 30 || (r > 20 && !blinkOn(r, 4))) return null;
        return (
          <Place key={i} x={bx} y={by - 400 - onN(r, 2) * 4}>
            <PxText text={h.label ?? `-${Math.round(h.dmg * 100)}%`} size={40} color={YELLOW} lh={1} />
          </Place>
        );
      })}
      {dead && deadF >= 24 && (
        <Place x={1200} y={520}>
          <BitText text="DEFEATED!" px={10} outline={SHADE} shadow={PINK_DK} color={cycleCol(f)} ch={(i) => ({ s: pop(deadF - 24 - i) })} />
        </Place>
      )}
    </Shake>
  );
};

export type ScoreRow = { name: string; score: number; at?: number };
export type HighScoreProps = { at: number; rows: ScoreRow[]; title?: string; fresh?: number; freshAt?: number };

const RANK_COL = [YELLOW, CYAN, PINK, INK, INK, INK, GROUND_LT];
const ordinal = (n: number) => `${n}${n === 1 ? "ST" : n === 2 ? "ND" : n === 3 ? "RD" : "TH"}`;
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// A ranking as the arcade high-score table: rows type in by rank colour, and the new entry spells its name with cycling letters and a blinking cursor.
export const HighScore: FC<HighScoreProps> = ({ at, rows, title = "HIGH SCORES", fresh, freshAt }) => {
  const { f, lf } = useCue(at);
  const tEntry = freshAt ?? at + 1.6;
  return (
    <AbsoluteFill>
      <Place x={960} y={176}>
        <BitText text={title} px={10} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} ch={(i) => dropLook(lf - i)} />
      </Place>
      {lf >= 8 && (
        <>
          {[["RANK", 360], ["SCORE", 680], ["NAME", 1160]].map(([h, x]) => (
            <Place key={h} x={Number(x)} y={296} ax={0}>
              <PxText text={String(h)} size={28} color={GROUND_LT} lh={1} />
            </Place>
          ))}
        </>
      )}
      {rows.map((r, i) => {
        const lr = since(f, r.at ?? at + 0.4 + i * 0.2);
        if (lr < 0) return null;
        const y = 384 + i * 96;
        const isNew = i === fresh;
        const le = since(f, tEntry);
        // Initials entry: each letter scrolls through the alphabet for 6 frames, then locks; untouched slots show "_".
        const per = 6;
        const name = isNew
          ? [...r.name]
              .map((ch, j) => {
                const lj = le - j * per;
                if (lj >= 6 || ch === " ") return lj >= 0 ? ch : "_";
                if (lj >= 0) return ABC[(ABC.indexOf(ch.toUpperCase()) + 26 - (3 - Math.floor(lj / 2))) % 26] ?? ch;
                return lj >= -per && !blinkOn(f) ? " " : "_";
              })
              .join("")
          : r.name;
        const done = isNew && le - r.name.length * per >= 0;
        const doneF = le - r.name.length * per;
        const col = isNew && done && doneF < 30 ? cycleCol(f) : RANK_COL[i] ?? INK;
        return (
          <div key={i}>
            {isNew && done && (
              <Place x={snap(272 + (blinkOn(f, 16) ? 0 : 8))} y={y} ax={0}>
                <Sprite map={CURSOR} px={7} />
              </Place>
            )}
            <Place x={360} y={y} ax={0}>
              <PxText text={ordinal(i + 1)} size={40} color={col} lh={1} n={typedN(lr)} />
            </Place>
            <Place x={680} y={y} ax={0}>
              <PxText text={String(r.score).padStart(7, "0")} size={40} color={col} lh={1} n={typedN(lr - 2, 1) * 2} />
            </Place>
            <Place x={1160} y={y} ax={0}>
              <PxText text={name} size={40} color={col} lh={1} n={isNew ? undefined : typedN(lr - 4, 1) * 2} />
            </Place>
            {isNew && done && blinkOn(f, 16) && (
              <Place x={1700} y={y}>
                <PxText text="NEW!" size={28} color={PINK} lh={1} />
              </Place>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export type ChipWord = { text: string; at: Cue };
export type ChipStageProps = { words?: ChipWord[]; bins?: number; hud?: boolean };

const LEVEL_COL = (lv: number) => (lv >= 11 ? DANGER : lv >= 9 ? PINK : lv >= 6 ? YELLOW : CYAN);

// Music-only stage, driven by the core beat clock (wrap it in <Track>): a block equaliser on 2s with falling peak caps, a marquee of lamps chasing the 8ths, the hero hopping every beat, a coin on every bar, and on-screen words held by the music-only rule.
export const ChipStage: FC<ChipStageProps> = ({ words = [], bins = 20, hud = true }) => {
  const { f: lf } = useTime();
  const { t, clock, energy, pos } = useSong();
  // Sample the song on 2s so the whole stage steps like an 8-bit screen.
  const ts = t - (lf % 2) / 30;
  const levels = (tt: number) => (tt < clock.off ? new Array<number>(bins).fill(0) : spectrum(clock, tt, bins).map((v) => Math.min(12, Math.round(Math.pow(Math.min(1, v), 0.8) * 12))));
  const now = levels(ts);
  const peaks = now.map((v, i) => {
    let m = v;
    for (let k = 1; k <= 10; k++) m = Math.max(m, levels(ts - (k * 2) / 30)[i]! - k * 0.6);
    return Math.floor(m);
  });
  const eighth = Math.floor(((ts - clock.off) / clock.spb) * 2);
  const beatF = Math.floor(pos.beatPhase * clock.spb * 30);
  const barF = Math.floor(pos.barPhase * clock.spBar * 30);
  const sec = clock.sectionAt(t);
  const x0 = 160;
  const base = 760;
  return (
    <AbsoluteFill>
      {hud && (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 160, background: SHADE }} />
          <Place x={96} y={40} ax={0} ay={0}>
            <PxText text="SCORE" size={28} color={PINK} lh={1.5} />
            <PxText text={String(Math.max(0, pos.beat + 1) * 50).padStart(6, "0")} size={40} lh={1.3} />
          </Place>
          <Place x={960} y={40} ay={0}>
            <PxText text={`BAR ${String(Math.max(1, pos.bar)).padStart(2, "0")}`} size={28} color={YELLOW} lh={1.5} align="center" />
            <PxText text={`STAGE ${(sec?.label ?? sec?.name ?? "").toUpperCase()}`} size={36} lh={1.4} align="center" />
          </Place>
          <Place x={1824} y={40} ax={1} ay={0}>
            <PxText text={`BPM ${clock.bpm}`} size={28} color={CYAN} lh={1.5} align="right" />
            <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{ width: 32, height: 40, background: i < Math.round(energy * 5) ? LEVEL_COL(6 + i * 1.3) : GROUND }} />
              ))}
            </div>
          </Place>
        </>
      )}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
        {now.map((lv, i) => (
          <g key={i}>
            {Array.from({ length: lv }, (_, j) => (
              <rect key={j} x={x0 + i * 80} y={base - (j + 1) * 32} width={64} height={24} fill={LEVEL_COL(j)} />
            ))}
            {peaks[i]! > lv && <rect x={x0 + i * 80} y={base - peaks[i]! * 32} width={64} height={16} fill={INK} />}
          </g>
        ))}
        <rect x={x0 - 16} y={base + 8} width={bins * 80 + 16} height={8} fill={GROUND_LT} />
        {Array.from({ length: 24 }, (_, i) => {
          const d = (((eighth % 24) - i) + 24) % 24;
          const c = d === 0 ? YELLOW : d === 1 ? PINK : d === 2 ? PINK_DK : GROUND;
          return <rect key={`l${i}`} x={64 + i * 80} y={GROUND_Y + 28} width={48} height={24} fill={eighth >= 0 ? c : GROUND} stroke={SHADE} strokeWidth={4} />;
        })}
      </svg>
      {words.map((w, i) => {
        const start = clock.cue(w.at);
        const end = start + holdFor(w.text.split(/\s+/).length);
        const lw = Math.round((t - start) * 30);
        if (t < start || t >= end) return null;
        if ((end - t) * 30 < 10 && !blinkOn(lw, 4)) return null;
        const px = Math.min(14, Math.floor(1500 / (w.text.length * 7 + 3)));
        return (
          <Place key={i} x={960} y={272}>
            <BitText text={w.text} px={px} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} ch={(k) => ({ s: pop(lw - k) })} />
          </Place>
        );
      })}
      {t >= clock.off && barF < 18 && (
        <Place x={960} y={snap(GROUND_Y - 200 - onN(barF, 2) * 6)}>
          <SpriteAnim frames={COIN} every={3} px={6} />
        </Place>
      )}
      {t >= clock.off &&
        pos.beatInBar === 1 &&
        beatF < 10 &&
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + 0.5;
          const r = 120 + onN(beatF, 2) * 12;
          return (
            <Place key={i} x={snap(960 + Math.cos(a) * r)} y={snap(GROUND_Y - 64 + Math.sin(a) * r * 0.6)}>
              <Sprite map={SPARK} px={5} />
            </Place>
          );
        })}
      <Place x={960} y={GROUND_Y + (t >= clock.off ? hop(beatF, Math.min(14, Math.floor(clock.spb * 30) - 2), snap(32 + energy * 64)) : 0)} ay={1}>
        <Sprite map={t >= clock.off && beatF < Math.min(14, Math.floor(clock.spb * 30) - 2) ? SPRITES.bitJump[0]! : SPRITES.bit[0]!} px={8} />
      </Place>
    </AbsoluteFill>
  );
};

// A spectrum shaped for the stage: bass on the left, sharper attack and a seeded shimmer so neighbouring bars differ.
const spectrum = (clock: ReturnType<typeof useSong>["clock"], t: number, bins: number) => {
  const kick = clock.pulse(t, 0.14);
  const hat = clock.eighth(t);
  const e = clock.energy(t);
  return Array.from({ length: bins }, (_, i) => {
    const u = i / (bins - 1);
    const ph = random(`cs${i}`) * Math.PI * 2;
    const shimmer = 0.5 + 0.5 * Math.sin(t * (2.1 + u * 7) + ph);
    const tilt = 0.75 + 0.25 * random(`ct${i}`);
    return (0.35 + 0.65 * e) * tilt * (kick * Math.pow(1 - u, 1.1) * 0.85 + hat * Math.pow(u, 0.7) * 0.55 + 0.2 + shimmer * 0.4);
  });
};
