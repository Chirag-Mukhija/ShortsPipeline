// Loads the brand typefaces through Remotion's Google Fonts loader so renders wait until they are ready.
import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const fonts = {
  display: loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily,
  body: loadBody("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] }).fontFamily,
  mono: loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily,
};
