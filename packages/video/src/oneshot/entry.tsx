// Remotion entry for the one-shot Beats 1–2 test of video 001; render it with a public dir that holds narration.wav.
import { Composition, registerRoot } from "remotion";
import { Beats12, END_S, FPS, H, W } from "./Beats12";

const Root = () => <Composition id="OneShotBeats12" component={Beats12} durationInFrames={Math.round(END_S * FPS)} fps={FPS} width={W} height={H} />;

registerRoot(Root);
