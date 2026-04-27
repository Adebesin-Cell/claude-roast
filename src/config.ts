import { readFile, writeFile, mkdir, unlink, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

const ConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  provider: z.enum(["gateway", "openrouter"]).optional(),
});
export type Config = z.infer<typeof ConfigSchema>;

export const CONFIG_PATH = join(homedir(), ".claude-roast", "config.json");

export const loadConfig = async () => {
  if (!existsSync(CONFIG_PATH)) return {} satisfies Config;
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = ConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : ({} satisfies Config);
  } catch {
    return {} satisfies Config;
  }
};

export const saveConfig = async (config: Config) => {
  await mkdir(dirname(CONFIG_PATH), { recursive: true, mode: 0o700 });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  await chmod(CONFIG_PATH, 0o600);
};

export const clearConfig = async () => {
  if (existsSync(CONFIG_PATH)) await unlink(CONFIG_PATH);
};
