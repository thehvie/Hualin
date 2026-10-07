import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GOOGLE_COST_MICROS, getUsageStatus, recordUsage } from "@/lib/usage";

// Called by the browser each time a map is displayed, so map views are metered per company.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const companyId = session.user.companyId;
  if ((await getUsageStatus(companyId)).capped) return NextResponse.json({ ok: false });
  await recordUsage(companyId, "MAP_LOAD", GOOGLE_COST_MICROS.MAP_LOAD);
  return NextResponse.json({ ok: true });
}
