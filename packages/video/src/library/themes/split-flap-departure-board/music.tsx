// Music-only use: a NOW PLAYING board on the core beat clock, where every word's flaps land together on a downbeat, the beat cells clack on each beat and lamps follow the section energy.
import type { FC } from "react";
import { useClock, useSong, type BeatClock } from "../../core/beat";
import { H, W } from "../../core/video";
import { BoardFrame, Lamp } from "./board";
import type { CellSpec, FlapKey } from "./flap";
import { FlapRow, Nudge, rowSpecs } from "./rows";
import { FPS, PAINT, DIM, rowWidth, type Tone } from "./theme";

// Song-second cues for one item per `every` bars from `startBar`: pass them as `at` with `land` so flaps finish on the downbeat.
export const barCues = (clock: BeatClock, n: number, startBar = 1, every = 1) => Array.from({ length: n }, (_, i) => clock.barSec(startBar + i * every));

// The beat row: four cells print 1–4; the cell on the current beat lands a solid block on the beat and returns to its number on the next.
export const beatSpecs = (clock: BeatClock, bars: number, startBar = 1, seed = 300): CellSpec[] =>
  [0, 1, 2, 3].map((b) => {
    const keys: FlapKey[] = [{ f: clock.barSec(startBar) * FPS - 30 + b * 2, ch: String(b + 1), tone: "dim" }];
    for (let bar = startBar; bar < startBar + bars; bar++) {
      const on = clock.barSec(bar, b + 1) * FPS;
      keys.push({ f: on, ch: "■", tone: "amber", land: true });
      keys.push({ f: on + Math.round(clock.spb * FPS * 0.5), ch: String(b + 1), tone: "dim" });
    }
    return { keys, seed: seed + b, drum: " 1234■" };
  });

export const BeatBoard: FC<{ words: string[]; startBar?: number; label?: string; artist?: string; tone?: Tone }> = ({ words, startBar = 1, label = "NOW PLAYING", artist = "", tone = "ink" }) => {
  const clock = useClock();
  const { pulse, energy, pos } = useSong();
  const cols = Math.max(...words.map((w) => w.length), 6);
  const h = 190;
  const cues = barCues(clock, words.length, startBar);
  const main = rowSpecs({ text: words[0]!, cols, align: "center", at: cues[0]!, land: true, stagger: 0, tone, seed: 310, then: words.slice(1).map((w, i) => ({ at: cues[i + 1]!, text: w, scramble: 4, tone: i === words.length - 2 ? "amber" : tone })) });
  const fw = Math.max(rowWidth(h, cols), 1100) + 160 + 28;
  const fh = 70 + 28 + 50 + h + 60 + 80 + 50;
  const lamps = 10;
  const lit = energy * lamps;
  const bar = Math.max(1, Math.min(words.length, pos.bar - startBar + 1));
  return (
    <BoardFrame x={(W - fw) / 2} y={(H - fh) / 2} w={fw} h={fh} label={label} sub={artist || `${Math.round(clock.bpm)} BPM`} seed={300}>
      <Nudge at={cues}>
        <FlapRow specs={main} x={(fw - 28) / 2} y={50} h={h} anchor="center" weight={600} />
      </Nudge>
      <div style={{ position: "absolute", left: 80, top: 50 + h + 60 + 18, fontFamily: PAINT, fontWeight: 600, fontSize: 32, letterSpacing: "0.16em", color: DIM }}>
        BAR {String(bar).padStart(2, "0")} / {String(words.length).padStart(2, "0")}
      </div>
      <FlapRow specs={beatSpecs(clock, words.length, startBar)} x={(fw - 28) / 2} y={50 + h + 60} h={80} anchor="center" />
      {Array.from({ length: lamps }, (_, i) => {
        const on = i < Math.floor(lit) ? 1 : i < lit ? lit - Math.floor(lit) : 0;
        return <Lamp key={i} x={fw - 28 - 80 - (lamps - 1 - i) * 30} y={50 + h + 60 + 40} on={on * (0.55 + 0.45 * pulse)} tone={i >= lamps - 2 ? "red" : i >= lamps - 4 ? "amber" : "green"} r={9} />;
      })}
    </BoardFrame>
  );
};
