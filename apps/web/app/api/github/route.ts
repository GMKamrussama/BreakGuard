import { NextResponse } from "next/server";
import { analyzeGitHubRepo } from "@breakguard/core";
import { readWebAuth } from "@/lib/github-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const repoUrl = body?.repoUrl;
    const storedAuth = await readWebAuth();
    if (!storedAuth.token || !storedAuth.user) {
      return NextResponse.json({ error: "GitHub login required. Please sign in first." }, { status: 401 });
    }
    const token = storedAuth.token;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        { error: "Missing required 'repoUrl' parameter in request body." },
        { status: 400 }
      );
    }

    const report = await analyzeGitHubRepo(repoUrl, { token });
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to analyze GitHub repository." },
      { status: 500 }
    );
  }
}
