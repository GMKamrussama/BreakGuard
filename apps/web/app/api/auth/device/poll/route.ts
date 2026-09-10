import { NextResponse } from "next/server";
import { GITHUB_CLIENT_ID, authErrorMessage, githubJson, setWebAuth } from "@/lib/github-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceCode = typeof body?.device_code === "string" ? body.device_code : "";
    if (!deviceCode) return NextResponse.json({ error: "Missing device_code." }, { status: 400 });

    const form = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    const { response, payload } = await githubJson("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });

    if (typeof payload.access_token === "string" && payload.access_token.length > 0) {
      const profile = await githubJson("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${payload.access_token}` },
      });
      if (!profile.response.ok || typeof profile.payload.login !== "string") {
        return NextResponse.json({ error: "GitHub returned an invalid user profile." }, { status: 502 });
      }

      await setWebAuth(payload.access_token, {
        login: profile.payload.login,
        avatar_url: profile.payload.avatar_url,
        name: profile.payload.name,
      });
      return NextResponse.json({ authenticated: true, user: profile.payload });
    }

    if (payload.error === "authorization_pending" || payload.error === "slow_down") {
      return NextResponse.json({
        authenticated: false,
        pending: true,
        error: payload.error,
        interval: payload.error === "slow_down" ? 10 : undefined,
      });
    }

    return NextResponse.json(
      { error: authErrorMessage(payload.error, payload.error_description, response.status) },
      { status: payload.error === "expired_token" || payload.error === "access_denied" ? 400 : 502 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "GitHub Device Flow polling failed." },
      { status: 502 }
    );
  }
}
