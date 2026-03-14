import { existsSync, readFileSync } from "node:fs";
import { access, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

interface TokenStore {
  token: string;
  savedAt?: string;
}

export function getConfigPath(): string {
  return (
    process.env.UNMOLD_CONFIG_PATH || join(homedir(), ".unmold", "config.json")
  );
}

export function readStoredTokenSync(): string {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return "";
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as TokenStore;
    if (parsed && typeof parsed.token === "string") {
      return parsed.token;
    }
  } catch (_err) {
    // ignore malformed token files
  }

  return "";
}

export async function readStoredToken(): Promise<string> {
  const configPath = getConfigPath();

  try {
    await access(configPath);
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as TokenStore;
    if (parsed && typeof parsed.token === "string") {
      return parsed.token;
    }
  } catch (_err) {
    // ignore missing or malformed token files
  }

  return "";
}

export async function saveToken(token: string): Promise<void> {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });

  const payload: TokenStore = {
    token,
    savedAt: new Date().toISOString(),
  };

  await writeFile(configPath, JSON.stringify(payload, null, 2), "utf8");
}

export async function clearStoredToken(): Promise<boolean> {
  const configPath = getConfigPath();
  try {
    await access(configPath);
  } catch (_err) {
    return false;
  }

  await rm(configPath, { force: true });
  return true;
}
