// Zoom-through-worlds tokens: storybook paper, black ink, hot pink hero, coral and flesh interiors, sulphur yellow type, the dive eases and a seeded RNG.
import { Easing } from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadTitan } from "@remotion/google-fonts/TitanOne";
import { loadFont as loadLora } from "@remotion/google-fonts/Lora";
import { loadFont as loadPatrick } from "@remotion/google-fonts/PatrickHand";

export const DISPLAY = loadBangers("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const CHUNK = loadTitan("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadLora("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
loadLora("italic", { weights: ["500"], subsets: ["latin"] });
export const SCRAWL = loadPatrick("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const PAPER = "#FFFBEB";
// A shade of the paper for flat "shadow side" fills; the theme never uses gradients.
export const PAPER_DIM = "#F3EAC8";
export const SKIN = "#FFFFFF";
export const INK = "#111111";
export const HOT = "#FF69B4";
export const HOT_DEEP = "#E0479A";
export const CORAL = "#FF5C5C";
export const CORAL_DEEP = "#D93F45";
export const FLESH = "#FF8FA3";
export const FLESH_DEEP = "#EE7088";
export const SUN = "#FFE600";
export const VOID = "#111111";
export const VOID_SOFT = "#2A2326";

// The board's dive feel is bezier(.7,0,.84,0): slow start, accelerating. A single PortalZoom uses it as is.
export const DIVE_IN = Easing.bezier(0.7, 0, 0.84, 0);
// Chained dives land on a held scene, so they accelerate the same way but brake for the arrival instead of hard-stopping.
export const DIVE_LAND = Easing.bezier(0.7, 0, 0.22, 1);
// Normalised so it lands exactly on 1 (Easing.exp stops at 0.999, which leaves counters one short).
export const EXPO_OUT = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const BACK = Easing.out(Easing.back(1.7));
export const QUAD_IN = Easing.in(Easing.quad);

// Seeded RNG (mulberry32): same seed, same scatter, every render.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Hard black outline plus a chunky offset shadow for HTML display type (the yellow-on-anything headline look).
export const inked = (w = 5, drop = 8, color = INK) => {
  const ring: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ring.push(`${(Math.cos(a) * w).toFixed(2)}px ${(Math.sin(a) * w).toFixed(2)}px 0 ${color}`);
  }
  for (let d = 1; d <= drop; d += 1.5) ring.push(`${d + w * 0.6}px ${d + w * 0.6}px 0 ${color}`);
  return ring.join(", ");
};
