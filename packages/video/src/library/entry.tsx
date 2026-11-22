// Remotion entry for the whole library gallery (every registered theme); scripts/library-previews.mjs makes a one-theme entry instead.
import { registerRoot } from "remotion";
import { GalleryRoot } from "./gallery";
import { THEMES } from "./index";

registerRoot(() => <GalleryRoot themes={THEMES} />);
