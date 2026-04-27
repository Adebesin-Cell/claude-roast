import { streamText, type LanguageModel } from "ai";
import type { Metrics, Severity } from "./schemas.js";

const SEVERITY_TONE = {
  gentle:
    "Be playful and light. Tease, don't wound. Land jokes but keep affection.",
  mean:
    "Be a stand-up comedian doing a roast set. Specific, punchy, observational. Mean enough to sting and make them laugh out loud, but not cruel — punch at habits, not the person. Cite the actual numbers.",
  nuclear:
    "Be Don Rickles meets Linus Torvalds in a bad mood. Brutal, hilarious, no mercy on bad habits. Still funny, never bigoted, never about looks/identity. Drag every metric.",
} satisfies Record<Severity, string>;

const SYSTEM = `You are a comedy roast writer for software developers. You roast people based on stats from their Claude Code usage history.

Hard rules:
- Punch at HABITS, never identity, looks, race, gender, etc. Keep it about how they prompt and code.
- Always cite specific numbers from the stats — generic roasts are weak roasts.
- No corporate sympathy. No "but seriously, you're doing great!" coda.
- Write like a comedian, not a chatbot. Short punchy sentences. Callbacks within the bit.
- No emojis. No markdown headers. No "Here's your roast:" preamble. Just the roast.
- 6-10 distinct jabs, each a short paragraph or 1-3 sentences.
- End with one ice-cold one-liner verdict on a new line.`;

export type RoastOpts = {
  severity: Severity;
  model: LanguageModel;
};

export const streamRoast = async function* (
  metrics: Metrics,
  opts: RoastOpts,
): AsyncIterable<string> {
  const result = streamText({
    model: opts.model,
    system: SYSTEM,
    prompt: buildPrompt(metrics, opts.severity),
    maxOutputTokens: 1500,
  });
  for await (const chunk of result.textStream) yield chunk;
};

export const collectRoast = async (chunks: AsyncIterable<string>) => {
  let out = "";
  for await (const c of chunks) out += c;
  return out;
};

const buildPrompt = (m: Metrics, severity: Severity) =>
  [
    `Tone: ${SEVERITY_TONE[severity]}`,
    "",
    "Stats from this developer's Claude Code usage. Roast them.",
    "",
    section("TOTALS", [
      `${m.totals.prompts} prompts across ${m.totals.sessions} sessions in ${m.totals.projects} projects`,
      `${m.totals.daysActive} active days, longest streak ${m.timePatterns.longestStreakDays} days`,
      `First seen: ${m.totals.firstSeen ?? "?"}, last seen: ${m.totals.lastSeen ?? "?"}`,
    ]),
    section("PROMPT HABITS", [
      `Average prompt length: ${m.promptHabits.avgLength} chars (median ${m.promptHabits.medianLength})`,
      `Longest prompt: ${m.promptHabits.longestLength} chars`,
      `One-word prompts: ${m.promptHabits.oneWordPrompts} — samples: ${json(m.promptHabits.oneWordSamples)}`,
      `Prompts with pasted blobs: ${m.promptHabits.promptsWithPaste} (${m.promptHabits.pastedBlobCount} total)`,
      `Longest prompt opens with: ${truncate(m.promptHabits.longestPromptSample, 200)}`,
    ]),
    section("ATTITUDE", [
      `Corrections to Claude: ${m.attitude.corrections} — samples: ${json(m.attitude.correctionSamples)}`,
      `Lazy "fix it / continue" prompts: ${m.attitude.fixItLazy} — samples: ${json(m.attitude.fixItSamples)}`,
      `Pleadings ("please/pls"): ${m.attitude.pleadings}`,
      `Profanity directed at the LLM: ${m.attitude.profanity} — samples: ${json(m.attitude.profanitySamples)}`,
      `All-caps rants: ${m.attitude.allCapsRants}`,
      `Apologies (yes, to the AI): ${m.signature.apologies}`,
      `"thx/perfect/great" reply turns: ${m.attitude.thxCount}`,
    ]),
    section("OVERPROMPTING", [
      `"ultrathink / think harder" instances: ${m.overprompting.ultrathinks}`,
      `Shouted directives (IMPORTANT/MUST/DO NOT): ${m.overprompting.importantShouts}`,
      `"very very" pile-ons: ${m.overprompting.veryVeryCount}`,
    ]),
    section("DANGER ZONE", [
      `--no-verify: ${m.danger.noVerify}`,
      `git push --force: ${m.danger.forcePush}`,
      `git reset --hard: ${m.danger.gitResetHard}`,
      `rm -rf: ${m.danger.rmRf}`,
      `Examples: ${json(m.danger.examples)}`,
    ]),
    section("TIME PATTERNS", [
      `Late-night (12am–5am): ${m.timePatterns.lateNight}`,
      `Early-morning (5am–8am): ${m.timePatterns.earlyMorning}`,
      `Weekend prompts: ${m.timePatterns.weekend}`,
      `Hour histogram (0–23): ${m.timePatterns.hourHistogram.join(",")}`,
    ]),
    section("SLASH COMMANDS", m.slashCommands.map((s) => `/${s.name}: ${s.count}`)),
    section("TOP PROJECTS", m.topProjects.map((p) => `${p.name}: ${p.prompts} prompts, ${p.sessions} sessions`)),
    section("TOOL PAIN", [
      `Tool failures observed: ${m.toolPain.toolFailures} (across ${m.toolPain.sessionsScanned} sessions)`,
      `Permission denials: ${m.toolPain.permissionDenials}`,
    ]),
    section("SIGNATURE", [
      `Favorite non-stopword: "${m.signature.favoriteWord ?? "?"}"`,
      `Favorite slash command: "/${m.signature.favoriteSlashCommand ?? "?"}"`,
    ]),
    "",
    "Roast them now. Cite specific numbers. End with one ice-cold one-liner verdict on its own line.",
  ].join("\n");

const section = (title: string, lines: string[]) =>
  lines.length
    ? `=== ${title} ===\n${lines.map((l) => `- ${l}`).join("\n")}\n`
    : `=== ${title} ===\n(none)\n`;

const json = (v: unknown) => JSON.stringify(v);

const truncate = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n)}…` : s;
