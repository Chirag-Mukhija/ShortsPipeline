// Parallax still: 2.5D depth from a background image plus up to two cut-out layers, each moving at its own speed under a slow camera move, with one change of shot size on a cue, light atmosphere (dust, rays or mist) and a caption.
import type { CSSProperties, FC } from "react";
import { AbsoluteFill, Easing } from "remotion";
import { z } from "zod";
import { defineTemplate, type Media, type Style } from "../contract";
import { clamp01, cueAt, enter, MediaFill, useT } from "../motion";

const schema = z.object({
  move: z
    .enum(["in", "left", "right", "rise"])
    .default("in")
    .describe("The slow camera move for the whole segment: in (dolly toward the focus point), left / right (truck sideways), rise (camera lifts, the scene sinks)"),
  speed: z.enum(["slow", "steady"]).default("slow").describe("Drift speed: slow (about 1%/s, reflective moments) or steady (about 2.5%/s, story moving on)"),
  change: z
    .enum(["push", "pull"])
    .default("push")
    .describe("The one change of shot size: push moves closer on the cue; pull starts close and pulls back to reveal the whole picture"),
  changeWord: z.string().optional().describe("Spoken word the push or pull lands on"),
  atmosphere: z.enum(["none", "dust", "rays", "mist"]).default("dust").describe("Subtle life in the air: dust motes, light rays from the top right, or low mist drifting across the bottom"),
  kicker: z.string().max(18).optional().describe("Small label above the caption, e.g. 'AYODHYA, 1 AM' or 'CHAPTER 2'"),
  caption: z.string().max(40).optional().describe("One caption line, a few words, bottom left"),
  captionWord: z.string().optional().describe("Spoken word the caption lands on"),
  tag: z.string().max(16).optional().describe("Tiny corner tag: 'Illustration' for generated images, or a short credit"),
});

type Props = z.infer<typeof schema>;

const sine = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const mix = (c: string, pct: number, base = "transparent") => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
// Tokens are usually #rrggbb; anything else counts as light, which only softens the vignette.
const isDark = (c: string) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return false;
  const n = parseInt(m[1]!, 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 110;
};

// Depth of each plane: parallax speeds from DIRECTION (far .4, mid .75, near 1.0; the fake foreground plane 1.6).
const DEPTH = { far: 0.4, mid: 0.75, near: 1, fore: 1.6, single: 0.7 };

const Scene: FC<{ props: Props; style: Style; W: number; H: number; duration: number; media: Media[]; cues: { at: number; end: number; word: string }[] }> = ({
  props,
  style,
  W,
  H,
  duration,
  media,
  cues,
}) => {
  const { t, frame, fps } = useT();
  const hand = style.motion === "hand";
  const dark = isDark(style.bg);
  const light = mix(style.accent, 16, "white");
  const bg = media[0];
  const cut = media.slice(1, 3);
  const single = cut.length === 0;

  // Drift clock: constant speed, slowing to 15% over the last 0.9 s so the frame is settled at the end.
  const T1 = Math.max(0, duration - 0.9);
  const drift = (x: number) => (x <= T1 ? x : T1 + (x - T1) - (0.85 / (2 * 0.9)) * (x - T1) ** 2);
  const D = drift(Math.min(t, duration));
  const Dmax = drift(duration);
  const r = props.speed === "steady" ? 0.025 : 0.012;

  // The one size change: push (sine in-out, 1.1 s) or pull (fast start, long tail, 1.4 s); weighted by depth so it reads as a dolly.
  const changeDur = props.change === "pull" ? 1.4 : 1.1;
  const changeAt = Math.min(Math.max(cueAt(cues, props.changeWord, duration * 0.32) - 0.1, 0.8), Math.max(0.8, duration - 0.6 - changeDur - 0.4));
  const cp = props.change === "pull" ? Easing.out(Easing.cubic)(clamp01((t - changeAt) / changeDur)) : sine((t - changeAt) / changeDur);
  const A = 0.075;
  const changeEnd = changeAt + changeDur;

  // Transform origin: the subject, kept off the edges so sideways moves can be covered by overscan.
  const [fx0, fy0] = bg?.focus ?? [0.5, 0.5];
  const ox = Math.min(0.7, Math.max(0.3, fx0));
  const oy = Math.min(0.7, Math.max(0.3, fy0));
  const plane = (k: number) => {
    const d = r * k * D;
    const dMax = r * k * Dmax;
    const w = 0.7 + 0.3 * k;
    const size = props.change === "pull" ? 1 + A * w * (1 - cp) : 1 + A * w * cp;
    let s = 1;
    let tx = 0;
    let ty = 0;
    let base = 1.02;
    if (props.move === "in") s = 1 + d;
    else if (props.move === "rise") {
      ty = d * H * 0.5;
      base += (dMax * 0.5) / Math.min(oy, 1 - oy);
      s = 1 + d * 0.12;
    } else {
      tx = (props.move === "left" ? 1 : -1) * d * W * 0.5;
      base += (dMax * 0.5) / Math.min(ox, 1 - ox);
      s = 1 + d * 0.12;
    }
    return { s: s * size * base, tx, ty };
  };
  const planeStyle = (k: number, extra?: CSSProperties): CSSProperties => {
    const p = plane(k);
    return {
      position: "absolute",
      inset: 0,
      transform: `translate(${p.tx}px, ${p.ty}px) scale(${p.s})`,
      transformOrigin: `${ox * 100}% ${oy * 100}%`,
      ...extra,
    };
  };
  // A point at depth k, from canvas space to the screen, for particles living in the scene.
  const project = (k: number, x: number, y: number) => {
    const p = plane(k);
    return { x: ox * W + (x - ox * W) * p.s + p.tx, y: oy * H + (y - oy * H) * p.s + p.ty, s: p.s };
  };

  // Entry: the background racks into focus, cut-outs settle forward from depth one after another.
  const rack = enter({ ...style, motion: "calm" }, frame, fps, 0, 0.9);
  const bgBlur = (single ? 0 : 1.5) + 7 * (1 - rack);
  const settle = cut.map((_, i) => enter({ ...style, motion: "calm" }, frame, fps, 0.2 + i * 0.25, 0.8));

  // Caption after the camera has arrived (≥ 0.1 s after the size change), unless it is cued before the change starts.
  const capCue = cueAt(cues, props.captionWord, changeEnd + 0.3);
  const capAt = Math.min(capCue < changeAt ? Math.max(capCue, 0.5) : Math.max(capCue, changeEnd + 0.1), duration - 1.5);
  const cap = enter(style, frame, fps, capAt, 0.75);
  const kick = enter(style, frame, fps, capAt - 0.12, 0.6);
  const tagIn = enter({ ...style, motion: "calm" }, frame, fps, 0.5, 0.6);

  const capSize = hand ? 92 : 76;
  const kickSize = hand ? 42 : 30;
  const side = Math.round(W * 0.055);
  const capMax = Math.min(W * 0.62, 1180);

  // Dust: seeded motes at several depths, rising slowly with a little wander, twinkling; they wrap off-screen.
  const motes =
    props.atmosphere === "dust"
      ? Array.from({ length: 30 }, (_, i) => {
          const k = 0.5 + hash(i * 3.7) * 1.1;
          const span = H * 1.3;
          const rise = (8 + hash(i * 5.3) * 18) * k;
          const y0 = hash(i * 1.9) * span;
          const yy = ((((y0 - rise * t) % span) + span) % span) - H * 0.15;
          const xx = hash(i * 7.1) * W * 1.1 - W * 0.05 + Math.sin(t * (0.3 + hash(i) * 0.4) + i) * (10 + 20 * hash(i * 2.3));
          const p = project(k, xx, yy);
          const size = (2 + hash(i * 4.4) * 4.5) * k * (p.s / 1.05);
          const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + hash(i * 6.6) * 1.6) + i * 2.1);
          return { x: p.x, y: p.y, r: size * (k > 1.2 ? 1.4 : 1), o: (k > 1.2 ? 0.22 : 0.75) * tw, soft: k > 1.2 };
        })
      : [];
  const dustIn = enter({ ...style, motion: "calm" }, frame, fps, 0.3, 1.2);

  // Rays: a few soft shafts from above the top right, swinging a couple of degrees and breathing.
  const raySwing = 2.5 * Math.sin((2 * Math.PI * t) / 11);
  const rayBreath = 0.8 + 0.2 * Math.sin((2 * Math.PI * t) / 6.5);
  const raysIn = enter({ ...style, motion: "calm" }, frame, fps, 0.2, 1.4);

  const mistIn = enter({ ...style, motion: "calm" }, frame, fps, 0.1, 1.4);

  return (
    <AbsoluteFill style={{ background: style.bg, overflow: "hidden" }}>
      {/* Far plane: the background image, or a surface gradient if none was given. */}
      <div style={planeStyle(single ? DEPTH.single : DEPTH.far, { filter: bgBlur > 0.05 ? `blur(${bgBlur.toFixed(2)}px)` : undefined })}>
        {bg ? <MediaFill media={bg} /> : <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 40% 30%, ${style.surface}, ${style.bg})` }} />}
      </div>

      {/* Cut-out planes (PNG with alpha, same canvas as the background), settling forward from depth. */}
      {cut.map((m, i) => {
        const k = cut.length === 1 ? DEPTH.near : i === 0 ? DEPTH.mid : DEPTH.near;
        const a = settle[i]!;
        return (
          <div key={i} style={{ position: "absolute", inset: 0, opacity: a, transform: `translateY(${(1 - a) * 28}px) scale(${1 + 0.05 * (1 - a)})`, transformOrigin: `${ox * 100}% ${oy * 100}%` }}>
            <div style={planeStyle(k, { filter: `drop-shadow(0 ${18 * k}px ${34 * k}px rgba(0,0,0,${dark ? 0.5 : 0.3}))` })}>
              <MediaFill media={{ ...m, focus: bg?.focus ?? m.focus }} />
            </div>
          </div>
        );
      })}

      {/* Fake foreground for a single image: soft out-of-focus shadows at the corners, moving faster than the picture. */}
      {single ? (
        <div style={planeStyle(DEPTH.fore)}>
          <div style={{ position: "absolute", right: -W * 0.16, bottom: -H * 0.3, width: W * 0.5, height: H * 0.75, background: "radial-gradient(closest-side, rgba(0,0,0,0.42), rgba(0,0,0,0.18) 55%, transparent)" }} />
          <div style={{ position: "absolute", left: -W * 0.14, top: -H * 0.28, width: W * 0.36, height: H * 0.62, background: "radial-gradient(closest-side, rgba(0,0,0,0.3), rgba(0,0,0,0.12) 55%, transparent)" }} />
        </div>
      ) : null}

      {/* Grade toward the style: a soft-light duotone wash. */}
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${style.accent2}, ${style.accent})`, mixBlendMode: "soft-light", opacity: 0.16 }} />

      {props.atmosphere === "rays" ? (
        <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.5 * raysIn * rayBreath }}>
          <svg width={W} height={H}>
            <defs>
              <linearGradient id="kit-ps-ray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={light} stopOpacity={0.75} />
                <stop offset="100%" stopColor={light} stopOpacity={0} />
              </linearGradient>
              <filter id="kit-ps-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={W * 0.012} />
              </filter>
            </defs>
            <g transform={`rotate(${raySwing} ${W * 0.86} ${-H * 0.2})`} filter="url(#kit-ps-soft)">
              {[
                [24, 5, 0.9],
                [33, 3, 0.6],
                [41, 7, 0.75],
                [52, 4, 0.5],
              ].map(([a, w, o], i) => {
                const L = H * 1.6;
                const rad = (d: number) => (d * Math.PI) / 180;
                const cx = W * 0.86;
                const cy = -H * 0.2;
                const p1 = { x: cx - Math.sin(rad(a! - w! / 2)) * L, y: cy + Math.cos(rad(a! - w! / 2)) * L };
                const p2 = { x: cx - Math.sin(rad(a! + w! / 2)) * L, y: cy + Math.cos(rad(a! + w! / 2)) * L };
                return <path key={i} d={`M${cx} ${cy}L${p1.x} ${p1.y}L${p2.x} ${p2.y}Z`} fill="url(#kit-ps-ray)" opacity={o} />;
              })}
            </g>
          </svg>
        </AbsoluteFill>
      ) : null}

      {props.atmosphere === "mist" ? (
        <AbsoluteFill style={{ opacity: mistIn }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: -W * 0.25 + (i ? W * 0.3 : 0),
                top: H * (i ? 0.62 : 0.72),
                width: W * 1.2,
                height: H * 0.45,
                background: `radial-gradient(closest-side, ${mix(light, i ? 32 : 42)}, transparent)`,
                transform: `translateX(${(i ? -1 : 1) * (14 * t + 26 * Math.sin((2 * Math.PI * t) / (12 + i * 3)))}px)`,
              }}
            />
          ))}
        </AbsoluteFill>
      ) : null}

      {motes.length ? (
        <AbsoluteFill style={{ opacity: dustIn }}>
          <svg width={W} height={H}>
            <defs>
              <radialGradient id="kit-ps-mote">
                <stop offset="0%" stopColor={light} stopOpacity={1} />
                <stop offset="45%" stopColor={light} stopOpacity={0.6} />
                <stop offset="100%" stopColor={light} stopOpacity={0} />
              </radialGradient>
            </defs>
            {motes.map((m, i) => (
              <circle key={i} cx={m.x} cy={m.y} r={m.r * 1.3} fill="url(#kit-ps-mote)" opacity={m.o} />
            ))}
          </svg>
        </AbsoluteFill>
      ) : null}

      {/* Lens: vignette, outside the moving planes. */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, transparent 52%, rgba(0,0,0,${dark ? 0.55 : 0.34}) 100%)` }} />

      {/* Caption in a text pocket of the style's background colour, bottom left. */}
      {props.caption ? (
        <>
          <AbsoluteFill
            style={{
              // Sized to the caption block: solid enough under the letters to pass the pocket rule, then a long soft falloff into the picture.
              background: `radial-gradient(${Math.round(side + capMax * 0.95)}px ${Math.round(H * 0.5)}px at ${Math.round(side + capMax * 0.3)}px 100%, ${mix(style.bg, 94)} 0%, ${mix(style.bg, 88)} 45%, ${mix(style.bg, 60)} 64%, ${mix(style.bg, 24)} 82%, ${mix(style.bg, 0)} 100%)`,
              opacity: Math.max(cap, kick),
            }}
          />
          <div style={{ position: "absolute", left: side, bottom: H * 0.1, width: capMax }}>
            {props.kicker ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14, opacity: kick, transform: `translateX(${(1 - kick) * -40}px)` }}>
                <div style={{ width: 56 * kick, height: hand ? 5 : 4, background: style.accent, borderRadius: 4 }} />
                <div
                  style={{
                    fontFamily: hand ? style.display : style.body,
                    fontWeight: 700,
                    fontSize: kickSize,
                    letterSpacing: hand ? 1 : 4,
                    color: style.accent,
                    whiteSpace: "nowrap",
                  }}
                >
                  {props.kicker}
                </div>
              </div>
            ) : null}
            <div style={{ overflow: "hidden", paddingBottom: 10 }}>
              <div
                style={{
                  fontFamily: style.display,
                  fontWeight: hand ? 700 : 600,
                  fontSize: capSize,
                  lineHeight: 1.08,
                  letterSpacing: hand ? 0 : "-0.015em",
                  color: style.ink,
                  transform: `translateY(${(1 - cap) * 115}%)`,
                }}
              >
                {props.caption}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {props.tag ? (
        <div
          style={{
            position: "absolute",
            right: side,
            top: H * 0.06,
            fontFamily: style.mono,
            fontWeight: 600,
            fontSize: 26,
            color: style.ink,
            background: mix(style.bg, 78),
            padding: "6px 16px",
            borderRadius: Math.min(10, style.radius),
            opacity: tagIn * 0.92,
          }}
        >
          {props.tag}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export default defineTemplate({
  id: "parallax-still",
  title: "Parallax still",
  mode: "stock",
  layouts: ["full"],
  useFor:
    "Story and history beats told over images (illustrations, photos, generated art): the picture gets 2.5D depth under a slow camera move (in, left, right, rise), one push or pull on a spoken word, subtle atmosphere (dust, rays, mist) and an optional kicker + caption bottom left. Slot 0: the background image (set its focus to the subject). Slots 1–2 (optional): cut-out layers as PNGs with transparent background, exported on the same canvas as slot 0 (mid layer first, then the nearest); they move faster than the background for real depth. With only slot 0, a soft foreground shadow plane fakes the depth. Tag generated images 'Illustration'.",
  avoid:
    "UI screenshots or text-heavy images (the drift blurs small text; use footage-reveal), more than two of these in a row (vary with a hard cut or another template), segments under 3 s, and busy images under a long caption. Never use generated images to depict a real person's face.",
  schema,
  example: {
    move: "in",
    speed: "slow",
    change: "push",
    changeWord: "night",
    atmosphere: "dust",
    kicker: "DAY 41, 2 AM",
    caption: "Six phases, one long night",
    captionWord: "phases",
    tag: "Screenshot",
  },
  exampleMedia: [{ src: "media/still.jpg", kind: "image", focus: [0.5, 0.42] }],
  exampleCues: [
    { at: 0.6, end: 0.9, word: "It" },
    { at: 1.6, end: 2.0, word: "night" },
    { at: 3.3, end: 3.8, word: "phases" },
  ],
  seconds: { min: 3, max: 10, demo: 6 },
  mediaSlots: 1,
  credit: {
    name: "'Indian civilisation history film' by @BuildFastWithAI and 'Four seasons train window' (prompt-motion.com)",
    url: "https://prompt-motion.com/buildfastwithai-53234e",
  },
  status: "draft",
  Component: ({ props, style, width, height, duration, media, cues }) => <Scene props={props} style={style} W={width} H={height} duration={duration} media={media} cues={cues} />,
});
