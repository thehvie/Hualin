import { NextRequest, NextResponse } from "next/server";
import { runReviewRequests } from "@/lib/review-requests";

// Run every 15 minutes from the server's cron (see deploy/install-cron.sh).
// Asks customers for a review a few days after their invoice is paid, for companies that turned it on.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runReviewRequests());
  } catch (err) {
    console.error("[cron review-requests] failed", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
