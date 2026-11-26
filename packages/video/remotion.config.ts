// Remotion CLI settings for this package: GPU rendering through ANGLE, and the @library and @kit aliases so per-video scene files in videos/NNN/edit/ can import the motion library and the kit.
import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setChromiumOpenGlRenderer("angle");

// Decision: CLI runs always start in packages/video (scripts pass cwd), so its node_modules is where files outside the package resolve remotion and react from.
const pkg = process.cwd();
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias as Record<string, string> | undefined), "@library": path.join(pkg, "src/library"), "@kit": path.join(pkg, "src/kit") },
    modules: [...(config.resolve?.modules ?? ["node_modules"]), path.join(pkg, "node_modules")],
  },
}));
