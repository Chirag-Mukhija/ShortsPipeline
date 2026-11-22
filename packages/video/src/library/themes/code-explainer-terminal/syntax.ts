// A tiny line tokenizer for JS/TS, Python and shell that colours code with the theme's GitHub-dark mapping.
import { SYN } from "./theme";

export type Lang = "ts" | "py" | "sh" | "json" | "text";
export type Tok = { s: string; c: string };

const KW: Record<Lang, Set<string>> = {
  ts: new Set("const let var function return if else for while await async import from export default new class extends type interface of in as try catch throw typeof true false null undefined this".split(" ")),
  py: new Set("def return if elif else for while import from as class with try except raise lambda yield async await True False None and or not in is pass".split(" ")),
  sh: new Set("sudo cd export if then fi for do done echo".split(" ")),
  json: new Set("true false null".split(" ")),
  text: new Set(),
};

const RULES: [RegExp, keyof typeof SYN | "word"][] = [
  [/^(\/\/.*|#.*)/, "comment"],
  [/^("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?|`(?:[^`\\]|\\.)*`?)/, "string"],
  [/^\d[\d_.]*(?:kb|ms|s|x)?\b/, "num"],
  [/^<\/?[A-Za-z][\w.]*/, "tag"],
  [/^[A-Za-z_$][\w$]*/, "word"],
  [/^\s+/, "plain"],
  [/^./, "plain"],
];

export const tokenize = (line: string, lang: Lang): Tok[] => {
  if (lang === "text") return [{ s: line, c: SYN.plain }];
  const out: Tok[] = [];
  let rest = line;
  let prev = "";
  while (rest.length) {
    for (const [re, kind] of RULES) {
      const m = re.exec(rest);
      if (!m) continue;
      const s = m[0];
      let c: string = SYN.plain;
      if (kind === "comment") c = lang === "ts" && s.startsWith("#") ? SYN.plain : SYN.comment;
      else if (kind === "word") {
        const after = rest.slice(s.length);
        if (KW[lang].has(s)) c = SYN.keyword;
        else if (lang === "sh" && out.length === 0) c = SYN.fn;
        else if (lang === "sh" && s.startsWith("-")) c = SYN.num;
        else if (/^\s*\(/.test(after)) c = SYN.fn;
        else if (prev.endsWith(".")) c = SYN.prop;
        else if (/^[A-Z]/.test(s)) c = SYN.type;
        else if (lang === "json" || /^\s*:/.test(after)) c = SYN.prop;
      } else if (kind !== "plain") c = SYN[kind];
      // Comments and the `#` rule only apply where the language has them.
      if (kind === "comment" && lang === "ts" && s.startsWith("#")) {
        out.push({ s: "#", c: SYN.plain });
        rest = rest.slice(1);
        prev = "#";
        break;
      }
      if (lang === "sh" && /^-{1,2}[\w-]+/.test(rest)) {
        const flag = /^-{1,2}[\w-]+/.exec(rest)![0];
        out.push({ s: flag, c: SYN.num });
        rest = rest.slice(flag.length);
        prev = flag;
        break;
      }
      out.push({ s, c });
      rest = rest.slice(s.length);
      if (s.trim()) prev = s;
      break;
    }
  }
  return out;
};

// Cut a token list to its first n characters (the typewriter).
export const sliceToks = (toks: Tok[], n: number): Tok[] => {
  const out: Tok[] = [];
  let left = n;
  for (const tk of toks) {
    if (left <= 0) break;
    out.push(left >= tk.s.length ? tk : { s: tk.s.slice(0, left), c: tk.c });
    left -= tk.s.length;
  }
  return out;
};
