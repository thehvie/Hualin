import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { matchVoiceItems } from "@/lib/openrouter";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const companyId = session.user.companyId;

  const limit = rateLimit(`voice-items:${session.user.id}`, 60, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many recordings, try again later." }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "No recording received." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "Recording is too long." }, { status: 413 });

  const catalog = await prisma.priceBookItem.findMany({
    where: { companyId, active: true },
    select: { id: true, name: true, type: true, unitPriceCents: true },
    orderBy: { name: "asc" },
    take: 400,
  });
  if (catalog.length === 0) return NextResponse.json({ error: "Your price book is empty. Add items in the Price book first." }, { status: 400 });

  try {
    const result = await matchVoiceItems(Buffer.from(await audio.arrayBuffer()).toString("base64"), catalog);
    const byId = new Map(catalog.map((c) => [c.id, c]));
    return NextResponse.json({
      transcript: result.transcript,
      unmatched: result.unmatched,
      matches: result.matches.map((m) => {
        const c = byId.get(m.priceBookItemId)!;
        return { ...m, name: c.name, unitPriceCents: c.unitPriceCents, isRental: c.type === "RENTAL" };
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Voice request failed." }, { status: 502 });
  }
}
