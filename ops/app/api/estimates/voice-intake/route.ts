import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { transcribeVoiceIntake } from "@/lib/openrouter";

const MAX_BYTES = 8 * 1024 * 1024; // ~4 minutes of 16 kHz mono WAV

const digits = (v: string) => v.replace(/\D/g, "");

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const companyId = session.user.companyId;

  const limit = rateLimit(`voice-intake:${session.user.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many recordings, try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "No recording received." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Recording is too long, keep it under 3 minutes." }, { status: 413 });

  let intake;
  try {
    intake = await transcribeVoiceIntake(Buffer.from(await audio.arrayBuffer()).toString("base64"));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice intake failed." }, { status: 502 });
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

  return NextResponse.json({ intake, match });
}
