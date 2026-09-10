import { NextResponse } from "next/server";
import { clearWebAuth } from "@/lib/github-auth";

export async function POST() {
  await clearWebAuth();
  return NextResponse.json({ success: true });
}
