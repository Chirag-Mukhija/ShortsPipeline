// Official Azure Speech neural TTS (the same en-IN voices as Edge) with word boundaries; needs a free-tier key.
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import type { SpeechBoundary, SpeechResult, TtsProvider } from "./types";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export class AzureTts implements TtsProvider {
  readonly id = "azure";

  constructor(
    private readonly key: string,
    private readonly region: string,
    readonly voice: string,
    private readonly rate: string,
  ) {}

  synthesize(text: string): Promise<SpeechResult> {
    const config = sdk.SpeechConfig.fromSubscription(this.key, this.region);
    config.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;
    const synthesizer = new sdk.SpeechSynthesizer(config, null as unknown as sdk.AudioConfig);
    const boundaries: SpeechBoundary[] = [];
    synthesizer.wordBoundary = (_sender, event) => {
      if (event.boundaryType !== sdk.SpeechSynthesisBoundaryType.Word) return;
      const startMs = event.audioOffset / 10_000;
      boundaries.push({ text: event.text, startMs, endMs: startMs + event.duration / 10_000 });
    };
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-IN"><voice name="${this.voice}"><prosody rate="${this.rate}">${escapeXml(text)}</prosody></voice></speak>`;
    return new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve({ audio: Buffer.from(result.audioData), boundaries });
          } else {
            reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure TTS failed: ${String(error)}`));
        },
      );
    });
  }
}
