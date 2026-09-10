import { NextResponse } from "next/server";
import { clearWebAuth, readWebAuth } from "@/lib/github-auth";

export async function GET() {
  const auth = await readWebAuth();
  return NextResponse.json(
    { authenticated: Boolean(auth.token && auth.user), user: auth.user },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE() {
  await clearWebAuth();
  return NextResponse.json({ success: true });
}
