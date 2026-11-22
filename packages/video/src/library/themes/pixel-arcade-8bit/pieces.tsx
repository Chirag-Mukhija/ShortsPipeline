// Arcade explainer pieces, part 1: title screen, blinking prompt, top HUD, the hero's progress run, score counter, level card, level select, item-get source tag and dialogue box.
import type { FC } from "react";
import { AbsoluteFill } from "remotion";
import { W } from "../../core/video";
import { useTime } from "../../core/time";
import { BitText, Panel, Place, PxText, Sprite, SpriteAnim } from "./pixel";
import { GROUND_Y } from "./screen";
import { blinkOn, countStep, cycleCol, dropLook, onN, pop, punch, since, slide, stepP, typedN, useCue } from "./motion";
import { COIN, CURSOR, FLAG, HEART, HEART_EMPTY, LOCK, SPRITES, type SpriteName } from "./sprites";
import { CYAN, CYAN_DK, DANGER, GROUND, GROUND_LT, INK, NIGHT, PINK, PINK_DK, SHADE, YELLOW, YELLOW_DK, snap } from "./theme";

export const TITLE_BANDS = [INK, YELLOW, YELLOW, YELLOW_DK, YELLOW_DK, PINK, PINK];
const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, "0");


// "PRESS START": blinks at hz from a cue.
export const BlinkPrompt: FC<{ text?: string; x?: number; y?: number; from?: number; hz?: number; size?: number; color?: string }> = ({ text = "PRESS START", x = 960, y = 760, from = 0, hz = 2, size = 40, color = INK }) => {
  const { f } = useTime();
  const lf = since(f, from);
  if (lf < 0 || !blinkOn(lf, Math.round(30 / hz))) return null;
  return (
    <Place x={x} y={y}>
      <PxText text={text} size={size} color={color} lh={1} />
    </Place>
  );
};

export type TitleScreenProps = { title: string[]; sub?: string; at?: number; prompt?: string; px?: number; hud?: boolean; walker?: boolean };

// The hook card as an arcade attract screen: banded bitmap logo dropping in letter by letter, a typed subtitle, blinking PRESS START and the hero walking the floor.
export const TitleScreen: FC<TitleScreenProps> = ({ title, sub, at = 0, prompt = "PRESS START", px: pxIn, hud = true, walker = true }) => {
  const { lf } = useCue(at);
  const px = pxIn ?? Math.min(20, Math.floor(1600 / (Math.max(...title.map((l) => l.length)) * 7 + 3)));
  const lineH = 10 * px + 24;
  const top = 400 - (title.length * lineH) / 2;
  const starts = title.map((_, L) => title.slice(0, L).join("").length);
  const total = title.join("").length;
  const subAt = total * 2 + 8;
  const promptAt = subAt + (sub?.length ?? 0) + 12;
  const walkX = (-160 + onN(lf, 2) * 4) % (W + 320);
  return (
    <AbsoluteFill>
      {hud && (
        <>
          <Place x={160} y={88} ax={0}>
            <PxText text="1P" size={32} color={PINK} lh={1} />
            <PxText text="000000" size={32} lh={1.6} />
          </Place>
          <Place x={960} y={88}>
            <PxText text="HI-SCORE" size={32} color={YELLOW} lh={1} align="center" />
            <PxText text="058300" size={32} lh={1.6} align="center" />
          </Place>
          <Place x={1760} y={88} ax={1}>
            <PxText text="2P" size={32} color={CYAN} lh={1} align="right" />
            <PxText text="------" size={32} color={GROUND_LT} lh={1.6} align="right" />
          </Place>
        </>
      )}
      {title.map((line, L) => (
        <Place key={L} x={960} y={top + L * lineH} ay={0}>
          <BitText text={line} px={px} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} ch={(i) => dropLook(lf - (starts[L]! + i) * 2)} />
        </Place>
      ))}
      {sub && (
        <Place x={960} y={top + title.length * lineH + 40}>
          <PxText text={sub} size={32} color={CYAN} n={typedN(lf - subAt)} lh={1} />
        </Place>
      )}
      {prompt && lf >= promptAt && (
        <>
          <BlinkPrompt text={prompt} y={800} from={at + promptAt / 30} />
          {[-1, 1].map((s) => (
            <Place key={s} x={960 + s * (prompt.length * 20 + 72)} y={800}>
              <SpriteAnim frames={COIN} every={4} px={6} />
            </Place>
          ))}
        </>
      )}
      {walker && lf >= 0 && (
        <Place x={walkX} y={GROUND_Y} ay={1}>
          <SpriteAnim frames={SPRITES.bit} every={6} px={8} />
        </Place>
      )}
    </AbsoluteFill>
  );
};

export type HudProps = {
  at?: number;
  score?: { from?: number; to: number; at: number; d?: number };
  level?: string;
  lives?: number;
  // Seconds at which a life is lost (the heart blinks, then empties).
  lose?: number[];
  // Seconds at which each stage segment fills.
  stage?: number[];
  segs?: number;
};

// The top HUD that can sit over a whole video: score ticking up, stage segments filling on cues, level and hearts.
export const HudBar: FC<HudProps> = ({ at = 0, score, level = "1-1", lives = 3, lose = [], stage = [], segs = 10 }) => {
  const { f, t, lf } = useCue(at);
  const y = slide(lf, -168, 10);
  const sc = score ? countStep(since(f, score.at), score.from ?? 0, score.to, score.d ?? 30) : 0;
  const filled = stage.filter((s) => t >= s).length;
  const newest = stage[filled - 1];
  return (
    <AbsoluteFill style={{ transform: `translateY(${y}px)` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 168, background: SHADE }} />
      <div style={{ position: "absolute", left: 0, top: 168, width: W, height: 8, background: GROUND }} />
      <Place x={96} y={40} ax={0} ay={0}>
        <PxText text="SCORE" size={28} color={PINK} lh={1.5} />
        <PxText text={pad(sc, 6)} size={40} lh={1.3} />
      </Place>
      <Place x={560} y={40} ax={0} ay={0}>
        <PxText text="STAGE" size={28} color={YELLOW} lh={1.5} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {Array.from({ length: segs }, (_, i) => {
            const on = i < filled;
            const flash = on && i === filled - 1 && newest !== undefined && since(f, newest) < 10 && !blinkOn(since(f, newest), 4);
            return <div key={i} style={{ width: 40, height: 40, background: on ? (flash ? INK : CYAN) : GROUND, boxShadow: on ? `inset 0 -8px 0 ${CYAN_DK}` : `inset 0 -8px 0 ${NIGHT}` }} />;
          })}
        </div>
      </Place>
      <Place x={1176} y={40} ax={0} ay={0}>
        <PxText text="LEVEL" size={28} color={CYAN} lh={1.5} />
        <PxText text={level} size={40} lh={1.3} />
      </Place>
      <Place x={1824} y={40} ax={1} ay={0}>
        <PxText text="LIVES" size={28} color={DANGER} lh={1.5} align="right" />
        <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
          {Array.from({ length: lives }, (_, i) => {
            // Hearts are lost from the right.
            const k = lives - 1 - i;
            const cue = lose[k];
            const lost = cue !== undefined && t >= cue;
            const blinking = lost && since(f, cue) < 16;
            const map = lost && !(blinking && blinkOn(since(f, cue), 4)) ? HEART_EMPTY : HEART;
            return <Sprite key={i} map={map} px={8} />;
          })}
        </div>
      </Place>
    </AbsoluteFill>
  );
};

export type ProgressRunProps = { from: number; to: number; labels?: [string, string]; marks?: { p: number; label?: string }[] };

// Where we are in the video: the hero walks the floor from START to the goal flag, collecting a coin at each chapter mark.
export const ProgressRun: FC<ProgressRunProps> = ({ from, to, labels = ["START", "GOAL"], marks = [] }) => {
  const { f } = useTime();
  const x0 = 192;
  const x1 = 1640;
  const ts = onN(f, 2) / 30;
  const p = Math.min(1, Math.max(0, (ts - from) / (to - from)));
  const x = snap(x0 + (x1 - x0) * p);
  const moving = p > 0 && p < 1;
  return (
    <AbsoluteFill>
      <Place x={x0 - 48} y={GROUND_Y - 200} ax={0}>
        <PxText text={labels[0]} size={28} color={GROUND_LT} lh={1} />
      </Place>
      <Place x={1760} y={GROUND_Y} ax={0.5} ay={1}>
        <Sprite map={FLAG} px={10} />
      </Place>
      <Place x={1760} y={GROUND_Y - 200}>
        <PxText text={labels[1]} size={28} color={p >= 1 ? cycleCol(f) : PINK} lh={1} />
      </Place>
      {marks.map((m, i) => {
        const mx = snap(x0 + (x1 - x0) * m.p) + 56;
        const passedAt = from + (to - from) * m.p;
        const lp = since(f, passedAt);
        return (
          <div key={i}>
            {lp < 0 && (
              <Place x={mx} y={GROUND_Y - 200}>
                <SpriteAnim frames={COIN} every={4} offset={i * 2} px={6} />
              </Place>
            )}
            {lp >= 0 && lp < 24 && (
              <Place x={mx} y={GROUND_Y - 220 - onN(lp, 2) * 4}>
                <PxText text={m.label ?? "+100"} size={28} color={YELLOW} lh={1} />
              </Place>
            )}
          </div>
        );
      })}
      <Place x={x + 56} y={GROUND_Y} ay={1}>
        {moving ? <SpriteAnim frames={SPRITES.bit} every={6} px={8} /> : <Sprite map={p >= 1 ? SPRITES.bitJump[0]! : SPRITES.bit[0]!} px={8} />}
      </Place>
    </AbsoluteFill>
  );
};

export type ScoreCounterProps = { at: number; to: number; from?: number; d?: number; pad?: number; label?: string; sub?: string; unit?: string; x?: number; y?: number; px?: number; coins?: boolean };

// The big stat: zero-padded arcade digits tick up on 2s (leading zeros stay dim), punch on landing, coins burst and the context line arrives after.
export const ScoreCounter: FC<ScoreCounterProps> = ({ at, to, from = 0, d = 36, pad: w = 6, label, sub, unit = "", x = 960, y = 500, px = 24, coins = true }) => {
  const { f, lf } = useCue(at);
  const v = countStep(lf, from, to, d);
  const digits = pad(v, w) + unit;
  const lead = digits.length - unit.length - String(Math.round(v)).length;
  const land = lf - d;
  const s = punch(land);
  return (
    <AbsoluteFill>
      {label && (
        <Place x={x} y={y - 210}>
          <PxText text={label} size={40} color={CYAN} n={typedN(lf + 12)} lh={1} />
        </Place>
      )}
      <Place x={x} y={y} style={{ scale: String(s) }}>
        <BitText text={digits} px={px} outline={SHADE} shadow={YELLOW_DK} ch={(i) => ({ shadow: i < lead ? false : undefined, color: i < lead ? GROUND : i >= digits.length - unit.length ? INK : land >= 0 && land < 8 ? cycleCol(f) : YELLOW })} />
      </Place>
      {coins &&
        land >= 0 &&
        land < 30 &&
        Array.from({ length: 8 }, (_, i) => {
          const k = onN(land, 2);
          const vx = (i - 3.5) * 14;
          const vy = 34 + (i % 3) * 6;
          const cx = snap(x + vx * k * 0.5);
          const cy = snap(y - 80 - vy * k * 0.5 + 1.1 * k * k);
          return (
            <Place key={i} x={cx} y={cy}>
              <SpriteAnim frames={COIN} every={3} offset={i} px={6} />
            </Place>
          );
        })}
      {sub && (
        <Place x={x} y={y + 200}>
          <PxText text={sub} size={36} color={INK} n={typedN(land - 8)} lh={1} />
        </Place>
      )}
    </AbsoluteFill>
  );
};

export type LevelCardProps = { at: number; level: string; title: string; out?: number };
const STRIPES = [PINK, YELLOW, CYAN, PINK, YELLOW, CYAN];

// Chapter card: six neon stripes wipe across on 2s, retract to reveal a dark band with LEVEL n popping and the chapter name typed under it.
export const LevelCard: FC<LevelCardProps> = ({ at, level, title, out }) => {
  const { f, lf } = useCue(at);
  const sh = 1080 / STRIPES.length;
  const outF = out === undefined ? -1 : since(f, out);
  const band = outF >= 0 ? 1 - stepP(outF, 8) : stepP(lf - 12, 6);
  const bandH = snap(400 * band);
  return (
    <AbsoluteFill>
      {bandH > 0 && (
        <div style={{ position: "absolute", left: 0, width: W, top: 540 - bandH / 2, height: bandH, background: NIGHT, borderTop: `8px solid ${INK}`, borderBottom: `8px solid ${INK}`, boxShadow: `0 12px 0 ${SHADE}` }} />
      )}
      {band >= 1 && outF < 0 && (
        <>
          <Place x={960} y={470}>
            <BitText text={level} px={16} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} ch={(i) => ({ s: pop(lf - 20 - i * 2) })} />
          </Place>
          <Place x={960} y={640}>
            <PxText text={title} size={48} n={typedN(lf - 30)} lh={1} />
          </Place>
          <Place x={240} y={640}>
            <SpriteAnim frames={SPRITES.bit} every={6} px={6} />
          </Place>
          <Place x={1680} y={640}>
            <Sprite map={FLAG} px={6} />
          </Place>
        </>
      )}
      {STRIPES.map((c, i) => {
        // In from the left, then out to the right, each stripe 2 frames behind the one above.
        const inP = stepP(lf - i * 2, 8);
        const outP = stepP(lf - 12 - i * 2, 8);
        const x0 = snap(W * outP);
        const x1 = snap(W * inP);
        if (x1 <= x0) return null;
        return <div key={i} style={{ position: "absolute", top: i * sh, height: sh, left: x0, width: x1 - x0, background: c, boxShadow: `inset 0 -16px 0 rgba(5,7,26,0.25)` }} />;
      })}
    </AbsoluteFill>
  );
};

export type LevelItem = { label: string; at: number; tag?: string };
export type LevelSelectProps = { at: number; items: LevelItem[]; title?: string; world?: number };

// A list or steps as a stage-select menu: rows wait locked, unlock on their cue with the cursor hopping down, and finished rows get a flag.
export const LevelSelect: FC<LevelSelectProps> = ({ at, items, title = "SELECT STAGE", world = 1 }) => {
  const { f, t, lf } = useCue(at);
  const rowH = 120;
  const panelH = items.length * rowH + 64;
  const panelY = snap(560 - panelH / 2 + 40);
  const active = items.reduce((a, it, i) => (t >= it.at ? i : a), -1);
  return (
    <AbsoluteFill>
      <Place x={960} y={panelY - 96}>
        <BitText text={title} px={10} bands={TITLE_BANDS} outline={SHADE} shadow={PINK_DK} ch={(i) => dropLook(lf - i)} />
      </Place>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080, transform: `translateY(${slide(lf - 6, 640, 10)}px)` }}>
        <Panel x={256} y={panelY} w={1408} h={panelH}>
          {items.map((it, i) => {
            const shown = since(f, at) - 10 - i * 3 >= 0;
            const ul = since(f, it.at);
            const open = ul >= 0;
            const cleared = i < active;
            const isActive = i === active;
            const ry = 24 + i * rowH;
            const tile = open ? (cleared ? GROUND_LT : YELLOW) : GROUND;
            if (!shown) return null;
            return (
              <div key={i} style={{ position: "absolute", left: 0, top: ry, width: 1392, height: rowH - 8 }}>
                {isActive && <div style={{ position: "absolute", left: 88, right: 40, top: 4, bottom: 4, background: GROUND, outline: `4px solid ${cycleCol(f)}` }} />}
                <div style={{ position: "absolute", left: 120, top: 20, width: 160, height: 72, background: tile, boxShadow: `inset -8px -8px 0 rgba(5,7,26,0.35)`, scale: String(open ? pop(ul) : 1) }}>
                  <Place x={80} y={36}>
                    <PxText text={it.tag ?? `${world}-${i + 1}`} size={32} color={open ? SHADE : GROUND_LT} shadow={false} lh={1} />
                  </Place>
                </div>
                <Place x={320} y={56} ax={0}>
                  <PxText text={it.label} size={36} color={open ? INK : GROUND_LT} lh={1} />
                </Place>
                <Place x={1300} y={56}>
                  {cleared ? <Sprite map={FLAG} px={6} /> : open ? <PxText text="GO!" size={32} color={blinkOn(f) ? PINK : INK} lh={1} /> : <Sprite map={LOCK} px={8} />}
                </Place>
              </div>
            );
          })}
        </Panel>
        {active >= 0 && (
          <Place x={snap(256 + 40 + (blinkOn(f, 16) ? 0 : 8))} y={panelY + 8 + 24 + active * rowH + 56} ax={0}>
            <Sprite map={CURSOR} px={8} />
          </Place>
        )}
      </div>
    </AbsoluteFill>
  );
};

export type ItemGetProps = { at: number; text: string; label?: string; icon?: SpriteName; out?: number; y?: number };

// Source label / lower third as an item pickup: slides in on 2s with its icon, the source typed; on `out` it flickers away like a collected item.
export const ItemGet: FC<ItemGetProps> = ({ at, text, label = "SOURCE", icon = "scroll", out, y = 832 }) => {
  const { f, lf } = useCue(at);
  if (lf < 0) return null;
  const lo = out === undefined ? -1 : since(f, out);
  if (lo >= 12 || (lo >= 0 && !blinkOn(lo, 4))) return null;
  const w = snap(Math.max(label.length * 28, text.length * 32) + 240, 8);
  const x = 96 + slide(lf, -w - 120, 12);
  const map = SPRITES[icon][0]!;
  return (
    <Panel x={x} y={y} w={w} h={152} border={YELLOW}>
      <div style={{ position: "absolute", left: 16, top: 16, width: 104, height: 104, background: SHADE, display: "flex", alignItems: "center", justifyContent: "center", scale: String(pop(lf - 6)) }}>
        <Sprite map={map} px={6} />
      </div>
      <div style={{ position: "absolute", left: 152, top: 28 }}>
        <PxText text={label} size={28} color={YELLOW} lh={1} />
        <div style={{ height: 20 }} />
        <PxText text={text} size={32} n={typedN(lf - 10)} lh={1} />
      </div>
    </Panel>
  );
};

export type DialogueProps = { at: number; text: string; name?: string; speaker?: SpriteName; x?: number; y?: number; w?: number; h?: number; per?: number };

// Quote or callout as an RPG dialogue box: it opens in three steps, the portrait talks while the text types, then the next-arrow bobs.
export const DialogueBox: FC<DialogueProps> = ({ at, text, name = "SAGE", speaker = "sage", x = 96, y = 640, w = 1728, h = 336, per = 1 }) => {
  const { f, lf } = useCue(at);
  if (lf < 0) return null;
  const open = lf < 2 ? 0.3 : lf < 4 ? 0.75 : 1;
  const tl = lf - 8;
  const n = typedN(tl, per);
  const typing = tl >= 0 && n < text.length;
  const frames = SPRITES[speaker];
  const pose = typing && Math.floor(f / 4) % 2 === 1 ? frames[1] ?? frames[0]! : frames[0]!;
  const bob = Math.floor(f / 8) % 2 ? 8 : 0;
  const bh = snap(h * open);
  return (
    <>
      <Panel x={x} y={y + (h - bh) / 2} w={w} h={bh}>
        {open >= 1 && (
          <>
            <div style={{ position: "absolute", left: 24, top: 24, width: 256, height: h - 64, background: SHADE, border: `4px solid ${GROUND_LT}`, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
              <Sprite map={pose} px={14} style={{ marginBottom: 4 }} />
            </div>
            <div style={{ position: "absolute", left: 320, top: 36, right: 56 }}>
              <PxText text={text} size={36} lh={1.75} n={n} />
            </div>
            {!typing && tl > 0 && (
              <div style={{ position: "absolute", right: 40, bottom: 24 + bob }}>
                <Sprite map={["yyyyyyy", ".yyyyy.", "..yyy..", "...y..."]} px={8} />
              </div>
            )}
          </>
        )}
      </Panel>
      {open >= 1 && name && (
        <Panel x={x + 280} y={y - 56} w={name.length * 32 + 64} h={80} border={PINK} drop={false}>
          <Place x={(name.length * 32 + 48) / 2} y={32}>
            <PxText text={name} size={32} color={PINK} lh={1} />
          </Place>
        </Panel>
      )}
    </>
  );
};
