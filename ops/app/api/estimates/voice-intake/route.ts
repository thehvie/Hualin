import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getUsageStatus, USAGE_PAUSED_MESSAGE } from "@/lib/usage";
import { transcribeVoiceIntake } from "@/lib/openrouter";

const MAX_BYTES = 8 * 1024 * 1024; // ~4 minutes of 16 kHz mono WAV

const digits = (v: string) => v.replace(/\D/g, "");

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const companyId = session.user.companyId;

  const limit = rateLimit(`voice-intake:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many recordings, try again later." }, { status: 429 });

  if ((await getUsageStatus(companyId)).capped) return NextResponse.json({ error: USAGE_PAUSED_MESSAGE }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const audioField = form?.get("audio");
  const audio = audioField instanceof File && audioField.size > 0 ? audioField : null;
  const rawText = form?.get("text");
  const typed = typeof rawText === "string" ? rawText.trim().slice(0, 4000) : "";
  if (!audio && !typed) return NextResponse.json({ error: "No recording or message received." }, { status: 400 });
  if (audio && audio.size > MAX_BYTES) return NextResponse.json({ error: "Recording is too long, keep it under 3 minutes." }, { status: 413 });

  const catalog = await prisma.priceBookItem.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true, type: true, unitPriceCents: true },
    orderBy: { name: "asc" },
    take: 400,
  });

  const { timezone } = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });

  let intake;
  try {
    intake = await transcribeVoiceIntake(
      audio ? Buffer.from(await audio.arrayBuffer()).toString("base64") : null,
      catalog,
      companyId,
      timezone,
      typed,
    );
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice intake failed." }, { status: 502 });
  }

  // Too little to build an estimate from (a tap, silence, one word): say so rather than show a mostly empty draft.
  // Needs a customer name plus at least an address, a job description or an item.
  const enough =
    !!(intake.firstName || intake.lastName) &&
    !!(intake.addressLine1 || intake.jobNotes || intake.matches.length > 0);
  if (intake.intent === "new_estimate" && !enough) {
    return NextResponse.json({ intent: intake.intent, enough: false });
  }

  // Flag an existing customer with the same phone or email so we don't create a duplicate.
  let match: { id: string; label: string } | null = null;
  const phoneDigits = digits(intake.phone);
  const email = intake.email.toLowerCase();
  if (phoneDigits.length >= 7 || email) {
    const candidates = await prisma.customer.findMany({
      where: { companyId, OR: [...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []), ...(phoneDigits.length >= 7 ? [{ phone: { not: null } }] : [])] },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      take: 2000,
    });
    const hit = candidates.find(
      (c) => (email && c.email?.toLowerCase() === email) || (phoneDigits.length >= 7 && digits(c.phone ?? "") === phoneDigits),
    );
    if (hit) match = { id: hit.id, label: `${hit.firstName} ${hit.lastName}` };
  }

  const byId = new Map(catalog.map((c) => [c.id, c]));
  const { matches, unmatched, intent, ...customer } = intake;
  const items = matches.map((m) => {
    const c = byId.get(m.priceBookItemId)!;
    return { ...m, name: c.name, unitPriceCents: c.unitPriceCents, isRental: c.type === "RENTAL" };
  });

  return NextResponse.json({ intent, enough: true, intake: customer, match, items, unmatched });
}
