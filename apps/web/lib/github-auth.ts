import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cookies } from "next/headers";

export const GITHUB_CLIENT_ID =
  process.env.BREAKGUARD_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "Ov23li6SliiHRpeaqbQL";
export const GITHUB_SCOPE = process.env.BREAKGUARD_GITHUB_SCOPE || "read:user";
export const GITHUB_SESSION_COOKIE = "breakguard_github_session";
export const GITHUB_USER_COOKIE = "breakguard_github_user";

export type GitHubUser = {
  login: string;
  avatar_url?: string;
  name?: string | null;
};

function parseJson(text: string): Record<string, any> {
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return {};
  }
}

export function authErrorMessage(code?: string, description?: string, status?: number): string {
  if (code === "device_flow_disabled") {
    return "GitHub Device Flow is disabled for this OAuth App. Enable Device flow in GitHub OAuth App settings.";
  }
  if (code === "access_denied") return "GitHub login was denied. Please authorize BreakGuard and try again.";
  if (code === "expired_token") return "The GitHub device code expired. Start login again.";
  if (description) return description;
  if (code) return `GitHub authentication failed (${code}).`;
  if (status) return `GitHub authentication request failed (HTTP ${status}).`;
  return "GitHub authentication failed.";
}

export async function githubJson(
  url: string,
  init: RequestInit = {}
): Promise<{ response: Response; payload: Record<string, any> }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "BreakGuard/1.2.0",
      ...(init.headers || {}),
    },
    signal: init.signal || AbortSignal.timeout(15_000),
  });
  return { response, payload: parseJson(await response.text()) };
}

function getLocalAuthFilePath(): string {
  return process.env.BREAKGUARD_AUTH_FILE || path.join(os.homedir(), ".breakguard", "github-auth.json");
}

function readLocalAuthFile(): { token: string; user: GitHubUser } | null {
  try {
    const file = getLocalAuthFilePath();
    if (!fs.existsSync(/*turbopackIgnore: true*/ file)) return null;
    const data = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8"));
    if (data && typeof data.accessToken === "string" && data.user && typeof data.user.login === "string") {
      return { token: data.accessToken, user: data.user };
    }
  } catch {}
  return null;
}

function saveLocalAuthFile(token: string, user: GitHubUser): void {
  try {
    const file = getLocalAuthFilePath();
    const dir = path.dirname(file);
    fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    fs.writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify({ accessToken: token, user, createdAt: new Date().toISOString() }, null, 2), "utf8");
  } catch {}
}

function clearLocalAuthFile(): void {
  try {
    const file = getLocalAuthFilePath();
    if (fs.existsSync(/*turbopackIgnore: true*/ file)) fs.unlinkSync(/*turbopackIgnore: true*/ file);
  } catch {}
}

export async function readWebAuth(): Promise<{ token: string | null; user: GitHubUser | null }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(GITHUB_SESSION_COOKIE)?.value || null;
    const rawUser = cookieStore.get(GITHUB_USER_COOKIE)?.value;
    let user: GitHubUser | null = null;
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as GitHubUser;
        if (typeof parsed.login === "string" && parsed.login.length > 0) user = parsed;
      } catch {
        user = null;
      }
    }
    if (token && user) {
      return { token, user };
    }
  } catch {}

  // Fallback to local machine session file if running in local Node environment
  const local = readLocalAuthFile();
  if (local) {
    return { token: local.token, user: local.user };
  }

  return { token: null, user: null };
}

export async function setWebAuth(token: string, user: GitHubUser): Promise<void> {
  saveLocalAuthFile(token, user);
  try {
    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";
    const options = {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    };
    cookieStore.set(GITHUB_SESSION_COOKIE, token, options);
    cookieStore.set(GITHUB_USER_COOKIE, JSON.stringify(user), options);
  } catch {}
}

export async function clearWebAuth(): Promise<void> {
  clearLocalAuthFile();
  try {
    const cookieStore = await cookies();
    cookieStore.delete(GITHUB_SESSION_COOKIE);
    cookieStore.delete(GITHUB_USER_COOKIE);
  } catch {}
}

