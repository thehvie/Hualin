import { NextRequest, NextResponse } from "next/server";
import { runRentalReminders } from "@/lib/rental-reminders";

// Run every 15 minutes from the server's cron:
//   */15 * * * * curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://ops.haulinjunkies.com/api/cron/rental-reminders
// For each company with rental reminders switched on, drafts (or sends) the reminder for dumpsters whose pickup is near.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runRentalReminders());
  } catch (err) {
    console.error("[cron rental-reminders] failed", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
