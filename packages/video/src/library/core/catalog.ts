// Shapes of the library catalog: every theme lists its entries with a demo, so the gallery, the website and the agents all read one source.
import type { FC } from "react";

export type LibraryKind = "background" | "primitive" | "doodle" | "piece" | "transition" | "camera";

export type LibraryEntry = {
  id: string;
  kind: LibraryKind;
  title: string;
  // When an animator should reach for it.
  useFor: string;
  // The component(s) to import and their key props, as a one-line hint.
  api: string;
  // Length of the demo in seconds; previews are taken from its last frame.
  seconds: number;
  // Where it was first made, e.g. "video 001, Beat 1".
  origin?: string;
  Demo: FC;
};

export type LibraryTheme = {
  slug: string;
  name: string;
  summary: string;
  feel: string[];
  // draft = being built; ready = used in a real video and approved by the creator.
  status: "draft" | "ready";
  // Path of the reference board this theme was built from, if any.
  board?: string;
  Background: FC;
  entries: LibraryEntry[];
};
