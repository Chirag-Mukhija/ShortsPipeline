// Contract for text-to-speech providers: encoded audio plus word boundaries in milliseconds.
export type SpeechBoundary = { text: string; startMs: number; endMs: number };

export type SpeechResult = { audio: Buffer; boundaries: SpeechBoundary[] };

export interface TtsProvider {
  readonly id: string;
  readonly voice: string;
  synthesize(text: string): Promise<SpeechResult>;
}
