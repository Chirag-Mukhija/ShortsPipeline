// Pronunciation fixes for tech terms: turns displayed words into what the voice should say, keeping character spans for alignment.
const LEXICON: Record<string, string> = {
  macos: "mac O S",
  ios: "i O S",
  ipados: "iPad O S",
  watchos: "watch O S",
  visionos: "vision O S",
  sql: "sequel",
  mysql: "my sequel",
  gui: "gooey",
  saas: "sass",
  json: "jason",
  npm: "N P M",
  esim: "e-SIM",
  esims: "e-SIMs",
  jpeg: "jay peg",
  jpg: "jay peg",
  nginx: "engine X",
  vs: "versus",
  wifi: "wi-fi",
};

const UNITS: Record<string, string> = {
  gb: "gigabytes",
  mb: "megabytes",
  kb: "kilobytes",
  tb: "terabytes",
  ghz: "gigahertz",
  mhz: "megahertz",
  ms: "milliseconds",
  fps: "F P S",
  mbps: "megabits per second",
  gbps: "gigabits per second",
};

function speak(word: string): string {
  const match = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}.+#'-]*?)([^\p{L}\p{N}]*)$/u);
  if (!match) return word;
  const [, lead = "", core = "", trail = ""] = match;
  const lower = core.toLowerCase();
  const direct = LEXICON[lower];
  if (direct) return `${lead}${direct}${trail}`;
  const unit = lower.match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
  if (unit && unit[2] && UNITS[unit[2]]) return `${lead}${unit[1]} ${UNITS[unit[2]]}${trail}`;
  return word;
}

export function toSpeech(displayWords: string[]): { speech: string; spans: { start: number; end: number }[] } {
  let speech = "";
  const spans: { start: number; end: number }[] = [];
  displayWords.forEach((word, i) => {
    if (i > 0) speech += " ";
    const spoken = speak(word);
    spans.push({ start: speech.length, end: speech.length + spoken.length });
    speech += spoken;
  });
  return { speech, spans };
}
