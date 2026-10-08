import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signedDownloadUrl } from "@/lib/storage";

// Serves a stored email attachment to signed-in staff of the owning company. Photos display inline; everything
// else downloads, and nothing is ever rendered by the browser as a page.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const file = await prisma.communicationAttachment.findFirst({ where: { id, companyId: session.user.companyId } });
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isImage = file.mimeType === "image/jpeg";

  // In DigitalOcean Spaces: the ownership check above passed, so hand out a short-lived private link.
  if (file.storageKey) {
    const url = await signedDownloadUrl(file.storageKey, file.filename, isImage, file.mimeType);
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  // In the database (older files, or Spaces isn't set up).
  if (!file.data) return NextResponse.json({ error: "File is missing." }, { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": isImage ? "image/jpeg" : "application/octet-stream",
      "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${encodeURIComponent(file.filename)}"`,
      "Content-Length": String(file.data.byteLength),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
