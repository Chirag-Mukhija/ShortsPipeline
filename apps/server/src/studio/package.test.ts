// Tests the upload package checker: YouTube's chapter rules, required credits, tag budget and the title's mobile cut.
import { checkUpload, chaptersOf } from "@clipforge/schema";
import { describe, expect, it } from "vitest";

const credit = "Wholesome Kevin MacLeod (incompetech.com)\r\nLicensed under Creative Commons: By Attribution 4.0";
const base = {
  title: "AI Can Code. So What Should I Learn?",
  description: "Intro line.\n\n0:00 The hook\n0:40 The chain\n2:00 Is switching bad?\n\nMusic: Wholesome Kevin MacLeod (incompetech.com)\nLicensed under Creative Commons: By Attribution 4.0",
  tags: ["learning to code", "ai"],
  privacy: "private",
  file: "renders/final.mp4",
  thumbnail: "package/thumbnail.png",
};
const ctx = { duration: 300, credits: [credit] };
const rules = (u: unknown, c = ctx) => checkUpload(u, c).issues.map((i) => `${i.level} ${i.rule}`);

describe("checkUpload", () => {
  it("passes a good package", () => {
    expect(checkUpload(base, ctx).ok).toBe(true);
  });

  it("reads chapters the way YouTube does", () => {
    expect(chaptersOf(base.description)).toEqual([
      { at: 0, title: "The hook" },
      { at: 40, title: "The chain" },
      { at: 120, title: "Is switching bad?" },
    ]);
    expect(chaptersOf("1:02:03 - Late one")[0]).toEqual({ at: 3723, title: "Late one" });
  });

  it("refuses chapters YouTube would drop", () => {
    expect(rules({ ...base, description: base.description.replace("0:00", "0:05") })).toContain("red chapters");
    expect(rules({ ...base, description: base.description.replace("0:40", "0:05") })).toContain("red chapters");
    expect(rules({ ...base, description: "0:00 A\n1:00 B\nMusic: Wholesome Kevin MacLeod (incompetech.com)" })).toContain("red chapters");
  });

  it("needs the licence credit, private uploads and a tag budget", () => {
    expect(rules({ ...base, description: "0:00 A\n1:00 B\n2:00 C" })).toContain("red credit");
    expect(rules({ ...base, description: base.description.replace("Licensed under Creative Commons: By Attribution 4.0", "") })).toContain("red credit");
    expect(checkUpload({ ...base, privacy: "public" }, ctx).ok).toBe(false);
    expect(rules({ ...base, tags: Array.from({ length: 60 }, (_, i) => `tag number ${i}`) })).toContain("red tags");
    expect(rules({ ...base, title: "x".repeat(70) })).toContain("yellow title");
    expect(rules({ ...base, title: "a <b>" })).toContain("red text");
  });
});
