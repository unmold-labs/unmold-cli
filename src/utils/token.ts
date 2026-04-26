import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

export function readStoredToken(): string {
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

export function saveToken(token: string): void {
  const configPath = getConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });

  const payload: TokenStore = {
    token,
    savedAt: new Date().toISOString(),
  };

  writeFileSync(configPath, JSON.stringify(payload, null, 2), "utf8");
}
