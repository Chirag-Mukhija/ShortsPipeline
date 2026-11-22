// Isometric explainer tokens: cool blueprint paper, three-tone block faces, coral accent, blue and mint signals, Space Grotesk / Manrope / IBM Plex Mono.
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";

export const HEAD = loadGrotesk("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const LABEL = loadManrope("normal", { weights: ["600", "700", "800"], subsets: ["latin"] }).fontFamily;
export const MONO = loadPlexMono("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;

export const BG = "#F2F5FB";
export const INK = "#1B2340";
// Secondary copy: dark enough to hold 4.5:1 on BG at label sizes.
export const SUB = "#4A5578";
export const ACCENT = "#FF7A59";
export const BLUE = "#4C6FFF";
export const SIGNAL = "#22D3A6";
export const CARD = "#FFFFFF";
export const RULE = "#D3DCEE";

// A block colour is three flat faces: top lightest, the left (+y) face about 12 % darker, the right (+x) face about 24 % darker.
export type Tone = { top: string; left: string; right: string };
export const TONES = {
  white: { top: "#FFFFFF", left: "#DCE4F5", right: "#B9C6E2" },
  mist: { top: "#E4EDFF", left: "#C1D0F1", right: "#9DB0DC" },
  sky: { top: "#CFE0FF", left: "#A8BFEE", right: "#8299D3" },
  blue: { top: "#7D97FF", left: "#4C6FFF", right: "#3652D6" },
  coral: { top: "#FF9C80", left: "#FF7A59", right: "#DA5A3B" },
  mint: { top: "#62E8C5", left: "#22D3A6", right: "#16A883" },
  ink: { top: "#3A4672", left: "#252F55", right: "#171E3A" },
  sand: { top: "#FFF1D6", left: "#F2D9AE", right: "#D9BB88" },
} satisfies Record<string, Tone>;
export type ToneName = keyof typeof TONES;
export const toneOf = (t: ToneName | Tone): Tone => (typeof t === "string" ? TONES[t] : t);

// LED colours for racks and status dots.
export const LEDS = [SIGNAL, SIGNAL, SIGNAL, BLUE, ACCENT, "#FFD166"];
