import { z } from "zod";

export const HistoryEntrySchema = z
  .object({
    display: z.string(),
    timestamp: z.number(),
    project: z.string().optional(),
    sessionId: z.string().optional(),
    pastedContents: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const SessionMessageSchema = z
  .object({
    type: z.string().optional(),
    message: z
      .object({
        role: z.string().optional(),
        content: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
    toolUseResult: z
      .object({
        is_error: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();
export type SessionMessage = z.infer<typeof SessionMessageSchema>;

export const SeveritySchema = z.enum(["gentle", "mean", "nuclear"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const CliOptsSchema = z.object({
  days: z.number().int().positive().optional(),
  project: z.string().min(1).optional(),
  severity: SeveritySchema.default("mean"),
  dryRun: z.boolean().default(false),
  rules: z.boolean().default(false),
  json: z.boolean().default(false),
  html: z.union([z.string().min(1), z.boolean()]).optional(),
  open: z.boolean().default(false),
  model: z.string().min(1).optional(),
});
export type CliOpts = z.infer<typeof CliOptsSchema>;

const SampleList = z.array(z.string());

export const MetricsSchema = z.object({
  totals: z.object({
    prompts: z.number(),
    sessions: z.number(),
    projects: z.number(),
    sessionFiles: z.number(),
    daysActive: z.number(),
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
  }),
  promptHabits: z.object({
    avgLength: z.number(),
    medianLength: z.number(),
    longestLength: z.number(),
    shortestLength: z.number(),
    oneWordPrompts: z.number(),
    oneWordSamples: SampleList,
    pastedBlobCount: z.number(),
    promptsWithPaste: z.number(),
    longestPromptSample: z.string(),
    shortestPromptSample: z.string(),
  }),
  attitude: z.object({
    corrections: z.number(),
    correctionSamples: SampleList,
    pleadings: z.number(),
    profanity: z.number(),
    profanitySamples: SampleList,
    allCapsRants: z.number(),
    fixItLazy: z.number(),
    fixItSamples: SampleList,
    thxCount: z.number(),
    questionMarks: z.number(),
  }),
  overprompting: z.object({
    ultrathinks: z.number(),
    ultrathinkSamples: SampleList,
    importantShouts: z.number(),
    veryVeryCount: z.number(),
  }),
  danger: z.object({
    noVerify: z.number(),
    forcePush: z.number(),
    gitResetHard: z.number(),
    rmRf: z.number(),
    examples: SampleList,
  }),
  timePatterns: z.object({
    lateNight: z.number(),
    earlyMorning: z.number(),
    weekend: z.number(),
    hourHistogram: z.array(z.number()),
    longestStreakDays: z.number(),
  }),
  slashCommands: z.array(
    z.object({ name: z.string(), count: z.number() }),
  ),
  topProjects: z.array(
    z.object({
      name: z.string(),
      sessions: z.number(),
      prompts: z.number(),
    }),
  ),
  toolPain: z.object({
    toolFailures: z.number(),
    permissionDenials: z.number(),
    sessionsScanned: z.number(),
  }),
  signature: z.object({
    favoriteWord: z.string().nullable(),
    favoriteSlashCommand: z.string().nullable(),
    apologies: z.number(),
  }),
});
export type Metrics = z.infer<typeof MetricsSchema>;
