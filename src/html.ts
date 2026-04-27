import type { Metrics } from "./schemas.js";
import type { Verdict } from "./verdict.js";

type RenderInput = {
  metrics: Metrics;
  roast: string | null;
  severity: string;
  generatedAt: Date;
  verdict: Verdict | null;
};

export const renderHtml = ({ metrics, roast, severity, generatedAt, verdict }: RenderInput) => {
  const m = metrics;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>claude-roast — your sins, quantified</title>
<style>${STYLE}</style>
</head>
<body>
<main>
  <header class="hero">
    <div class="brand">claude-<span class="accent">roast</span></div>
    <div class="meta">
      <span class="badge sev-${severity}">${severity.toUpperCase()}</span>
      <span class="dim">${generatedAt.toLocaleString()}</span>
    </div>
    <h1>How badly are you using Claude Code?</h1>
    <p class="lede">${m.totals.prompts.toLocaleString()} prompts · ${m.totals.sessions} sessions · ${m.totals.projects} projects · ${m.totals.daysActive} active days · longest streak ${m.timePatterns.longestStreakDays}</p>
  </header>

  ${verdict ? verdictSection(verdict) : ""}

  ${roast ? roastSection(roast) : ""}

  <section class="grid">
    ${statCard("PROMPT HABITS", [
      ["avg length", `${m.promptHabits.avgLength} chars`],
      ["median length", `${m.promptHabits.medianLength} chars`],
      ["longest", `${m.promptHabits.longestLength} chars`],
      ["one-word prompts", m.promptHabits.oneWordPrompts],
      ["pasted blobs", m.promptHabits.pastedBlobCount],
    ])}
    ${statCard("ATTITUDE", [
      ["corrections", m.attitude.corrections],
      ["lazy 'fix it'", m.attitude.fixItLazy],
      ["pleadings", m.attitude.pleadings],
      ["profanity at LLM", m.attitude.profanity],
      ["all-caps rants", m.attitude.allCapsRants],
      ["apologies to AI", m.signature.apologies],
    ])}
    ${statCard("OVERPROMPTING", [
      ["ultrathinks", m.overprompting.ultrathinks],
      ["IMPORTANT shouts", m.overprompting.importantShouts],
      ["'very very' pile-ons", m.overprompting.veryVeryCount],
    ])}
    ${statCard("DANGER ZONE", [
      ["--no-verify", m.danger.noVerify],
      ["git push --force", m.danger.forcePush],
      ["git reset --hard", m.danger.gitResetHard],
      ["rm -rf", m.danger.rmRf],
    ], { variant: "danger" })}
  </section>

  <section class="card">
    <h2>When you prompt</h2>
    <p class="dim">Late-night (12am–5am): ${m.timePatterns.lateNight} · Weekend: ${m.timePatterns.weekend}</p>
    ${histogramSvg(m.timePatterns.hourHistogram)}
  </section>

  <section class="two-col">
    ${listCard("TOP PROJECTS", m.topProjects.map((p) => ({
      label: p.name,
      value: `${p.prompts} prompts · ${p.sessions} sessions`,
    })))}
    ${listCard("SLASH COMMANDS", m.slashCommands.slice(0, 10).map((s) => ({
      label: `/${s.name}`,
      value: String(s.count),
    })))}
  </section>

  <section class="card signature">
    <div>
      <span class="dim">Favorite word</span>
      <strong>${escapeHtml(m.signature.favoriteWord ?? "—")}</strong>
    </div>
    <div>
      <span class="dim">Favorite slash</span>
      <strong>/${escapeHtml(m.signature.favoriteSlashCommand ?? "—")}</strong>
    </div>
    <div>
      <span class="dim">Tool failures observed</span>
      <strong>${m.toolPain.toolFailures}</strong>
    </div>
    <div>
      <span class="dim">Permission denials</span>
      <strong>${m.toolPain.permissionDenials}</strong>
    </div>
  </section>

  <footer>
    <span class="dim">Generated locally by</span>
    <a href="https://www.npmjs.com/package/claude-roast">claude-roast</a>
    <span class="dim">— no data left your machine except aggregated counters.</span>
  </footer>
</main>
</body>
</html>`;
};

const verdictSection = (v: Verdict) => `
  <section class="verdict tier-${v.tier.color}">
    <div class="verdict-top">
      <div class="verdict-score">
        <span class="verdict-label">ROAST SCORE</span>
        <span class="verdict-number">${v.score}</span>
      </div>
      <div class="verdict-tier">
        <span class="tier-badge">${escapeHtml(v.tier.label)}</span>
      </div>
    </div>
    ${v.headlineSin ? `
      <div class="verdict-headline">
        <span class="verdict-label">HEADLINE SIN</span>
        <p>${escapeHtml(v.headlineSin.jab)}</p>
      </div>
    ` : ""}
    ${v.rapSheet.length ? `
      <div class="verdict-rap">
        <span class="verdict-label">RAP SHEET</span>
        <ul>
          ${v.rapSheet.map((r) => `<li><span>${escapeHtml(r.label)}</span><span class="rap-count">${r.count}</span></li>`).join("")}
        </ul>
      </div>
    ` : ""}
  </section>`;

const roastSection = (roast: string) => `
  <section class="roast">
    <h2>THE ROAST</h2>
    <div class="roast-body">${escapeHtml(roast).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>").replace(/^/, "<p>").concat("</p>")}</div>
  </section>`;

const statCard = (
  title: string,
  rows: Array<[string, string | number]>,
  opts: { variant?: "default" | "danger" } = {},
) => `
  <article class="card ${opts.variant === "danger" ? "danger" : ""}">
    <h3>${title}</h3>
    <dl>
      ${rows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join("")}
    </dl>
  </article>`;

const listCard = (
  title: string,
  rows: Array<{ label: string; value: string }>,
) => `
  <article class="card">
    <h3>${title}</h3>
    ${rows.length
      ? `<ul class="list">${rows.map((r) => `<li><span>${escapeHtml(r.label)}</span><span class="dim">${escapeHtml(r.value)}</span></li>`).join("")}</ul>`
      : `<p class="dim">(none)</p>`}
  </article>`;

const histogramSvg = (values: number[]) => {
  const W = 720;
  const H = 140;
  const PAD = 24;
  const max = Math.max(...values, 1);
  const barWidth = (W - PAD * 2) / values.length;
  const bars = values
    .map((v, i) => {
      const h = Math.max(2, ((v / max) * (H - PAD * 2)));
      const x = PAD + i * barWidth;
      const y = H - PAD - h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barWidth - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2" />`;
    })
    .join("");
  const labels = [0, 6, 12, 18, 23]
    .map((h) => {
      const x = PAD + h * barWidth + barWidth / 2;
      return `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle">${h}</text>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="hist" role="img" aria-label="Hour histogram">
    ${bars}${labels}
  </svg>`;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const STYLE = `
  :root {
    --bg: #0b0b0c;
    --card: #131316;
    --border: #1f1f24;
    --fg: #f4f4f5;
    --dim: #8b8b93;
    --accent: #ff3b3b;
    --accent-soft: #ff3b3b22;
    --danger: #ff3b3b;
    --warn: #f5a524;
    --ok: #22c55e;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg); }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, sans-serif; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  main { max-width: 960px; margin: 0 auto; padding: 48px 24px 96px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  .hero { padding: 24px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .brand { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--dim); }
  .accent { color: var(--accent); }
  .hero h1 { font-size: clamp(28px, 5vw, 44px); margin: 16px 0 8px; letter-spacing: -0.02em; }
  .lede { color: var(--dim); margin: 0; font-variant-numeric: tabular-nums; }
  .meta { display: flex; gap: 12px; align-items: center; margin-top: 8px; font-size: 13px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 11px; letter-spacing: 0.05em; background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent); }
  .badge.sev-gentle { background: #22c55e22; color: var(--ok); border-color: var(--ok); }
  .badge.sev-mean { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }
  .badge.sev-nuclear { background: #ff3b3b; color: #fff; border-color: #ff3b3b; }
  .dim { color: var(--dim); }

  .roast { background: linear-gradient(180deg, #1a0a0a, #0b0b0c 60%); border: 1px solid var(--accent); border-radius: 12px; padding: 28px; margin-bottom: 32px; }
  .roast h2 { margin: 0 0 16px; font-size: 14px; letter-spacing: 0.2em; color: var(--accent); }
  .roast-body { font-size: 17px; line-height: 1.7; }
  .roast-body p { margin: 0 0 14px; }
  .roast-body p:last-child { margin-bottom: 0; font-weight: 600; border-top: 1px solid var(--border); padding-top: 14px; margin-top: 14px; color: var(--accent); }

  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card.danger { border-color: var(--accent); }
  .card h2, .card h3 { margin: 0 0 14px; font-size: 12px; letter-spacing: 0.18em; color: var(--dim); font-weight: 600; }
  .card.danger h3 { color: var(--accent); }
  dl { margin: 0; display: grid; gap: 8px; }
  dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  dt { color: var(--dim); font-size: 13px; }
  dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; }

  .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; font-size: 14px; }
  .list li { display: flex; justify-content: space-between; gap: 12px; }
  .list li span:first-child { font-family: ui-monospace, monospace; }

  .signature { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 24px; margin-bottom: 24px; }
  .signature > div { display: flex; flex-direction: column; gap: 4px; }
  .signature strong { font-size: 18px; }

  .hist { width: 100%; height: auto; margin-top: 12px; display: block; }
  .hist rect { fill: var(--accent); opacity: 0.85; }
  .hist text { fill: var(--dim); font-family: ui-monospace, monospace; font-size: 10px; }

  footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); font-size: 13px; }

  .verdict { background: linear-gradient(180deg, #1a0a0a, #0b0b0c 70%); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 32px; display: grid; gap: 24px; }
  .verdict.tier-green { border-color: var(--ok); }
  .verdict.tier-yellow { border-color: var(--warn); }
  .verdict.tier-red { border-color: var(--accent); }
  .verdict-top { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
  .verdict-score { display: flex; flex-direction: column; gap: 4px; }
  .verdict-label { font-size: 11px; letter-spacing: 0.2em; color: var(--dim); font-weight: 600; }
  .verdict-number { font-size: clamp(64px, 12vw, 120px); font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.04em; }
  .verdict.tier-green .verdict-number { color: var(--ok); }
  .verdict.tier-yellow .verdict-number { color: var(--warn); }
  .verdict.tier-red .verdict-number { color: var(--accent); }
  .tier-badge { display: inline-block; padding: 8px 16px; border-radius: 999px; font-family: ui-monospace, monospace; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid currentColor; }
  .verdict.tier-green .tier-badge { color: var(--ok); background: #22c55e1a; }
  .verdict.tier-yellow .tier-badge { color: var(--warn); background: #f5a5241a; }
  .verdict.tier-red .tier-badge { color: var(--accent); background: var(--accent-soft); }
  .verdict-headline { border-left: 3px solid var(--accent); padding: 8px 16px; display: flex; flex-direction: column; gap: 6px; }
  .verdict-headline p { margin: 0; font-size: 18px; line-height: 1.5; font-weight: 500; }
  .verdict-rap { display: flex; flex-direction: column; gap: 10px; }
  .verdict-rap ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
  .verdict-rap li { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 8px 12px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; font-size: 14px; }
  .verdict-rap li::before { content: "·"; color: var(--accent); margin-right: 4px; }
  .verdict-rap .rap-count { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 16px; }
`;
