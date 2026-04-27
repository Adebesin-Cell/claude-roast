import type { HistoryEntry, Metrics, SessionMessage } from "./schemas.js";
import { iterSessionMessages, type ScanResult } from "./scan.js";
import { PATTERNS, STOPWORDS, LATE_NIGHT_HOURS, EARLY_MORNING_HOURS } from "./patterns.js";

const MAX_SESSIONS_TO_SCAN = 50;
const MAX_SAMPLES = 5;
const SAMPLE_TRUNCATE = 120;

export const compute = async (scan: ScanResult) => {
  const { history, sessionFiles } = scan;

  const promptHabits = collectPromptHabits(history);
  const attitude = collectAttitude(history);
  const overprompting = collectOverprompting(history);
  const danger = collectDanger(history);
  const timePatterns = collectTimePatterns(history);
  const slashCommands = collectSlashCommands(history);
  const projects = collectProjects(history);
  const wordCloud = collectWordFrequencies(history);
  const totals = collectTotals(history, sessionFiles);
  const toolPain = await collectToolPain(sessionFiles);

  return {
    totals,
    promptHabits,
    attitude,
    overprompting,
    danger,
    timePatterns,
    slashCommands,
    topProjects: projects.top,
    toolPain,
    signature: {
      favoriteWord: wordCloud.top,
      favoriteSlashCommand: slashCommands[0]?.name ?? null,
      apologies: attitude.apologyCount,
    },
  } satisfies Metrics;
};

function collectTotals(history: HistoryEntry[], sessionFiles: string[]) {
  const days = new Set<string>();
  const sessionIds = new Set<string>();
  const projectsTouched = new Set<string>();
  let firstTs = Infinity;
  let lastTs = 0;

  for (const e of history) {
    if (e.sessionId) sessionIds.add(e.sessionId);
    if (e.project) projectsTouched.add(e.project);
    if (e.timestamp) {
      firstTs = Math.min(firstTs, e.timestamp);
      lastTs = Math.max(lastTs, e.timestamp);
      days.add(new Date(e.timestamp).toISOString().slice(0, 10));
    }
  }

  return {
    prompts: history.length,
    sessions: sessionIds.size,
    projects: projectsTouched.size,
    sessionFiles: sessionFiles.length,
    daysActive: days.size,
    firstSeen: firstTs === Infinity ? null : new Date(firstTs).toISOString(),
    lastSeen: lastTs === 0 ? null : new Date(lastTs).toISOString(),
  };
}

function collectPromptHabits(history: HistoryEntry[]) {
  const lengths: number[] = [];
  const oneWordSamples = new SampleSet();
  let oneWordPrompts = 0;
  let pastedBlobCount = 0;
  let promptsWithPaste = 0;
  let longest = "";
  let shortest = "";
  let longestLen = 0;
  let shortestLen = Infinity;

  for (const { display } of history) {
    if (!display) continue;
    const len = display.length;
    lengths.push(len);

    if (len > longestLen) {
      longestLen = len;
      longest = display;
    }
    if (len < shortestLen && display.trim()) {
      shortestLen = len;
      shortest = display;
    }

    const words = display.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      oneWordPrompts += 1;
      oneWordSamples.add(display.trim());
    }

    const pastes = [...display.matchAll(PATTERNS.pasted)];
    if (pastes.length) {
      promptsWithPaste += 1;
      pastedBlobCount += pastes.length;
    }
  }

  lengths.sort((a, b) => a - b);
  return {
    avgLength: avg(lengths),
    medianLength: lengths[Math.floor(lengths.length / 2)] ?? 0,
    longestLength: longestLen,
    shortestLength: shortestLen === Infinity ? 0 : shortestLen,
    oneWordPrompts,
    oneWordSamples: oneWordSamples.toArray(),
    pastedBlobCount,
    promptsWithPaste,
    longestPromptSample: longest.slice(0, 280),
    shortestPromptSample: shortest,
  };
}

function collectAttitude(history: HistoryEntry[]) {
  let corrections = 0;
  let pleadings = 0;
  let profanity = 0;
  let allCapsRants = 0;
  let fixItLazy = 0;
  let thxCount = 0;
  let questionMarks = 0;
  let apologyCount = 0;

  const correctionSamples = new SampleSet();
  const profanitySamples = new SampleSet({ max: 3 });
  const fixItSamples = new SampleSet();

  for (const { display } of history) {
    if (!display) continue;
    const trimmed = display.trim();

    if (PATTERNS.correction.test(trimmed)) {
      corrections += 1;
      correctionSamples.add(trimmed.slice(0, SAMPLE_TRUNCATE));
    }
    if (PATTERNS.fixItLazy.test(trimmed)) {
      fixItLazy += 1;
      fixItSamples.add(trimmed.slice(0, 60));
    }
    if (PATTERNS.pleading.test(trimmed)) pleadings += 1;
    if (PATTERNS.profanity.test(trimmed)) {
      profanity += 1;
      profanitySamples.add(trimmed.slice(0, 100));
    }
    if (PATTERNS.apology.test(trimmed)) apologyCount += 1;
    if (PATTERNS.thanksReply.test(trimmed)) thxCount += 1;
    if (isAllCapsRant(trimmed)) allCapsRants += 1;
    questionMarks += (display.match(/\?/g) ?? []).length;
  }

  return {
    corrections,
    correctionSamples: correctionSamples.toArray(),
    pleadings,
    profanity,
    profanitySamples: profanitySamples.toArray(),
    allCapsRants,
    fixItLazy,
    fixItSamples: fixItSamples.toArray(),
    thxCount,
    questionMarks,
    apologyCount,
  };
}

function collectOverprompting(history: HistoryEntry[]) {
  let ultrathinks = 0;
  let importantShouts = 0;
  let veryVeryCount = 0;
  const ultrathinkSamples = new SampleSet({ max: 3 });

  for (const { display } of history) {
    if (!display) continue;
    const m = display.match(PATTERNS.ultrathink);
    if (m) {
      ultrathinks += 1;
      ultrathinkSamples.add(m[0]);
    }
    if (PATTERNS.shouted.test(display)) importantShouts += 1;
    veryVeryCount += (display.match(PATTERNS.veryVery) ?? []).length;
  }

  return {
    ultrathinks,
    ultrathinkSamples: ultrathinkSamples.toArray(),
    importantShouts,
    veryVeryCount,
  };
}

function collectDanger(history: HistoryEntry[]) {
  let noVerify = 0;
  let forcePush = 0;
  let gitResetHard = 0;
  let rmRf = 0;
  const examples = new SampleSet();

  for (const { display } of history) {
    if (!display) continue;
    const flag = (re: RegExp) => re.test(display);
    if (flag(PATTERNS.noVerify)) {
      noVerify += 1;
      examples.add(display.slice(0, SAMPLE_TRUNCATE));
    }
    if (flag(PATTERNS.forcePush)) {
      forcePush += 1;
      examples.add(display.slice(0, SAMPLE_TRUNCATE));
    }
    if (flag(PATTERNS.gitResetHard)) {
      gitResetHard += 1;
      examples.add(display.slice(0, SAMPLE_TRUNCATE));
    }
    if (flag(PATTERNS.rmRf)) {
      rmRf += 1;
      examples.add(display.slice(0, SAMPLE_TRUNCATE));
    }
  }

  return { noVerify, forcePush, gitResetHard, rmRf, examples: examples.toArray() };
}

function collectTimePatterns(history: HistoryEntry[]) {
  const hourHistogram = new Array(24).fill(0);
  const days = new Set<string>();
  let lateNight = 0;
  let earlyMorning = 0;
  let weekend = 0;

  for (const { timestamp } of history) {
    if (!timestamp) continue;
    const d = new Date(timestamp);
    const h = d.getHours();
    hourHistogram[h] = (hourHistogram[h] ?? 0) + 1;
    if (h >= LATE_NIGHT_HOURS.start && h < LATE_NIGHT_HOURS.end) lateNight += 1;
    if (h >= EARLY_MORNING_HOURS.start && h < EARLY_MORNING_HOURS.end) earlyMorning += 1;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) weekend += 1;
    days.add(d.toISOString().slice(0, 10));
  }

  return {
    lateNight,
    earlyMorning,
    weekend,
    hourHistogram,
    longestStreakDays: longestConsecutiveDays(days),
  };
}

function collectSlashCommands(history: HistoryEntry[]) {
  const counts = new Map<string, number>();
  for (const { display } of history) {
    const m = display?.trim().match(PATTERNS.slashCommand);
    if (m?.[1]) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function collectProjects(history: HistoryEntry[]) {
  const promptCount = new Map<string, number>();
  const sessionsPerProject = new Map<string, Set<string>>();

  for (const { project, sessionId } of history) {
    if (!project) continue;
    promptCount.set(project, (promptCount.get(project) ?? 0) + 1);
    if (sessionId) {
      let set = sessionsPerProject.get(project);
      if (!set) {
        set = new Set();
        sessionsPerProject.set(project, set);
      }
      set.add(sessionId);
    }
  }

  const top = [...promptCount.entries()]
    .map(([path, prompts]) => ({
      name: prettyProjectName(path),
      prompts,
      sessions: sessionsPerProject.get(path)?.size ?? 0,
    }))
    .sort((a, b) => b.prompts - a.prompts)
    .slice(0, 5);

  return { top };
}

function collectWordFrequencies(history: HistoryEntry[]) {
  const freq = new Map<string, number>();
  for (const { display } of history) {
    if (!display) continue;
    for (const word of display.toLowerCase().split(/[^a-z']+/)) {
      if (word.length <= 3 || STOPWORDS.has(word)) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { top };
}

async function collectToolPain(sessionFiles: string[]) {
  const sample = sessionFiles.slice(-MAX_SESSIONS_TO_SCAN);
  let toolFailures = 0;
  let permissionDenials = 0;

  for await (const msg of iterSessionMessages(sample)) {
    if (msg.toolUseResult?.is_error) toolFailures += 1;
    if (containsPermissionDenied(msg)) permissionDenials += 1;
  }

  return {
    toolFailures,
    permissionDenials,
    sessionsScanned: sample.length,
  };
}

function containsPermissionDenied(msg: SessionMessage): boolean {
  const content = msg.message?.content;
  if (typeof content === "string") {
    return /permission denied|user denied/i.test(content);
  }
  if (!Array.isArray(content)) return false;
  return content.some((part) => {
    if (!part || typeof part !== "object") return false;
    const p = part as { type?: unknown; content?: unknown };
    return (
      p.type === "tool_result" &&
      typeof p.content === "string" &&
      /permission denied|user denied/i.test(p.content)
    );
  });
}

class SampleSet {
  private set = new Set<string>();
  private max: number;
  constructor({ max = MAX_SAMPLES }: { max?: number } = {}) {
    this.max = max;
  }
  add(s: string): void {
    if (this.set.size < this.max) this.set.add(s);
  }
  toArray(): string[] {
    return [...this.set];
  }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function isAllCapsRant(s: string): boolean {
  return s.length > 6 && s === s.toUpperCase() && /[A-Z]/.test(s);
}

function prettyProjectName(p: string): string {
  return p.split("/").filter(Boolean).slice(-2).join("/");
}

function longestConsecutiveDays(days: Set<string>): number {
  if (!days.size) return 0;
  const sorted = [...days].sort();
  const DAY = 86400000;
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]!).getTime();
    const curr = new Date(sorted[i]!).getTime();
    if (curr - prev === DAY) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}
