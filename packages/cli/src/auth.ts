import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_GITHUB_CLIENT_ID = "Ov23li6SliiHRpeaqbQL";

export const GITHUB_CLIENT_ID =
  process.env.BREAKGUARD_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || DEFAULT_GITHUB_CLIENT_ID;
export const GITHUB_SCOPE = process.env.BREAKGUARD_GITHUB_SCOPE || "read:user,repo";

const authFile =
  process.env.BREAKGUARD_AUTH_FILE || path.join(os.homedir(), ".breakguard", "github-auth.json");

export interface GitHubUser {
  login: string;
  avatar_url?: string;
  name?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: GitHubUser;
  createdAt: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

export type DevicePollStatus = "authorization_pending" | "slow_down";

export class GitHubAuthError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "GitHubAuthError";
    this.code = options.code;
    this.status = options.status;
  }
}

function authErrorMessage(code?: string, description?: string, status?: number): string {
  if (code === "device_flow_disabled") {
    return "GitHub Device Flow is disabled for this OAuth App. Enable 'Device flow' in the GitHub OAuth App settings and try again.";
  }
  if (code === "access_denied") {
    return "GitHub login was denied. Please authorize BreakGuard and try again.";
  }
  if (code === "expired_token") {
    return "The GitHub device code expired. Start login again.";
  }
  if (description) return description;
  if (code) return `GitHub authentication failed (${code}).`;
  if (status) return `GitHub authentication request failed (HTTP ${status}).`;
  return "GitHub authentication failed.";
}

function parseJson(text: string): Record<string, any> {
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return {};
  }
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;
  return Boolean(
    typeof session.accessToken === "string" &&
      session.accessToken.length > 0 &&
      session.user &&
      typeof session.user.login === "string" &&
      session.user.login.length > 0
  );
}

export function readStoredAuth(): AuthSession | null {
  try {
    if (!fs.existsSync(authFile)) return null;
    const session = JSON.parse(fs.readFileSync(authFile, "utf8"));
    return isValidSession(session) ? session : null;
  } catch {
    return null;
  }
}

export function saveStoredAuth(session: AuthSession): void {
  const directory = path.dirname(authFile);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryFile = `${authFile}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
    try {
      fs.chmodSync(temporaryFile, 0o600);
    } catch {
      // Windows does not expose POSIX mode bits.
    }
    fs.renameSync(temporaryFile, authFile);
  } catch (error) {
    try {
      fs.rmSync(temporaryFile, { force: true });
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
  try {
    fs.chmodSync(authFile, 0o600);
  } catch {
    // Windows does not expose POSIX mode bits.
  }
}

export function clearStoredAuth(): void {
  try {
    fs.rmSync(authFile, { force: true });
  } catch {
    // Logging out should be idempotent.
  }
}

export function getStoredAuthPath(): string {
  return authFile;
}

async function readGitHubJson(response: Response): Promise<Record<string, any>> {
  const payload = parseJson(await response.text());
  if (!response.ok) {
    throw new GitHubAuthError(
      authErrorMessage(payload.error, payload.error_description, response.status),
      { code: payload.error, status: response.status }
    );
  }
  return payload;
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const body = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: GITHUB_SCOPE });
  let response: Response;
  try {
    response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "BreakGuard/1.2.0",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error: any) {
    throw new GitHubAuthError(`Could not reach GitHub: ${error?.message || "network error"}`);
  }

  const payload = await readGitHubJson(response);
  if (payload.error) {
    throw new GitHubAuthError(
      authErrorMessage(payload.error, payload.error_description, response.status),
      { code: payload.error, status: response.status }
    );
  }
  if (
    typeof payload.device_code !== "string" ||
    typeof payload.user_code !== "string" ||
    typeof payload.verification_uri !== "string" ||
    typeof payload.expires_in !== "number"
  ) {
    throw new GitHubAuthError("GitHub returned an incomplete device-login response.");
  }
  return payload as DeviceCodeResponse;
}

async function exchangeDeviceCode(deviceCode: string): Promise<Record<string, any>> {
  const body = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
  let response: Response;
  try {
    response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "BreakGuard/1.2.0",
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error: any) {
    throw new GitHubAuthError(`Could not reach GitHub: ${error?.message || "network error"}`);
  }
  const payload = parseJson(await response.text());
  if (!response.ok && !payload.error) {
    throw new GitHubAuthError(authErrorMessage(undefined, undefined, response.status), {
      status: response.status,
    });
  }
  return payload;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  let response: Response;
  try {
    response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "BreakGuard/1.2.0",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error: any) {
    throw new GitHubAuthError(`Could not verify the GitHub token: ${error?.message || "network error"}`);
  }
  const payload = await readGitHubJson(response);
  if (typeof payload.login !== "string" || payload.login.length === 0) {
    throw new GitHubAuthError("GitHub returned an invalid user profile.");
  }
  return {
    login: payload.login,
    avatar_url: typeof payload.avatar_url === "string" ? payload.avatar_url : undefined,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new GitHubAuthError("GitHub login was cancelled."));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(new GitHubAuthError("GitHub login was cancelled."));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function completeDeviceFlow(
  device: DeviceCodeResponse,
  options: { signal?: AbortSignal; onStatus?: (status: DevicePollStatus) => void } = {}
): Promise<AuthSession> {
  const deadline = Date.now() + device.expires_in * 1000;
  let intervalSeconds = Math.max(1, device.interval || 5);
  while (Date.now() < deadline) {
    await delay(intervalSeconds * 1000, options.signal);
    const payload = await exchangeDeviceCode(device.device_code);
    if (typeof payload.access_token === "string" && payload.access_token.length > 0) {
      const user = await fetchGitHubUser(payload.access_token);
      const session: AuthSession = {
        accessToken: payload.access_token,
        user,
        createdAt: new Date().toISOString(),
      };
      saveStoredAuth(session);
      return session;
    }
    const errorCode = typeof payload.error === "string" ? payload.error : undefined;
    if (errorCode === "authorization_pending") {
      options.onStatus?.("authorization_pending");
      continue;
    }
    if (errorCode === "slow_down") {
      intervalSeconds += 5;
      options.onStatus?.("slow_down");
      continue;
    }
    if (errorCode === "expired_token" || errorCode === "access_denied") {
      throw new GitHubAuthError(authErrorMessage(errorCode, payload.error_description), {
        code: errorCode,
      });
    }
    throw new GitHubAuthError(authErrorMessage(errorCode, payload.error_description), {
      code: errorCode,
    });
  }
  throw new GitHubAuthError("The GitHub device code expired. Start login again.", {
    code: "expired_token",
  });
}

export function openExternalUrl(url: string): void {
  try {
    if (process.platform === "win32") {
      const child = spawn("cmd.exe", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
    } else if (process.platform === "darwin") {
      const child = spawn("open", [url], { detached: true, stdio: "ignore" });
      child.unref();
    } else {
      const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
      child.unref();
    }
  } catch {
    // The UI/CLI always prints a clickable URL as a fallback.
  }
}
