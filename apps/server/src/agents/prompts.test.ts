// Tests that a creator's feedback note is folded into the review prompt as a firm instruction, not silently dropped.
import type { Script } from "@clipforge/schema";
import { describe, expect, it } from "vitest";
import { reviewPrompt } from "./prompts";

const draft: Script = { title: "Test", scenes: [{ id: "s1", narration: "Hello world.", visual: "hook" }] };

describe("reviewPrompt", () => {
  it("omits any note section when no feedback is given", () => {
    const { prompt } = reviewPrompt("a topic", draft);
    expect(prompt).not.toContain("The creator left this note");
  });

  it("includes the note verbatim and tells the critic to address it first", () => {
    const { prompt } = reviewPrompt("a topic", draft, "make scene 1 funnier");
    expect(prompt).toContain('"make scene 1 funnier"');
    expect(prompt).toContain("Address the creator's note above first.");
  });

  it("ignores a note that is empty after trimming", () => {
    const { prompt } = reviewPrompt("a topic", draft, "   ");
    expect(prompt).not.toContain("The creator left this note");
  });
});
