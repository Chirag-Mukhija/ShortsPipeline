// Gallery root: one Remotion composition per catalog entry (<theme>--<entry>), drawn on its theme's background.
import { AbsoluteFill, Composition } from "remotion";
import type { LibraryTheme } from "./core/catalog";
import { FPS, H, W } from "./core/video";

export const GalleryRoot = ({ themes }: { themes: LibraryTheme[] }) => (
  <>
    {themes.flatMap((theme) =>
      theme.entries.map((e) => {
        const Item = () => (
          <AbsoluteFill>
            <theme.Background />
            <e.Demo />
          </AbsoluteFill>
        );
        return <Composition key={`${theme.slug}--${e.id}`} id={`${theme.slug}--${e.id}`} component={Item} durationInFrames={Math.round(e.seconds * FPS)} fps={FPS} width={W} height={H} />;
      }),
    )}
  </>
);
