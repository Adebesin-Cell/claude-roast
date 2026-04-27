import type { Metrics } from "./schemas.js";

export type Verdict = {
  score: number;
  tier: { label: string; color: "green" | "yellow" | "red" };
  headlineSin: { label: string; count: number; jab: string } | null;
  rapSheet: Array<{ label: string; count: number }>;
};

type SinKey =
  | "corrections"
  | "fixItLazy"
  | "profanity"
  | "apologies"
  | "allCapsRants"
  | "pastedBlobCount"
  | "oneWordPrompts"
  | "ultrathinks"
  | "importantShouts"
  | "veryVeryCount"
  | "dangerCombined"
  | "lateNight";

type SinDef = {
  key: SinKey;
  label: string;
  count: number;
  weight: number;
  jab: (n: number) => string;
};

const tierFor = (score: number) => {
  if (score <= 15) return { label: "Reformed Sinner", color: "green" as const };
  if (score <= 35) return { label: "Mild Cringe", color: "green" as const };
  if (score <= 55) return { label: "Habitual Offender", color: "yellow" as const };
  if (score <= 75) return { label: "Tantrum Coder", color: "yellow" as const };
  if (score <= 90) return { label: "Cooked", color: "red" as const };
  return { label: "Nuclear", color: "red" as const };
};

export const computeVerdict = (m: Metrics): Verdict => {
  const dangerCombined =
    m.danger.noVerify + m.danger.forcePush + m.danger.gitResetHard + m.danger.rmRf;

  const sins = [
    {
      key: "corrections",
      label: "corrections to Claude",
      count: m.attitude.corrections,
      weight: 1,
      jab: (n) => `${n} corrections logged. Maybe try being right the first time.`,
    },
    {
      key: "fixItLazy",
      label: "fix-it prompts",
      count: m.attitude.fixItLazy,
      weight: 1,
      jab: (n) => `${n} 'fix it' prompts. Vague is a vibe, but not the kind that ships.`,
    },
    {
      key: "profanity",
      label: "swears at the LLM",
      count: m.attitude.profanity,
      weight: 1,
      jab: (n) => `${n} times you swore at a stochastic parrot. It can't hear you.`,
    },
    {
      key: "apologies",
      label: "apologies to the AI",
      count: m.signature.apologies,
      weight: 1,
      jab: (n) => `${n} apologies to a language model. It does not forgive. It does not remember.`,
    },
    {
      key: "allCapsRants",
      label: "all-caps rants",
      count: m.attitude.allCapsRants,
      weight: 1,
      jab: (n) => `${n} ALL CAPS RANTS. Volume is not a prompting strategy.`,
    },
    {
      key: "pastedBlobCount",
      label: "pasted blobs",
      count: m.promptHabits.pastedBlobCount,
      weight: 0.5,
      jab: (n) => `${n} pasted blobs. There's a tool called Read.`,
    },
    {
      key: "oneWordPrompts",
      label: "one-word prompts",
      count: m.promptHabits.oneWordPrompts,
      weight: 0.3,
      jab: (n) => `${n} one-word prompts. 'fix'. 'go'. 'why'. Cinema.`,
    },
    {
      key: "ultrathinks",
      label: "ultrathinks",
      count: m.overprompting.ultrathinks,
      weight: 2,
      jab: (n) => `${n} ultrathinks logged. Saying 'think harder' is not a model upgrade.`,
    },
    {
      key: "importantShouts",
      label: "IMPORTANT shouts",
      count: m.overprompting.importantShouts,
      weight: 0.5,
      jab: (n) => `${n} IMPORTANTs. If everything is important, nothing is.`,
    },
    {
      key: "veryVeryCount",
      label: "'very very' pile-ons",
      count: m.overprompting.veryVeryCount,
      weight: 1,
      jab: (n) => `${n} 'very very's. Adverbs do not improve weights.`,
    },
    {
      key: "dangerCombined",
      label: "danger-zone commands",
      count: dangerCombined,
      weight: 3,
      jab: (n) => `${n} flirtations with --no-verify, --force, reset --hard, or rm -rf. Live fast, lose work.`,
    },
    {
      key: "lateNight",
      label: "late-night prompts",
      count: m.timePatterns.lateNight,
      weight: 0.2,
      jab: (n) => `${n} prompts between midnight and 5am. Sleep is also a productivity tool.`,
    },
  ] satisfies SinDef[];

  const raw = sins.reduce((acc, s) => acc + s.count * s.weight, 0);
  const score = Math.min(100, Math.round(Math.log2(raw + 1) * 12));
  const tier = tierFor(score);

  const positive = sins.filter((s) => s.count > 0);
  const headlineCandidate = positive.length
    ? positive.reduce((best, s) => (s.count * s.weight > best.count * best.weight ? s : best))
    : null;

  const headlineSin = headlineCandidate
    ? {
        label: headlineCandidate.label,
        count: headlineCandidate.count,
        jab: headlineCandidate.jab(headlineCandidate.count),
      }
    : null;

  const rapSheet = [...sins]
    .filter((s) => s.count > 0 && s.key !== "dangerCombined")
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((s) => ({ label: s.label, count: s.count }));

  return { score, tier, headlineSin, rapSheet };
};
