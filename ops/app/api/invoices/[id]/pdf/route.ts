import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { DocumentPdf } from "@/lib/pdf/document-pdf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      customer: { include: { properties: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: true,
      taxRate: true,
      company: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    tipCents: invoice.tipCents,
    taxRateBps: invoice.taxRate?.rateBps ?? 0,
    payments: invoice.payments,
  });

  const property = invoice.customer.properties[0] ?? null;

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      DocumentPdf({
        kind: "INVOICE",
        number: invoice.number,
        date: invoice.invoiceDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        company: {
          name: invoice.company.name,
          logoDataUrl: invoice.company.logoDataUrl,
          website: invoice.company.website,
          email: invoice.company.email,
          phone: invoice.company.phone,
        },
        customer: {
          name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
          email: invoice.customer.email,
          phone: invoice.customer.phone,
        },
        property: property
          ? {
              addressLine1: property.addressLine1,
              addressLine2: property.addressLine2,
              city: property.city,
              state: property.state,
              zip: property.zip,
            }
          : null,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPriceCents: li.unitPriceCents,
        })),
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        notes: invoice.notes,
      }),
    );
  } catch (err) {
    console.error("Failed to render invoice PDF", err);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
