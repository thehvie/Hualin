import { NextResponse } from "next/server";

import { renderInvoicePdf, pdfResponse } from "@/lib/pdf/render";

// Public PDF download linked from the invoice email. The unguessable token is
// the only credential.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const pdf = await renderInvoicePdf({ publicToken: token });
    if (!pdf) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return pdfResponse(pdf);
  } catch (err) {
    console.error("Failed to render public invoice PDF", err);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
