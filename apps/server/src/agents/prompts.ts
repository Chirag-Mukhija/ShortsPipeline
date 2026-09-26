// Prompt builders for every writing agent, all sharing one channel voice guide.
import {
  ICON_NAMES,
  TEMPLATE_GUIDE,
  TEMPLATE_NAMES,
  type Angle,
  type Script,
} from "@clipforge/schema";

export const WORDS_MIN = 110;
export const WORDS_MAX = 165;

export const VOICE_GUIDE = `You write for a YouTube Shorts and Instagram Reels channel that explains how technology actually works to curious beginners in India.

Channel voice
- Persona: the witty senior-engineer friend who explains things over chai. Confident, playful, slightly irreverent, never condescending.
- Language: simple spoken English as young urban Indians speak it. Short sentences, contractions, everyday words. Casual phrases like "basically", "here's the thing" or "plot twist" are fine in moderation. No Hindi words.
- Humor: dry one-liners, playful exaggeration and relatable Indian daily-life references (chai, auto-rickshaws, UPI, cricket, IRCTC tatkal, exam season, jugaad) when they genuinely make the idea click. Never punch down. No politics or religion. Mild words like "damn" are fine; nothing stronger.
- Banned filler: "In this video", "Let's dive in", "Did you know", "Without further ado", "Smash that like button", "Hey guys".

What makes a great short (45-75 seconds, ${WORDS_MIN}-${WORDS_MAX} spoken words)
1. Hook, first sentence, under 3 seconds: a surprising claim, a contradiction, or the exact question the viewer has wondered about. It must create an itch only the video can scratch.
2. Setup: the common belief or the everyday situation.
3. Reveal: the real mechanism, step by step and concrete. One strong analogy. Real technical terms, each explained the instant it appears.
4. Payoff: a number, an edge case or a "wait, really?" detail.
5. Ending: a punchline that ties back to the hook so the loop feels natural. No outro, no "follow for more".

Accuracy
- Only state what you are confident is true. Prefer "roughly", "usually" or "up to" over invented precise numbers.
- Simplify, but never say something false. If something differs by device, OS or country, say so briefly.

Narration is read aloud by a text-to-speech voice
- Write units and symbols the way they are spoken: "sixteen gigs of RAM" or "16 gigabytes", never "16GB"; "percent", not "%".
- No emojis, hashtags, markdown, parentheses or stage directions in narration.`;

export function anglePrompt(topic: string): { system: string; prompt: string } {
  return {
    system: `${VOICE_GUIDE}\n\nYou are the channel's head of ideas.`,
    prompt: `Topic: ${topic}

Brainstorm 4 genuinely different angles for a short on this topic. Mix approaches: myth-busting, "what actually happens when you...", a shocking number, a relatable Indian everyday situation, a "you've been using it wrong" twist.
For each angle give the spoken hook line, a working title, the promise (what a beginner will truly understand by the end) and one analogy that makes the core mechanism click.
Then choose the angle most likely to stop a scrolling beginner in India and keep them watching to the last second, and say why in one sentence.`,
  };
}

export function scriptPrompt(topic: string, angle: Angle): { system: string; prompt: string } {
  return {
    system: `${VOICE_GUIDE}\n\nYou are the channel's scriptwriter.`,
    prompt: `Topic: ${topic}

Chosen angle
- Hook: ${angle.hook}
- Working title: ${angle.title}
- Promise: ${angle.promise}
- Analogy: ${angle.analogy}

Write the full script as 5 to 9 scenes.
- Total narration must be ${WORDS_MIN}-${WORDS_MAX} words.
- Scene s1 is the hook: at most 14 words, spoken in under 3 seconds.
- Each scene is one visual beat: 1-2 short sentences, at most 30 words.
- The "visual" line for each scene should be showable with animated text, a diagram of the mechanism, a code or terminal snippet, an A-vs-B comparison, a short list, a big number, or real-world footage.
- Build understanding step by step; every scene must earn its place.
- The last scene lands the punchline and loops back to the hook.
- Use scene ids s1, s2, s3 ... in order.`,
  };
}

export function reviewPrompt(topic: string, draft: Script): { system: string; prompt: string } {
  return {
    system: `${VOICE_GUIDE}\n\nYou are the channel's toughest editor and fact-checker. Nothing gets published without passing you.`,
    prompt: `Review this draft script for a short on "${topic}".

Draft (JSON):
${JSON.stringify(draft, null, 2)}

1. Score it 1-10 on hook, clarity, accuracy, pacing and wit.
2. List concrete issues, most important first: factual errors or shaky claims first, then a weak hook, confusing or skipped steps, filler, cringe phrasing, length problems, weak ending.
3. Return the improved final script:
   - Fix every factual problem and soften any claim you are not sure about.
   - Keep ${WORDS_MIN}-${WORDS_MAX} words of narration and 5-9 scenes with ids s1, s2, ... in order.
   - Keep the hook at most 14 words and each scene at most 30 words.
   - Keep what already works. Do not rewrite for the sake of it.`,
  };
}

export function storyboardPrompt(script: Script, stockAvailable: boolean): { system: string; prompt: string } {
  const allowed = TEMPLATE_NAMES.filter((name) => stockAvailable || name !== "Media");
  const templates = allowed
    .map((name) => `- ${name}: ${TEMPLATE_GUIDE[name].use} Cues: ${TEMPLATE_GUIDE[name].cues}`)
    .join("\n");
  const scenes = script.scenes
    .map((scene) => `${scene.id}: "${scene.narration}"\n    visual idea: ${scene.visual}`)
    .join("\n");
  return {
    system: `You are the motion designer for a fast, witty tech explainer channel in the style of Fireship. You turn scripts into storyboards built from a fixed set of animated templates.`,
    prompt: `Turn this script into a storyboard: for every scene pick ONE template, fill its props, and add cues that sync animations to spoken words.

Templates
${templates}

Rules
- Scene s1 must be HookSlam. Never use HookSlam anywhere else.
- Diagram is the workhorse for explaining how things work; use it for the core mechanism, building it up with reveal cues as each part is mentioned.
- Vary templates so the video keeps moving; avoid the same template three times in a row.
${stockAvailable ? "- Media (stock footage) is available; use it at most twice, for real-world grounding shots." : "- Stock footage is NOT available: never use Media."}
- On-screen text must be short (respect every limit in the schema) and should complement the narration, not repeat it word for word.
- Every cue "word" must be copied exactly from that scene's narration. Every cue target must exist: node ids for diagrams, edges as edge:<from>-<to>, line:<n> within the code, item:<n> within the list, left/right/verdict for Compare.
- Icons: use a single emoji, or 'lucide:<name>' with a name from this list only: ${ICON_NAMES.join(", ")}.
- Code must be correct, at most 12 lines and 34 characters per line.
- Keep the same scene ids and order as the script.

Script
${scenes}`,
  };
}

export function metadataPrompt(topic: string, script: Script): { system: string; prompt: string } {
  const narration = script.scenes.map((scene) => scene.narration).join(" ");
  return {
    system: `You are a YouTube Shorts and Instagram Reels growth strategist for an English tech explainer channel aimed at curious beginners in India.`,
    prompt: `Write publishing metadata for this short.

Topic: ${topic}
Working title: ${script.title}
Narration: ${narration}

- Titles: 3-5 options, max 60 characters, curiosity-driven but honest, key term early, no ALL CAPS, no emoji spam. Best first.
- YouTube description: 2-3 short lines that expand the hook and add one extra insight, then "Follow for 60-second tech explainers." No hashtags in the description.
- YouTube hashtags: 3-5 without '#', specific first (e.g. macos, ram), then one broad (e.g. techexplained); put "shorts" last.
- Tags: 8-15 lowercase search phrases a beginner would actually type.
- Instagram caption: a hook line, 1-2 lines of value, then "Follow for more tech, explained simply." No hashtags in the caption.
- Instagram hashtags: 3-5 without '#', niche plus broad.`,
  };
}
