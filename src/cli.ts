import { Command } from "commander";
import pc from "picocolors";
import yoctoSpinner from "yocto-spinner";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { CliOptsSchema, type CliOpts } from "./schemas.js";
import { scan } from "./scan.js";
import { compute } from "./metrics.js";
import { streamRoast } from "./roast.js";
import { renderHeader, renderMetrics, renderVerdict } from "./render.js";
import { renderHtml } from "./html.js";
import { generateAntiRules } from "./rules.js";
import { computeVerdict } from "./verdict.js";
import { promptSecret } from "./prompt.js";
import { loadConfig, saveConfig, clearConfig, CONFIG_PATH } from "./config.js";
import { detectProvider, resolveModel, providerLabel } from "./provider.js";

const ROAST_RULES_PATH = "./CLAUDE.roast.md";
const DEFAULT_HTML_PATH = "./roast.html";

const program = new Command()
  .name("claude-roast")
  .description("Roasts how badly you use Claude Code, based on your ~/.claude history.")
  .version("0.1.0")
  .option("-d, --days <n>", "only consider the last N days", (v) => Number.parseInt(v, 10))
  .option("-p, --project <substring>", "scope to projects matching substring")
  .option("-s, --severity <level>", "gentle | mean | nuclear", "mean")
  .option("--dry-run", "compute metrics only, no API call")
  .option("--rules", "also write anti-rules to ./CLAUDE.roast.md")
  .option("--html [path]", "also write a shareable HTML report (default ./roast.html)")
  .option("--open", "open the HTML report in your default browser")
  .option("--json", "emit metrics as JSON and exit")
  .option("--model <id>", "AI Gateway model id", "anthropic/claude-opus-4-7")
  .option("--logout", `forget the saved API key (${CONFIG_PATH})`)
  .action(async (raw) => {
    if (raw.logout) {
      await clearConfig();
      console.log(pc.green(`✓ Removed ${CONFIG_PATH}`));
      return;
    }
    const parsed = CliOptsSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(pc.red("✖ Invalid options: " + parsed.error.message));
      process.exit(1);
    }
    try {
      await run(parsed.data);
    } catch (err) {
      console.error(pc.red("✖ " + (err as Error).message));
      process.exit(1);
    }
  });

const SINS_SPINNER_COPY = [
  "Counting the times you said 'no'…",
  "Tallying ultrathinks…",
  "Looking for git reset --hards…",
  "Adding up your apologies to a robot…",
  "Cataloging pasted blobs…",
  "Computing your sins…",
];

const run = async (opts: CliOpts) => {
  if (opts.json) {
    const result = await scan({ days: opts.days, project: opts.project });
    const metrics = await compute(result);
    process.stdout.write(JSON.stringify(metrics, null, 2) + "\n");
    return;
  }

  renderHeader();

  const result = await withSpinner(
    "Reading ~/.claude history…",
    () => scan({ days: opts.days, project: opts.project }),
    (r) =>
      `Found ${pc.bold(String(r.history.length))} prompts and ${pc.bold(String(r.sessionFiles.length))} session transcripts.`,
  );

  if (!result.history.length) {
    console.log(
      pc.yellow(
        "\nNo prompts found. Either you don't use Claude Code, or you cleared your history. Either way, no roast.\n",
      ),
    );
    return;
  }

  const metrics = await withSpinner(
    SINS_SPINNER_COPY,
    () => compute(result),
    () => "Sins computed.",
  );

  const verdict = computeVerdict(metrics);

  renderMetrics(metrics);
  renderVerdict(verdict);

  if (opts.rules) {
    await writeFile(ROAST_RULES_PATH, generateAntiRules(metrics), "utf8");
    console.log("\n" + pc.green(`✓ Anti-rules written to ${ROAST_RULES_PATH}`));
  }

  if (opts.dryRun) {
    if (opts.html !== undefined) {
      await writeHtmlReport(opts.html, { metrics, verdict, roast: null, severity: opts.severity }, opts.open);
    }
    console.log("\n" + pc.dim("--dry-run: skipping the actual roast. Coward.\n"));
    return;
  }

  const { provider, apiKey } = await ensureApiKey();
  const model = resolveModel(provider, opts.model, apiKey);

  const callingSpinner = yoctoSpinner({
    text: `Calling ${providerLabel(provider)}…`,
    color: "red",
  }).start();
  const stream = streamRoast(metrics, { severity: opts.severity, model });

  console.log("\n" + pc.bold(pc.red("─".repeat(60))));
  console.log(pc.bold(pc.red("  THE ROAST")));
  console.log(pc.bold(pc.red("─".repeat(60))) + "\n");

  let fullRoast = "";
  let firstChunk = true;
  for await (const chunk of stream) {
    if (firstChunk) {
      callingSpinner.stop();
      firstChunk = false;
    }
    process.stdout.write(chunk);
    fullRoast += chunk;
  }
  if (firstChunk) callingSpinner.stop();
  console.log("\n\n" + pc.bold(pc.red("─".repeat(60))) + "\n");

  if (!fullRoast.trim()) {
    fullRoast = "(The roaster refused. That's somehow worse.)";
  }

  if (opts.html !== undefined) {
    await writeHtmlReport(opts.html, { metrics, verdict, roast: fullRoast, severity: opts.severity }, opts.open);
  }
};

const writeHtmlReport = async (
  htmlOpt: string | boolean,
  args: {
    metrics: Parameters<typeof renderHtml>[0]["metrics"];
    verdict: Parameters<typeof renderHtml>[0]["verdict"];
    roast: string | null;
    severity: string;
  },
  open: boolean,
) => {
  const htmlPath = typeof htmlOpt === "string" ? htmlOpt : DEFAULT_HTML_PATH;
  const html = renderHtml({ ...args, generatedAt: new Date() });
  await writeFile(htmlPath, html, "utf8");
  console.log("\n" + pc.green(`✓ HTML report written to ${htmlPath}`));

  if (args.roast) {
    const parsed = path.parse(htmlPath);
    const txtPath = path.format({ ...parsed, base: undefined, ext: ".txt" });
    await writeFile(txtPath, args.roast, "utf8");
    console.log(pc.green(`✓ Roast text written to ${txtPath}`));
  }

  if (open) openInBrowser(htmlPath);
};

const openInBrowser = (filePath: string) => {
  const absolute = path.resolve(filePath);
  const platform = process.platform;
  const [cmd, args] =
    platform === "darwin"
      ? ["open", [absolute]]
      : platform === "win32"
        ? ["cmd", ["/c", "start", "", absolute]]
        : ["xdg-open", [absolute]];
  const child = spawn(cmd as string, args as string[], { detached: true, stdio: "ignore" });
  child.unref();
};

const envKey = () => {
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: "openrouter" as const, apiKey: process.env.OPENROUTER_API_KEY };
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return { provider: "gateway" as const, apiKey: process.env.AI_GATEWAY_API_KEY };
  }
  return null;
};

const ensureApiKey = async () => {
  const fromEnv = envKey();
  if (fromEnv) return fromEnv;

  const config = await loadConfig();
  if (config.apiKey) {
    return { provider: config.provider ?? "gateway", apiKey: config.apiKey };
  }

  if (!process.stdin.isTTY) {
    console.log(
      "\n" +
        pc.red("✖ No API key found.") +
        "\n  " +
        pc.dim("Set AI_GATEWAY_API_KEY or OPENROUTER_API_KEY, run --dry-run, or run interactively."),
    );
    process.exit(1);
  }

  console.log(
    "\n" +
      pc.dim("No API key found. Paste a Vercel AI Gateway or OpenRouter key — I'll detect which.") +
      "\n" +
      pc.dim("  Get one:  https://vercel.com/ai-gateway  ·  https://openrouter.ai/keys") +
      "\n" +
      pc.dim(`  Stored at ${CONFIG_PATH} (chmod 0600). Run \`claude-roast --logout\` to remove.`) +
      "\n",
  );

  let key: string;
  try {
    key = (await promptSecret(pc.bold("  key: "))).trim();
  } catch (err) {
    console.log(pc.red("✖ " + (err as Error).message));
    process.exit(1);
  }
  if (!key) {
    console.log(pc.red("✖ No key provided."));
    process.exit(1);
  }

  const provider = detectProvider(key);
  await saveConfig({ apiKey: key, provider });
  console.log(pc.green(`✓ Saved ${providerLabel(provider)} key to ${CONFIG_PATH}`));
  return { provider, apiKey: key };
};

const withSpinner = async <T,>(
  start: string | string[],
  task: () => Promise<T>,
  done: (result: T) => string,
  color: "yellow" | "red" = "yellow",
) => {
  const frames = Array.isArray(start) ? start : [start];
  const spinner = yoctoSpinner({ text: frames[0]!, color }).start();
  let interval: NodeJS.Timeout | undefined;
  if (frames.length > 1) {
    let i = 0;
    interval = setInterval(() => {
      i = (i + 1) % frames.length;
      spinner.text = frames[i]!;
    }, 1500);
  }
  try {
    const result = await task();
    if (interval) clearInterval(interval);
    spinner.success(done(result));
    return result;
  } catch (err) {
    if (interval) clearInterval(interval);
    spinner.error(frames[0]!);
    throw err;
  }
};

program.parseAsync();
