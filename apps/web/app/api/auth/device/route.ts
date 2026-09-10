import { NextResponse } from "next/server";
import {
  GITHUB_CLIENT_ID,
  GITHUB_SCOPE,
  authErrorMessage,
  githubJson,
} from "@/lib/github-auth";

export async function POST() {
  try {
    const body = new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: GITHUB_SCOPE });
    const { response, payload } = await githubJson("https://github.com/login/device/code", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok || payload.error) {
      return NextResponse.json(
        { error: authErrorMessage(payload.error, payload.error_description, response.status) },
        { status: response.ok ? 400 : 502 }
      );
    }

    return NextResponse.json({
      device_code: payload.device_code,
      user_code: payload.user_code,
      verification_uri: payload.verification_uri,
      verification_uri_complete: payload.verification_uri_complete,
      expires_in: payload.expires_in,
      interval: payload.interval,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not start GitHub Device Flow." },
      { status: 502 }
    );
  }
}
