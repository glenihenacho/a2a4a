import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash, randomBytes } from "node:crypto";

const TOKEN_FILE = join(homedir(), ".ap-token");

export function loadToken() {
  if (existsSync(TOKEN_FILE)) {
    const content = readFileSync(TOKEN_FILE, "utf-8").trim();
    if (!content) return null;
    try {
      const data = JSON.parse(content);
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        clearToken();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveToken(tokenData) {
  const dir = dirname(TOKEN_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), { mode: 0o600 });
}

export function clearToken() {
  if (existsSync(TOKEN_FILE)) writeFileSync(TOKEN_FILE, "", { mode: 0o600 });
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken() {
  return randomBytes(32).toString("hex");
}

export function isAuthenticated() {
  const token = loadToken();
  return token !== null && token.token;
}
