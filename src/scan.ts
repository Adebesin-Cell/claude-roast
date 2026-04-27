import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  HistoryEntrySchema,
  SessionMessageSchema,
  type HistoryEntry,
  type SessionMessage,
} from "./schemas.js";

export type ScanOpts = {
  days?: number;
  project?: string;
};

const CLAUDE_DIR = join(homedir(), ".claude");
const DAY_MS = 24 * 60 * 60 * 1000;

export const scan = async (opts: ScanOpts = {}) => {
  if (!existsSync(CLAUDE_DIR)) {
    throw new Error(
      `No ~/.claude directory at ${CLAUDE_DIR}. Are you sure you use Claude Code?`,
    );
  }

  const cutoff = opts.days ? Date.now() - opts.days * DAY_MS : 0;
  const [history, sessionFiles] = await Promise.all([
    readHistory(cutoff, opts.project),
    findSessionFiles(opts.project, cutoff),
  ]);

  return { history, sessionFiles, claudeDir: CLAUDE_DIR };
};

export type ScanResult = Awaited<ReturnType<typeof scan>>;

const readHistory = async (cutoff: number, projectFilter: string | undefined) => {
  const path = join(CLAUDE_DIR, "history.jsonl");
  if (!existsSync(path)) return [] as HistoryEntry[];

  const raw = await readFile(path, "utf8");
  const entries: HistoryEntry[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const parsed = HistoryEntrySchema.safeParse(safeJson(line));
    if (!parsed.success) continue;
    const entry = parsed.data;
    if (cutoff && entry.timestamp < cutoff) continue;
    if (projectFilter && !entry.project?.includes(projectFilter)) continue;
    entries.push(entry);
  }

  return entries;
};

const findSessionFiles = async (
  projectFilter: string | undefined,
  cutoff: number,
) => {
  const projectsDir = join(CLAUDE_DIR, "projects");
  if (!existsSync(projectsDir)) return [];

  const projectDirs = await readdir(projectsDir);
  const out: string[] = [];

  for (const proj of projectDirs) {
    if (projectFilter && !proj.replaceAll("-", "/").includes(projectFilter)) {
      continue;
    }
    const dir = join(projectsDir, proj);
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith(".jsonl")) continue;
      const full = join(dir, f);
      if (cutoff && !(await isRecent(full, cutoff))) continue;
      out.push(full);
    }
  }

  return out;
};

const isRecent = async (path: string, cutoff: number) => {
  try {
    const s = await stat(path);
    return s.mtimeMs >= cutoff;
  } catch {
    return false;
  }
};

export async function* iterSessionMessages(
  files: string[],
): AsyncGenerator<SessionMessage> {
  for (const file of files) {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const parsed = SessionMessageSchema.safeParse(safeJson(line));
      if (parsed.success) yield parsed.data;
    }
  }
}

const safeJson = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};
