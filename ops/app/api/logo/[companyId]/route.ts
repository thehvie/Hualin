import { prisma } from "@/lib/prisma";

// Public logo for emails. Mail clients block data: URLs, so the logo stored on the company is served from here.
// Only the logo image is exposed, and only if the company has one.
export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { logoDataUrl: true } });
  const match = company?.logoDataUrl?.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "Content-Type": match[1], "Cache-Control": "public, max-age=3600" },
  });
}
