# claude-roast

> The opposite of Claude Code Insights. Reads your `~/.claude` history and tells you, in detail, how badly you use Claude Code.

```bash
npx claude-roast
```

No install. No API key. Reads only your local history, then shells out to your existing `claude` CLI (`claude -p`) to write the actual roast — using whatever auth you've already set up for Claude Code. Only a stats summary is sent (no prompt content).

---

## What it measures

Mined from `~/.claude/history.jsonl` and session transcripts:

| Category | What it catches |
| --- | --- |
| **Prompt habits** | average length, one-word prompts, pasted blob count |
| **Attitude** | corrections (`no`, `wrong`, `actually`), lazy `fix it` prompts, profanity, all-caps rants, apologies (yes, to the AI) |
| **Overprompting** | `ultrathink` / `think harder` instances, `IMPORTANT` shouts, `very very` pile-ons |
| **Danger zone** | `--no-verify`, `git reset --hard`, `git push --force`, `rm -rf` |
| **Time patterns** | late-night sessions, weekend prompts, hourly histogram, longest streak |
| **Slash commands** | what you actually reach for |
| **Top projects** | where the prompts go |
| **Tool pain** | tool failures, permission denials |

Then it ships the numbers (not the prompts) to an LLM and asks for a roast.

## Usage

```bash
# Default: mean severity, all history
npx claude-roast

# Severity dial
npx claude-roast --severity gentle
npx claude-roast --severity mean      # default
npx claude-roast --severity nuclear

# Scope
npx claude-roast --days 30
npx claude-roast --project iqai-prediction

# Just stats, no model call
npx claude-roast --dry-run

# Generate anti-CLAUDE.md to ./CLAUDE.roast.md
npx claude-roast --rules

# Generate a shareable HTML report (default ./roast.html)
npx claude-roast --html
npx claude-roast --html ./out/roast.html

# Machine-readable
npx claude-roast --json

# Override the model passed to `claude -p`
npx claude-roast --model claude-sonnet-4-6
```

## Requirements

You need the [`claude` CLI](https://docs.claude.com/en/docs/claude-code) on your `PATH`. That's it — no API keys, no config file. `claude-roast` shells out to `claude -p` and uses whatever auth you've already set up for Claude Code.

`--dry-run`, `--json`, `--rules`, and `--html` (without a roast) never spawn `claude` and work without it installed.

## HTML report

`--html` writes a self-contained, dark-themed page with the roast, a stats grid, an SVG hour histogram, top projects, and your favorite slash command. Single file, no external CSS or JS — open it, share it, screenshot it.

## Privacy

- Everything runs locally.
- The roast call sends **aggregated counters and short samples** (5 one-word prompts, 5 corrections, etc.) — never your full prompt content or code.
- `--dry-run`, `--json`, `--rules`, and `--html` (without a roast) never hit the network at all.

## How it's built

- **TypeScript**, ESM, Node ≥ 20
- **`claude -p`** — the roast call shells out to your local Claude Code CLI; no API keys, no SDK
- **[Zod](https://zod.dev/)** — single source of truth for schemas (history entries, session messages, CLI options, metrics)
- **[picocolors](https://github.com/alexeyraspopov/picocolors)** + **[yocto-spinner](https://github.com/sindresorhus/yocto-spinner)** — modern, tiny terminal output ([e18e](https://e18e.dev/))
- **[commander](https://github.com/tj/commander.js)** — CLI parsing
- **[tsup](https://tsup.egoist.dev/)** — single-file ESM bundle

The metrics layer is split into per-category extractors (`collectPromptHabits`, `collectAttitude`, `collectDanger`, …) so it's easy to add new sins. PRs welcome.

## Inspired by

[@aidenybai's Claude Doctor](https://x.com/aidenybai/status/2044445649136189627) — same shape (read `~/.claude`, point out the patterns), opposite tone (roast, not therapy).

## License

[MIT](./LICENSE)
