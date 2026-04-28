import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// We use a simple timestamp that updates on every deploy
// In a real Vercel environment, you could use process.env.VERCEL_GIT_COMMIT_SHA
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || new Date().toISOString();

export async function GET() {
  return NextResponse.json({ version: BUILD_ID });
}
