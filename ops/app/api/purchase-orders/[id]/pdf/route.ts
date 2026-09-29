import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/session";
import { renderPurchaseOrderPdf, pdfResponse } from "@/lib/pdf/render";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireSession();
  const { id } = await params;

  try {
    const pdf = await renderPurchaseOrderPdf({ id, companyId });
    if (!pdf) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    return pdfResponse(pdf);
  } catch (err) {
    console.error("Failed to render purchase order PDF", err);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }
}
