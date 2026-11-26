// The count, the film's peak: one ten-digit wheel doubles into an endless wall while the working stacks up, the wall implodes into 10^7,089, and a field of atoms shrinks to one dot beside it.
import type { CSSProperties, FC, ReactNode } from "react";
import { AbsoluteFill, Easing } from "remotion";
import type { SceneProps, Style } from "@kit/contract";
import { clamp01, cueAt, useT } from "@kit/motion";

const VOID = "#0B0B0F";
const WHITE = "#FFFFFF";
const FAINT = "rgba(255,255,255,0.12)";
const M = 96;

// The track's beats b128 to b159 in this segment's local seconds (pnpm music:beats incompetech-laserpack, less 60.842); the named cues overwrite theirs.
const BEATS = [
  0, 0.479, 0.938, 1.426, 1.875, 2.354, 2.833, 3.302, 3.761, 4.23, 4.689, 5.168, 5.627, 6.106, 6.565, 7.044, 7.503, 7.982, 8.441, 8.919, 9.378, 9.857, 10.326, 10.795, 11.254, 11.733, 12.192, 12.631, 13.1, 13.569, 13.988, 14.417,
];
const NAMED: [string, number][] = [["wheel", 0], ["double", 4], ["wall", 7], ["slam", 16], ["atoms", 23], ["estimate", 25]];
const WALL = 7;
const SUCK = 15;
const SLAM = 16;
const ATOMS = 23;
const ESTIMATE = 25;

const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const BACK = Easing.out(Easing.back(1.25));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hash = (a: number, b: number, c: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
// Eased progress of a move that lands around frame `at`: it starts two frames early so the eye gets the hit on the beat.
const move = (f: number, at: number, dur = 9, ease: (x: number) => number = EXPO, lead = 2) => ease(clamp01((f - at + lead) / dur));

// ---------- type ----------

const hit = (style: Style, size: number): CSSProperties => ({ fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900', fontSize: size, letterSpacing: "-0.045em", lineHeight: 1, whiteSpace: "nowrap" });
const support = (style: Style, size: number): CSSProperties => ({ fontFamily: style.display, fontWeight: 500, fontVariationSettings: '"wght" 500', fontSize: size, letterSpacing: "-0.02em", lineHeight: 1.15, whiteSpace: "nowrap" });
const mono = (style: Style, size: number, weight = 500): CSSProperties => ({ fontFamily: style.mono, fontWeight: weight, fontVariationSettings: `"wght" ${weight}`, fontSize: size, lineHeight: 1.15, whiteSpace: "nowrap" });

const Sup: FC<{ children: ReactNode }> = ({ children }) => <span style={{ fontSize: "0.62em", position: "relative", top: "-0.62em", marginLeft: "0.04em", lineHeight: 0 }}>{children}</span>;

// A line of type that rises from behind its own floor on the beat and leaves on a hard cut, on a void plate so nothing shows through it.
const Line: FC<{ f: number; at: number; out?: number; x: number; y: number; right?: boolean; plate?: boolean; css: CSSProperties; children: ReactNode }> = ({ f, at, out, x, y, right, plate, css, children }) => {
  if (f < at - 2 || (out !== undefined && f >= out)) return null;
  const p = move(f, at, 8, BACK);
  return (
    <div style={{ position: "absolute", [right ? "right" : "left"]: x, top: y, overflow: "hidden", background: plate ? VOID : undefined, padding: plate ? "14px 26px 16px 26px" : "6px 0", margin: plate ? `-14px ${right ? -26 : 0}px 0 ${right ? 0 : -26}px` : "-6px 0" }}>
      <div style={{ ...css, color: WHITE, transform: `translateY(${(1 - p) * 120}%)` }}>{children}</div>
    </div>
  );
};

// ---------- the wheel ----------

const PITCH = 600;
const NOTCHES = Array.from({ length: 10 }, (_, d) => d);

// The full wheel, up close: ten notches with their digits turning behind a window, and the chosen digit in a finder frame.
const Wheel: FC<{ x: number; from: number; to: number; p: number; sweep: number; style: Style }> = ({ x, from, to, p, sweep, style }) => {
  const turn = -36 * (from + ((to - from + 10) % 10) * p);
  const big: CSSProperties = { fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900' };
  return (
    <g transform={`translate(${x} 0)`}>
      <circle r={270} fill={VOID} stroke={FAINT} strokeWidth={6} />
      <g transform={`rotate(${turn})`}>
        {NOTCHES.map((d) => (
          <g key={d} transform={`rotate(${d * 36})`}>
            <rect x={-15} y={-258} width={30} height={30} fill={sweep > d && sweep < d + 4 ? WHITE : FAINT} />
            <text y={-166} textAnchor="middle" fontSize={60} fill={WHITE} style={{ fontFamily: style.mono, fontWeight: 600 }}>
              {d}
            </text>
          </g>
        ))}
      </g>
      <rect x={-48} y={-262} width={96} height={116} fill={WHITE} />
      <svg x={-48} y={-262} width={96} height={116} viewBox="-48 -262 96 116">
        <g transform={`rotate(${turn})`}>
          {NOTCHES.map((d) => (
            <g key={d} transform={`rotate(${d * 36})`}>
              <rect x={-13} y={-254} width={26} height={22} fill={VOID} />
              <text y={-164} textAnchor="middle" fontSize={70} fill={VOID} style={{ fontFamily: style.mono, fontWeight: 600 }}>
                {d}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <rect x={-92} y={-92} width={184} height={184} fill={VOID} stroke={WHITE} strokeWidth={18} />
      <svg x={-82} y={-82} width={164} height={164} viewBox="-82 -82 164 164">
        {[from, to].map((d, i) => (
          <text key={i} y={54 + (i === 0 ? -p : 1 - p) * 170} textAnchor="middle" fontSize={150} fill={WHITE} style={big}>
            {d}
          </text>
        ))}
      </svg>
    </g>
  );
};

// The same wheel from further off: ring, notches (the chosen one white) and the digit.
const FarRing: FC = () => (
  <>
    <circle r={266} fill={VOID} stroke={FAINT} strokeWidth={10} />
    {NOTCHES.map((d) => (
      <rect key={d} x={-19} y={-246} width={38} height={38} fill={d === 0 ? WHITE : FAINT} transform={`rotate(${d * 36})`} />
    ))}
  </>
);

// ---------- scene ----------

const Scene: FC<SceneProps<Record<string, unknown>>> = ({ style, width: W, height: H, cues }) => {
  const { frame: f, fps } = useT();
  const seconds = [...BEATS];
  for (const [word, i] of NAMED) seconds[i] = cueAt(cues, word, BEATS[i]!);
  const B = seconds.map((s) => Math.round(s * fps));
  const b = (i: number) => B[i]!;
  // The beat we are in, counting the two-frame lead as already landed.
  const beat = Math.max(0, B.filter((x) => f >= x - 2).length - 1);
  const slamF = b(SLAM);
  const CX = W / 2;
  const CY = 470;

  // ---- Camera: pixels between two wheels, beat by beat. Each step snaps back wide and then holds.
  const pitches: [number, number][] = [
    [0, 600], [4, 560], [5, 430], [6, 222], [7, 158], [8, 116], [9, 86], [10, 64], [11, 48], [12, 36], [13, 26], [14, 18],
  ];
  let logP = Math.log(600);
  for (const [i, px] of pitches) logP = lerp(logP, Math.log(px), move(f, b(i), 10));
  const pitch = Math.exp(logP);
  const cam = pitch / PITCH;

  // ---- The wheels.
  const wallIn = f >= b(WALL) - 2;
  const rowN = f >= b(6) - 2 ? 3 : f >= b(5) - 2 ? 2 : f >= b(4) - 2 ? 1 : 0;
  const digit = (idx: number, beatNo: number) => (beatNo < 0 ? 0 : beatNo <= 3 ? [7, 2, 9, 4][beatNo]! : Math.floor(hash(idx + 3, beatNo, 11) * 10));
  const splitAt = b([0, 4, 5, 6][rowN]!);
  const split = rowN === 0 ? 1 : move(f, splitAt, 9, BACK);
  const spin = move(f, b(Math.min(beat, WALL - 1)), 10, BACK);

  const suck = clamp01((f - b(SUCK) + 1) / (slamF - 3 - b(SUCK)));
  const suckK = 1 - Easing.in(Easing.cubic)(suck);
  // Centre of the "10" it implodes into.
  const IX = 560;
  const IY = 470;

  let wall: ReactNode = null;
  if (wallIn && f < slamF - 3) {
    const open = move(f, b(WALL), 10);
    const nx = Math.ceil(W / 2 / pitch) + 1;
    const ny = Math.ceil(Math.max(CY, H - CY) / pitch) + 1;
    const cols = Array.from({ length: nx * 2 }, (_, i) => i - nx + 0.5);
    const rows = Array.from({ length: ny * 2 + 1 }, (_, i) => i - ny);
    // Every beat a ring of turning wheels runs outward from the middle; in front of it the old digits, behind it the new ones.
    const age = f - b(beat) + 2;
    const front = age * 150;
    const glyph = (c: number, r: number) => {
      const d = Math.hypot(c, r) * pitch;
      if (beat > WALL && d > front - 170 && d < front) return " ";
      return String(Math.floor(hash(c, r, d < front ? beat : beat - 1) * 10));
    };
    const near = pitch >= 110;
    const mid = !near && pitch >= 40;
    const left = cols[0]! * PITCH;
    const sheetW = cols.length * PITCH;
    const sheetH = rows.length * PITCH;
    const top = rows[0]! * PITCH;
    const inter: CSSProperties = { fontFamily: style.display, fontWeight: 900, fontVariationSettings: '"wght" 900' };
    wall = (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <g id="count-ring">
            <FarRing />
          </g>
          <pattern id="count-rings" patternUnits="userSpaceOnUse" x={-PITCH} y={-PITCH / 2} width={PITCH} height={PITCH}>
            <g transform={`translate(${PITCH / 2} ${PITCH / 2})`}>
              <FarRing />
            </g>
          </pattern>
        </defs>
        <g transform={`translate(${lerp(IX, CX, suckK)} ${lerp(IY, CY, suckK)}) scale(${cam * suckK})`}>
          {/* Back layer: a second wall seen through the gaps, slower to recede. */}
          {near || mid ? cols.map((c) => rows.map((r) => <rect key={`${c}:${r}`} x={(c + 0.5) * PITCH - 34} y={(r + 0.5) * PITCH - 34} width={68} height={68} fill={FAINT} opacity={open} />)) : null}
          {near
            ? rows.map((r) =>
                cols.map((c) => {
                  if (open < 0.02 && (r !== 0 || Math.abs(c) > 3.5)) return null;
                  const a = Math.abs(c);
                  const x = (a <= 3.5 ? c : Math.sign(c) * (3.5 + (a - 3.5) * open)) * PITCH;
                  return (
                    <g key={`${c}:${r}`} transform={`translate(${x} ${r * PITCH * open})`}>
                      <use href="#count-ring" />
                      <text y={108} textAnchor="middle" fontSize={300} fill={WHITE} style={inter}>
                        {glyph(c, r)}
                      </text>
                    </g>
                  );
                }),
              )
            : null}
          {mid ? (
            <>
              <rect x={left - PITCH / 2} y={top - PITCH / 2} width={sheetW} height={sheetH} fill="url(#count-rings)" />
              {rows.map((r) => (
                <text key={r} x={cols.map((c) => c * PITCH).join(" ")} y={r * PITCH + 108} textAnchor="middle" fontSize={300} fill={WHITE} style={{ ...inter, whiteSpace: "pre" }}>
                  {cols.map((c) => glyph(c, r)).join("")}
                </text>
              ))}
            </>
          ) : null}
          {!near && !mid
            ? rows.map((r) => (
                <text key={r} x={left - 120} y={r * PITCH + 146} fontSize={400} fill={WHITE} style={{ fontFamily: style.mono, fontWeight: 600, letterSpacing: `${PITCH - 240}px`, whiteSpace: "pre" }}>
                  {cols.map((c) => glyph(c, r)).join("")}
                </text>
              ))
            : null}
          {/* As the digits crush together they read as one solid block. */}
          {suck > 0 ? <rect x={-W / 2 / cam} y={-CY / cam} width={W / cam} height={H / cam} fill={WHITE} opacity={suck ** 3} /> : null}
        </g>
      </svg>
    );
  }

  const row =
    !wallIn && f < slamF ? (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${CX} ${CY}) scale(${cam})`}>
          {Array.from({ length: 2 ** rowN }, (_, i) => {
            const n = 2 ** rowN;
            const own = (i - (n - 1) / 2) * PITCH;
            const parent = rowN === 0 ? own : ((i >> 1) - (n / 2 - 1) / 2) * PITCH;
            // On the beat a wheel splits, it starts from its parent's digit.
            const justSplit = rowN > 0 && beat === [0, 4, 5, 6][rowN];
            const from = digit(justSplit ? i >> 1 : i, beat - 1);
            return <Wheel key={i} x={lerp(parent, own, split)} from={from} to={digit(i, beat)} p={spin} sweep={rowN === 0 ? ((f - b(1)) / 26) * 14 - 1 : -9} style={style} />;
          })}
        </g>
      </svg>
    ) : null;

  // ---- The working, stacked one line a beat on a stepped void block cut out of the wall.
  const work: { text: string; at: number; size: number; h: number; weight: number }[] = [
    { text: "10", at: 7, size: 92, h: 120, weight: 500 },
    { text: "10 x 10", at: 8, size: 92, h: 120, weight: 500 },
    { text: "10 x 10 x 10", at: 9, size: 92, h: 120, weight: 500 },
    { text: "...", at: 10, size: 92, h: 104, weight: 500 },
    { text: "7,089 times", at: 11, size: 124, h: 170, weight: 600 },
  ];
  let wy = 148;
  const working = work.map((l) => {
    const y = wy;
    wy += l.h;
    const at = b(l.at);
    if (f < at - 2 || f >= slamF - 3) return null;
    const p = move(f, at, 8);
    const w = M + l.text.length * l.size * 0.6 + 56;
    return (
      <div key={l.text} style={{ position: "absolute", left: 0, top: y - 1, height: l.h + 2, width: w * p, background: VOID, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: M, top: 0, height: l.h, display: "flex", alignItems: "center", color: WHITE, ...mono(style, l.size, l.weight), transform: `translateY(${(1 - move(f, at, 9, BACK)) * 110}%)` }}>{l.text}</div>
      </div>
    );
  });

  // ---- 10 to the 7,089.
  const slamOn = f >= slamF - 3;
  const expF = slamF + 7;
  const slamScale = (at: number, big: number) => {
    const u = f - (at - 3);
    if (u < 3) return lerp(big, 1, Easing.in(Easing.quad)(u / 3));
    if (u < 6) return lerp(1, 0.94, (u - 3) / 3);
    return lerp(0.94, 1, EXPO(clamp01((u - 6) / 7)));
  };
  // Each later beat leans on the number a little: type scale, never the camera.
  const punch = slamOn && beat > SLAM && beat < ATOMS ? 1 + 0.028 * (1 - EXPO(clamp01((f - b(beat) + 2) / 11))) * clamp01(f - b(beat) + 3) : 1;
  const toAtoms = move(f, b(ATOMS), 11);
  let numScale = lerp(1, 0.62, toAtoms);
  // While the atoms shrink, the number grows back a step a beat.
  for (let i = ATOMS + 1; i < B.length; i++) numScale += 0.026 * move(f, b(i), 9, BACK);
  const numX = lerp(224, M - 14, toAtoms);
  const numY = lerp(200, 118, toAtoms);
  const number = slamOn ? (
    <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${numX}px, ${numY}px) scale(${numScale})` }}>
      <div style={{ position: "relative", transformOrigin: "700px 260px", transform: `scale(${punch})`, ...hit(style, 520) }}>
        {[0, 1, 2].map((k) => {
          const e = clamp01((f - slamF - k * 2) / 16);
          if (f < slamF + k * 2 || e >= 1) return null;
          return (
            <span key={k} style={{ position: "absolute", left: 0, top: 0, color: "transparent", WebkitTextStroke: `${3 / (1 + 4 * e)}px ${WHITE}`, transformOrigin: "330px 260px", transform: `scale(${1 + 5 * Easing.in(Easing.quad)(e)})` }}>
              10
            </span>
          );
        })}
        <span style={{ display: "inline-block", position: "relative", transformOrigin: "330px 260px", transform: `scale(${slamScale(slamF, 2.5)})` }}>
          <span style={{ position: "absolute", left: 0, top: 0, color: VOID, WebkitTextStroke: `40px ${VOID}`, strokeLinejoin: "miter" }}>10</span>
          <span style={{ position: "relative", color: WHITE }}>10</span>
        </span>
        {f >= expF - 3 ? (
          <span style={{ display: "inline-block", position: "relative", verticalAlign: "top", top: -22, marginLeft: 26, fontSize: 260, lineHeight: 1, transformOrigin: "0% 60%", transform: `scale(${slamScale(expF, 2.1)})` }}>
            <span style={{ position: "absolute", left: 0, top: 0, color: VOID, WebkitTextStroke: `40px ${VOID}` }}>7,089</span>
            <span style={{ position: "relative", color: WHITE }}>7,089</span>
          </span>
        ) : null}
      </div>
    </div>
  ) : null;

  // ---- The zeros behind it: revealed by the slam's shock, stepping on every beat, swept off when the atoms come.
  let zeros: ReactNode = null;
  if (f >= slamF && f < b(ATOMS) + 10) {
    const cell = 58;
    const rowH = 72;
    let shift = (f - slamF) * 0.4;
    for (let i = SLAM + 1; i < ATOMS; i++) shift += cell * 2 * move(f, b(i), 10);
    const sweep = Easing.in(Easing.cubic)(clamp01((f - b(ATOMS) + 3) / 12)) * (W + 400);
    const n = Math.ceil(H / rowH) + 2;
    const text = "0".repeat(Math.ceil(W / cell) + 6);
    zeros = (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="count-shock">
            <circle cx={IX} cy={IY} r={40 + 1900 * Easing.out(Easing.quad)(clamp01((f - slamF) / 11))} />
          </clipPath>
        </defs>
        <g clipPath="url(#count-shock)">
          {Array.from({ length: n }, (_, r) => {
            const dir = r % 2 === 0 ? -1 : 1;
            const speed = r % 2 === 0 ? 1 : 0.5;
            const x = (((dir * shift * speed) % cell) - cell) % cell;
            return (
              <text key={r} x={x - cell + dir * sweep} y={r * rowH + 24} fontSize={40} fill={FAINT} style={{ fontFamily: style.mono, fontWeight: 500, letterSpacing: `${cell - 24}px` }}>
                {text}
              </text>
            );
          })}
        </g>
      </svg>
    );
  }

  // ---- The atoms: one field, uncountable, scaled into a single dot.
  let atoms: ReactNode = null;
  if (f >= b(ATOMS) - 2) {
    const R0 = 500;
    const ax = 1580;
    const ay = 392;
    const RATIO = 0.545;
    let logS = 0;
    for (let i = ATOMS + 1; i < B.length; i++) logS += Math.log(RATIO) * move(f, b(i), 9, EXPO);
    const s = Math.exp(logS);
    const inP = move(f, b(ATOMS), 11);
    let d = "";
    for (let i = 0; i < 2600; i++) {
      const r = R0 * Math.sqrt((i + 0.5) / 2600);
      const a = i * 2.399963;
      d += `M${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}h0`;
    }
    const passed = Math.min(B.length - 1, beat) - ATOMS;
    atoms = (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {/* Where the field's edge was, beat by beat: it leads the eye to the dot. */}
        {[1, 2, 3, 4].map((k) => (passed > k ? <circle key={k} cx={ax} cy={ay} r={R0 * RATIO ** k} fill="none" stroke={FAINT} strokeWidth={3} /> : null))}
        <g transform={`translate(${ax + (1 - inP) * 1000} ${ay}) scale(${s})`}>
          <path d={d} fill="none" stroke={WHITE} strokeWidth={8 + 26 * (1 - s)} strokeLinecap="round" />
        </g>
        {s * R0 < 8 ? <circle cx={ax} cy={ay} r={5} fill={WHITE} /> : null}
      </svg>
    );
  }

  const tagCss = mono(style, 38);
  return (
    <AbsoluteFill style={{ background: VOID, overflow: "hidden" }}>
      {zeros}
      {row}
      {wall}
      {working}
      {atoms}
      {number}

      <Line f={f} at={b(0)} out={b(8)} x={M} y={892} plate css={hit(style, 76)}>
        7,089 digits. 10 choices each.
      </Line>

      <Line f={f} at={slamF + 9} out={b(ATOMS)} x={M} y={838} plate css={support(style, 72)}>
        10<Sup>7,089</Sup> codes. At least.
      </Line>
      <Line f={f} at={slamF + 9} out={b(ATOMS)} x={M} y={934} plate css={tagCss}>
        digits only
      </Line>

      <Line f={f} at={b(ATOMS)} x={M} y={744} right css={support(style, 68)}>
        Atoms in the visible universe:
      </Line>
      <Line f={f} at={b(ATOMS)} x={M} y={826} right css={support(style, 68)}>
        about 10<Sup>80</Sup>.
      </Line>
      <Line f={f} at={b(ESTIMATE)} x={M} y={922} css={tagCss}>
        estimate: 10<Sup>78</Sup> to 10<Sup>82</Sup>
      </Line>
    </AbsoluteFill>
  );
};

export default Scene;
