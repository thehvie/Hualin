import { renderToBuffer } from "@react-pdf/renderer";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { lineItemsTotal } from "@/lib/money";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { poTotalCents } from "@/lib/purchase-orders";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { logoSizeFor } from "@/lib/pdf/logo";

// Shared by the logged-in PDF routes (scoped by id + companyId) and the
// public customer links (scoped by an unguessable publicToken).

export interface RenderedPdf {
  buffer: Buffer;
  filename: string;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export async function renderEstimatePdf(where: Prisma.EstimateWhereInput): Promise<RenderedPdf | null> {
  const estimate = await prisma.estimate.findFirst({
    where,
    include: {
      customer: { include: { properties: true } },
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      company: true,
    },
  });
  if (!estimate) return null;

  const subtotalCents = lineItemsTotal(estimate.lineItems);
  const discountCents = Math.min(Math.max(estimate.discountCents, 0), subtotalCents);
  const totalCents = Math.max(0, subtotalCents - discountCents);
  const property = estimate.property ?? estimate.customer.properties[0] ?? null;

  const buffer = await renderToBuffer(
    DocumentPdf({
      kind: "ESTIMATE",
      number: estimate.number,
      date: fmtDate(estimate.createdAt),
      company: {
        name: estimate.company.name,
        logoDataUrl: estimate.company.logoDataUrl,
        logoSize: await logoSizeFor(estimate.company.logoDataUrl),
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
        isRental: li.isRental,
        unitPriceCents: li.unitPriceCents,
      })),
      subtotalCents,
      discountCents,
      taxCents: 0,
      totalCents,
      notes: estimate.notes,
    }),
  );
  return { buffer, filename: `estimate-${estimate.number}.pdf` };
}

export async function renderInvoicePdf(where: Prisma.InvoiceWhereInput): Promise<RenderedPdf | null> {
  const invoice = await prisma.invoice.findFirst({
    where,
    include: {
      customer: { include: { properties: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: true,
      taxRate: true,
      company: true,
    },
  });
  if (!invoice) return null;

  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    tipCents: invoice.tipCents,
    taxRateBps: invoice.taxRate?.rateBps ?? 0,
    payments: invoice.payments,
  });
  const property = invoice.customer.properties[0] ?? null;

  const buffer = await renderToBuffer(
    DocumentPdf({
      kind: "INVOICE",
      number: invoice.number,
      date: fmtDate(invoice.invoiceDate),
      company: {
        name: invoice.company.name,
        logoDataUrl: invoice.company.logoDataUrl,
        logoSize: await logoSizeFor(invoice.company.logoDataUrl),
        website: invoice.company.website,
        email: invoice.company.email,
        phone: invoice.company.phone,
        termsText: invoice.company.termsText,
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
        isRental: li.isRental,
        unitPriceCents: li.unitPriceCents,
      })),
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      notes: invoice.notes,
    }),
  );
  return { buffer, filename: `invoice-${invoice.number}.pdf` };
}

export async function renderPurchaseOrderPdf(where: Prisma.PurchaseOrderWhereInput): Promise<RenderedPdf | null> {
  const po = await prisma.purchaseOrder.findFirst({
    where,
    include: { vendor: true, company: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!po) return null;

  const total = poTotalCents(po.lineItems);
  const v = po.vendor;
  const vendorCityLine = [v.city, [v.state, v.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const vendorLines = [
    v.addressLine1,
    vendorCityLine,
    v.contactName ? `Attn: ${v.contactName}${v.contactTitle ? ` (${v.contactTitle})` : ""}` : null,
    v.phone ? `${v.phone}${v.phoneExt ? ` x${v.phoneExt}` : ""}` : null,
    v.email,
  ].filter((l): l is string => !!l);

  const deliveryCityLine = [po.deliveryCity, [po.deliveryState, po.deliveryZip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const fulfillmentLines: string[] =
    po.fulfillment === "PICKUP"
      ? ["Pickup at vendor"]
      : [po.deliveryAddressLine1, deliveryCityLine].filter((l): l is string => !!l);
  if (fulfillmentLines.length === 0) fulfillmentLines.push("Address to be confirmed");

  const buffer = await renderToBuffer(
    DocumentPdf({
      kind: "PURCHASE_ORDER",
      number: po.number,
      date: fmtDate(po.orderDate),
      company: {
        name: po.company.name,
        logoDataUrl: po.company.logoDataUrl,
        logoSize: await logoSizeFor(po.company.logoDataUrl),
        website: po.company.website,
        email: po.company.email,
        phone: po.company.phone,
        termsText: po.company.termsText,
      },
      customer: { name: v.name, email: v.email, phone: v.phone },
      property: null,
      lineItems: po.lineItems.map((li) => ({
        description: li.name,
        quantity: li.quantity,
        unitPriceCents: li.costCents,
      })),
      subtotalCents: total,
      discountCents: 0,
      taxCents: 0,
      totalCents: total,
      notes: po.notes,
      purchaseOrder: {
        vendorName: v.name,
        vendorLines,
        fulfillment: po.fulfillment,
        fulfillmentLines,
        expectedDate: po.expectedDate ? fmtDate(po.expectedDate) : null,
        paymentTerms: v.paymentTerms,
      },
    }),
  );
  return { buffer, filename: `purchase-order-${po.number}.pdf` };
}

export function pdfResponse({ buffer, filename }: RenderedPdf): Response {
  return new Response(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
