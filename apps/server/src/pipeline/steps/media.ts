// Media steps: voice every scene with word timings, then gather stock footage, highlighted code, music and SFX.
import path from "node:path";
import type { AssetsArtifact, ResolvedAsset, VoiceArtifact, VoiceScene } from "@clipforge/schema";
import { highlightCode } from "../../assets/code";
import { pickGameplay } from "../../assets/gameplay";
import { pickMusic } from "../../assets/music";
import { download, findStock } from "../../assets/stock";
import { absFromData, paths, relFromData } from "../../config";
import { getRecording } from "../../db/repo";
import { ensureSfxLibrary } from "../../media/ffmpeg";
import { speakScene, ttsChain, type SpokenScene } from "../../tts";
import type { TtsProvider } from "../../tts/types";
import { alignRecordedScene } from "../../tts/whisperAlign";
import type { StepContext } from "../context";
import { errorMessage } from "../errors";

export async function voiceStep(ctx: StepContext): Promise<VoiceArtifact> {
  const script = ctx.need("review").script;
  const chain = ttsChain();
  let provider: TtsProvider | null = null;
  const scenes: VoiceScene[] = [];
  for (const [index, scene] of script.scenes.entries()) {
    ctx.progress(index / script.scenes.length, `Voicing ${scene.id}`);
    const file = ctx.file("audio", `${scene.id}.mp3`);
    const recording = getRecording(ctx.project.id, scene.id);
    if (recording) {
      try {
        const aligned = await alignRecordedScene(absFromData(recording.file), file, scene.narration);
        scenes.push({ id: scene.id, file: relFromData(file), source: "recorded", ...aligned });
        ctx.log(`${scene.id}: used your recording (aligned with Whisper)`);
        continue;
      } catch (error) {
        ctx.log(`${scene.id}: could not align your recording (${errorMessage(error)}), using the AI voice instead`, "warn");
      }
    }
    let spoken: SpokenScene | null = null;
    let lastError: unknown = null;
    const candidates: TtsProvider[] = provider ? [provider] : chain;
    for (const candidate of candidates) {
      try {
        spoken = await speakScene(candidate, scene.narration, file);
        provider = candidate;
        break;
      } catch (error) {
        lastError = error;
        ctx.log(`${candidate.id} voice failed on ${scene.id}: ${errorMessage(error)}`, "warn");
      }
    }
    if (!spoken || !provider) throw new Error(`No voice provider could speak ${scene.id}: ${errorMessage(lastError)}`);
    scenes.push({ id: scene.id, file: relFromData(file), source: "tts", ...spoken });
  }
  const recordedCount = scenes.filter((scene) => scene.source === "recorded").length;
  const totalMs = scenes.reduce((sum, scene) => sum + scene.speechEndMs, 0);
  const voiceLabel = provider ? `${provider.id} (${provider.voice})` : "your recordings only";
  ctx.log(
    `Voiced ${scenes.length} scenes${recordedCount ? `, ${recordedCount} in your own voice` : ""} with ${voiceLabel}, ~${(totalMs / 1000).toFixed(1)}s of speech`,
  );
  return { provider: provider?.id ?? "recorded", voice: provider?.voice ?? "", scenes, totalMs };
}

export async function assetsStep(ctx: StepContext): Promise<AssetsArtifact> {
  await ensureSfxLibrary(paths.sfx);
  const board = ctx.need("storyboard");
  const media: Record<string, ResolvedAsset | null> = {};
  const code: AssetsArtifact["code"] = {};
  for (const [index, scene] of board.scenes.entries()) {
    ctx.progress(index / board.scenes.length, `Preparing ${scene.id}`);
    if (scene.template === "Media") {
      try {
        const hit = await findStock(scene.props.query, scene.props.kind);
        if (hit) {
          const file = ctx.file("assets", `${scene.id}.${hit.ext}`);
          await download(hit.url, file);
          media[scene.id] = { src: relFromData(file), type: hit.type, credit: hit.credit };
          ctx.log(`${scene.id}: ${hit.credit}`);
        } else {
          media[scene.id] = null;
          ctx.log(`${scene.id}: no stock match for "${scene.props.query}", using the icon card`, "warn");
        }
      } catch (error) {
        media[scene.id] = null;
        ctx.log(`${scene.id}: stock download failed (${errorMessage(error)}), using the icon card`, "warn");
      }
    }
    if (scene.template === "CodeBlock") {
      code[scene.id] = await highlightCode(scene.props.code, scene.props.language);
    }
  }
  const music = pickMusic(ctx.project.id);
  ctx.log(music ? `Music: ${path.basename(music.src)}` : "No tracks in data/library/music, so the mix is voice plus SFX");
  const background = await pickGameplay(ctx.project.id);
  if (background) ctx.log(`Background: ${path.basename(background.src)} (split-screen layout)`);
  return { media, code, music, background };
}
