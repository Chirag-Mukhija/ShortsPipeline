// Tests for fitting generated tags into YouTube's 500-character tag budget.
import { describe, expect, it } from "vitest";
import { fitTags } from "./youtube";

describe("fitTags", () => {
  it("keeps tags in order until the budget is spent, counting quotes for multi-word tags", () => {
    const tags = ["ram", "how macos manages memory", "x".repeat(30)];
    expect(fitTags(tags, 3 + 1 + 26)).toEqual(["ram", "how macos manages memory"]);
    expect(fitTags(tags, 20)).toEqual(["ram"]);
  });

  it("strips characters YouTube rejects and drops empty tags", () => {
    expect(fitTags(["<b>ram</b>", "<>", "cpu"])).toEqual(["bram/b", "cpu"]);
  });
});
