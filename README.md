# claude-roast

> The opposite of Claude Code Insights. Reads your `~/.claude` history and tells you, in detail, how badly you use Claude Code.

```bash
npx claude-roast
```

No install. Reads only your local history. Sends a stats summary (no prompt content) to an LLM via the [Vercel AI Gateway](https://vercel.com/ai-gateway) to write the actual roast.

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

# Just stats, no API call (no key needed)
npx claude-roast --dry-run

# Generate anti-CLAUDE.md to ./CLAUDE.roast.md
npx claude-roast --rules

# Generate a shareable HTML report (default ./roast.html)
npx claude-roast --html
npx claude-roast --html ./out/roast.html

# Machine-readable
npx claude-roast --json

# Pick the model (any AI Gateway provider/model string)
npx claude-roast --model openai/gpt-5
npx claude-roast --model google/gemini-2.5-pro
```

## API key

First run, you'll be prompted to paste a key from either provider — we auto-detect which:

- **[Vercel AI Gateway](https://vercel.com/ai-gateway)** — one key, every provider, free tier
- **[OpenRouter](https://openrouter.ai/keys)** — keys start with `sk-or-`, free models available

The key is saved (chmod 0600) to `~/.claude-roast/config.json` and reused every run after that. No shell env var setup, no re-pasting.

```
$ npx claude-roast
…
No API key found. Paste a Vercel AI Gateway or OpenRouter key — I'll detect which.
  Get one:  https://vercel.com/ai-gateway  ·  https://openrouter.ai/keys
  Stored at ~/.claude-roast/config.json (chmod 0600).

  key: ••••••••••••••
✓ Saved OpenRouter key to ~/.claude-roast/config.json
```

To swap keys or remove:

```bash
npx claude-roast --logout
```

Env vars still take precedence (`AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY`).

`--dry-run`, `--json`, `--rules`, and `--html` (without a roast) work without any key.

### Picking a model

Default is `anthropic/claude-opus-4-7`. Override per provider:

```bash
# AI Gateway
npx claude-roast --model openai/gpt-5
npx claude-roast --model google/gemini-2.5-pro

# OpenRouter
npx claude-roast --model anthropic/claude-3.5-sonnet
npx claude-roast --model meta-llama/llama-3.3-70b-instruct:free   # free tier
```

## HTML report

`--html` writes a self-contained, dark-themed page with the roast, a stats grid, an SVG hour histogram, top projects, and your favorite slash command. Single file, no external CSS or JS — open it, share it, screenshot it.

## Privacy

- Everything runs locally.
- The roast call sends **aggregated counters and short samples** (5 one-word prompts, 5 corrections, etc.) — never your full prompt content or code.
- `--dry-run`, `--json`, `--rules`, and `--html` (without a roast) never hit the network at all.

## How it's built

- **TypeScript**, ESM, Node ≥ 20
- **[Vercel AI SDK](https://ai-sdk.dev/)** v6 — model-agnostic via the AI Gateway
- **[Zod](https://zod.dev/)** — single source of truth for schemas (history entries, session messages, CLI options, metrics)
- **[picocolors](https://github.com/alexeyraspopov/picocolors)** + **[yocto-spinner](https://github.com/sindresorhus/yocto-spinner)** — modern, tiny terminal output ([e18e](https://e18e.dev/))
- **[commander](https://github.com/tj/commander.js)** — CLI parsing
- **[tsup](https://tsup.egoist.dev/)** — single-file ESM bundle

The metrics layer is split into per-category extractors (`collectPromptHabits`, `collectAttitude`, `collectDanger`, …) so it's easy to add new sins. PRs welcome.

## Inspired by

[@aidenybai's Claude Doctor](https://x.com/aidenybai/status/2044445649136189627) — same shape (read `~/.claude`, point out the patterns), opposite tone (roast, not therapy).

## License

[MIT](./LICENSE)
