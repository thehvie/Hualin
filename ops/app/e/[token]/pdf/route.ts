import { NextResponse } from "next/server";

import { renderEstimatePdf, pdfResponse } from "@/lib/pdf/render";

// Public PDF download linked from the estimate email/text. The unguessable
// token is the only credential, same as the signing page next to it.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const pdf = await renderEstimatePdf({ publicToken: token });
    if (!pdf) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return pdfResponse(pdf);
  } catch (err) {
    console.error("Failed to render public estimate PDF", err);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
