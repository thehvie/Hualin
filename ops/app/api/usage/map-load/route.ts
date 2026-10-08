import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GOOGLE_COST_MICROS, getUsageStatus, recordUsage, shouldCountMapView } from "@/lib/usage";

// Called by the browser each time a map is displayed. A given map (an estimate, a customer) is counted at most
// once per 24 hours, so reopening the same page doesn't keep adding to the company's metered usage.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const companyId = session.user.companyId;

  const body = (await req.json().catch(() => null)) as { ref?: unknown } | null;
  const ref = typeof body?.ref === "string" ? body.ref.slice(0, 80) : "";
  if (!ref) return NextResponse.json({ ok: false }, { status: 400 });

  if ((await getUsageStatus(companyId)).capped) return NextResponse.json({ ok: false });
  if (!(await shouldCountMapView(companyId, ref))) return NextResponse.json({ ok: true, counted: false });

  await recordUsage(companyId, "MAP_LOAD", GOOGLE_COST_MICROS.MAP_LOAD, ref);
  return NextResponse.json({ ok: true, counted: true });
}
