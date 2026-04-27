import pc from "picocolors";
import type { Metrics } from "./schemas.js";
import type { Verdict } from "./verdict.js";

const SPARK = "▁▂▃▄▅▆▇█";
const BOX_WIDTH = 60;

export const renderVerdict = (v: Verdict) => {
  const tint =
    v.tier.color === "red" ? pc.red : v.tier.color === "yellow" ? pc.yellow : pc.green;

  const inner = BOX_WIDTH - 2;
  const bar = pc.bold(pc.red("│"));
  const top = pc.bold(pc.red("╭" + "─".repeat(inner) + "╮"));
  const bot = pc.bold(pc.red("╰" + "─".repeat(inner) + "╯"));

  const scoreStr = String(v.score);
  const scoreLabel = "ROAST SCORE";
  const scoreRawLen = 2 + scoreLabel.length + scoreStr.length + 2;
  const scoreGap = Math.max(1, inner - scoreRawLen);
  const scoreLine =
    bar +
    "  " +
    pc.bold(pc.red(scoreLabel)) +
    " ".repeat(scoreGap) +
    pc.bold(scoreStr) +
    "  " +
    bar;

  const tierText = v.tier.label.toUpperCase();
  const tierRawLen = 2 + tierText.length;
  const tierGap = Math.max(1, inner - tierRawLen);
  const tierLine = bar + "  " + pc.bold(tint(tierText)) + " ".repeat(tierGap) + bar;

  console.log("\n" + top);
  console.log(scoreLine);
  console.log(tierLine);
  console.log(bot);

  if (v.headlineSin) {
    console.log("\n  " + pc.bold(pc.red("HEADLINE SIN")));
    console.log("  " + pc.white(v.headlineSin.jab));
  }

  if (v.rapSheet.length) {
    console.log("\n  " + pc.bold(pc.red("RAP SHEET")));
    for (const row of v.rapSheet) {
      const label = row.label.padEnd(28);
      console.log(`  ${pc.dim("·")} ${pc.white(label)} ${pc.bold(String(row.count))}`);
    }
  }
  console.log("");
};

export const renderHeader = () => {
  const line = pc.bold(pc.red("█".repeat(60)));
  console.log("\n" + line);
  console.log(
    pc.bold(pc.red("  CLAUDE-ROAST  ")) +
      pc.dim("— how badly are you using Claude Code?"),
  );
  console.log(line + "\n");
};

export const renderMetrics = (m: Metrics) => {
  const heading = (s: string) => console.log("\n" + pc.bold(pc.yellow(s)));
  const row = (label: string, value: string | number) =>
    console.log(`  ${pc.dim(label.padEnd(30))} ${pc.white(String(value))}`);

  heading("● TOTALS");
  row("prompts", m.totals.prompts);
  row("sessions", m.totals.sessions);
  row("projects", m.totals.projects);
  row("active days", m.totals.daysActive);
  row("longest streak", m.timePatterns.longestStreakDays);

  heading("● PROMPT HABITS");
  row("avg length", `${m.promptHabits.avgLength} chars`);
  row("longest", `${m.promptHabits.longestLength} chars`);
  row("one-word prompts", m.promptHabits.oneWordPrompts);
  row("pasted blobs", m.promptHabits.pastedBlobCount);

  heading("● ATTITUDE");
  row("corrections to claude", m.attitude.corrections);
  row("lazy 'fix it' prompts", m.attitude.fixItLazy);
  row("pleadings (please/pls)", m.attitude.pleadings);
  row("profanity at the LLM", m.attitude.profanity);
  row("all-caps rants", m.attitude.allCapsRants);
  row("apologies to the AI", m.signature.apologies);

  heading("● OVERPROMPTING");
  row("ultrathinks", m.overprompting.ultrathinks);
  row("IMPORTANT shouts", m.overprompting.importantShouts);

  heading("● DANGER ZONE");
  row("--no-verify", m.danger.noVerify);
  row("git push --force", m.danger.forcePush);
  row("git reset --hard", m.danger.gitResetHard);
  row("rm -rf", m.danger.rmRf);

  heading("● TIME PATTERNS");
  row("late night (0-5am)", m.timePatterns.lateNight);
  row("weekend prompts", m.timePatterns.weekend);
  console.log(`  ${pc.dim("hour histogram")}`);
  console.log("  " + sparkline(m.timePatterns.hourHistogram));
  console.log("  " + pc.dim("0   3   6   9   12  15  18  21"));

  if (m.slashCommands.length) {
    heading("● TOP SLASH COMMANDS");
    for (const s of m.slashCommands.slice(0, 5)) row(`/${s.name}`, s.count);
  }

  if (m.topProjects.length) {
    heading("● TOP PROJECTS");
    for (const p of m.topProjects) {
      row(p.name, `${p.prompts} prompts, ${p.sessions} sessions`);
    }
  }
};

export const renderRoast = (roast: string) => {
  const bar = pc.bold(pc.red("─".repeat(60)));
  console.log("\n" + bar);
  console.log(pc.bold(pc.red("  THE ROAST")));
  console.log(bar + "\n");
  console.log(pc.white(roast));
  console.log("\n" + bar + "\n");
};

const sparkline = (values: number[]) => {
  const max = Math.max(...values, 1);
  return values
    .map((v) => SPARK[Math.min(SPARK.length - 1, Math.floor((v / max) * (SPARK.length - 1)))])
    .join(" ");
};
