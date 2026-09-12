import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { lineItemsTotal } from "@/lib/money";
import { DocumentPdf } from "@/lib/pdf/document-pdf";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      customer: { include: { properties: true } },
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      company: true,
    },
  });

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const subtotalCents = lineItemsTotal(estimate.lineItems);
  const discountCents = Math.min(Math.max(estimate.discountCents, 0), subtotalCents);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const property = estimate.property ?? estimate.customer.properties[0] ?? null;

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      DocumentPdf({
        kind: "ESTIMATE",
        number: estimate.number,
        date: estimate.createdAt.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        company: {
          name: estimate.company.name,
          logoDataUrl: estimate.company.logoDataUrl,
          website: estimate.company.website,
          email: estimate.company.email,
          phone: estimate.company.phone,
          termsText: estimate.company.termsText,
        },
        customer: {
          name: `${estimate.customer.firstName} ${estimate.customer.lastName}`,
          email: estimate.customer.email,
          phone: estimate.customer.phone,
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
        lineItems: estimate.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPriceCents: li.unitPriceCents,
        })),
        subtotalCents,
        discountCents,
        taxCents: 0,
        totalCents,
        notes: estimate.notes,
      }),
    );
  } catch (err) {
    console.error("Failed to render estimate PDF", err);
    return NextResponse.json({ error: "Could not generate the PDF." }, { status: 500 });
  }

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estimate-${estimate.number}.pdf"`,
    },
  });
}
