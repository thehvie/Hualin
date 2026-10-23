import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import { formatQty, formatUnitPrice } from "@/lib/price-book";
import { parseTerms } from "@/lib/terms-format";

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 10, fontFamily: "Helvetica", color: "#3f3f46" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  // Height-only (no fixed width): react-pdf auto-scales width to the image's
  // natural aspect ratio. A fixed width + objectFit:"contain" instead centers
  // the image inside that wider box, which left a gap of empty space before
  // any non-120x60 logo (e.g. a square icon) — misaligning it against the
  // company name/contact block directly below, which starts flush left.
  logo: { height: 60, maxWidth: 200 },
  logoPlaceholder: {
    width: 120,
    height: 60,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#d4d4d8",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: { fontSize: 8, color: "#a1a1aa" },
  kindLabel: { fontSize: 26, fontWeight: 700, color: "#52525b" },
  companyBlock: { marginTop: 8 },
  companyLine: { color: "#71717a", marginBottom: 2 },
  metaBlock: { alignItems: "flex-end", marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 3 },
  metaLabel: { fontWeight: 700, color: "#3f3f46" },
  metaValue: { color: "#3f3f46" },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  partyBlock: { width: "48%" },
  partyHeading: { fontWeight: 700, color: "#3f3f46", marginBottom: 4 },
  partyLine: { color: "#71717a", marginBottom: 2 },
  divider: { borderBottomWidth: 2, borderBottomColor: "#3f3f46", marginTop: 12, marginBottom: 6 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#a1a1aa", paddingBottom: 6 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    borderStyle: "dashed",
    paddingVertical: 8,
  },
  colDescription: { width: "46%" },
  colQty: { width: "12%", textAlign: "right" },
  colPrice: { width: "18%", textAlign: "right" },
  colAmount: { width: "24%", textAlign: "right" },
  headerCell: { fontWeight: 700, color: "#52525b" },
  descriptionCell: { fontWeight: 700, color: "#3f3f46" },
  totalsBlock: { alignSelf: "flex-end", width: "45%", marginTop: 8 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalsLabel: { color: "#71717a" },
  totalsValue: { color: "#3f3f46" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
  },
  grandTotalLabel: { fontWeight: 700, color: "#18181b" },
  grandTotalValue: { fontWeight: 700, color: "#18181b" },
  section: { marginTop: 10 },
  sectionHeading: { fontWeight: 700, color: "#000000", marginBottom: 3 },
  sectionBody: { color: "#000000", lineHeight: 1.3 },
  termsText: { color: "#000000", fontSize: 7.5, lineHeight: 1.15 },
  footer: { marginTop: 12, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#18181b" },
});

const DEFAULT_TERMS =
  "Estimates are an approximation of charges to you, and they are based on the anticipated details of the work to be done. It is possible for unexpected complications to cause some deviation from the estimate. If additional parts or labor are required you will be contacted immediately.";

export interface DocumentPdfLineItem {
  description: string;
  quantity: number;
  isRental?: boolean;
  unitPriceCents: number;
}

export interface DocumentPdfProps {
  kind: "ESTIMATE" | "INVOICE" | "PURCHASE_ORDER";
  number: number;
  date: string;
  company: {
    name: string;
    logoDataUrl: string | null;
    // Exact box for the logo (see lib/pdf/logo.ts); without it react-pdf may stretch the image.
    logoSize?: { width: number; height: number } | null;
    /** Platform name for the Powered by line; null when the company has the brand upgrade or a paid plan. */
    poweredBy?: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    termsText: string | null;
    /** Printed under the totals when set (only for documents that can still be paid). */
    paymentLink?: { url: string; label: string } | null;
    /** Printed on invoices when the company has a review link. */
    reviewLink?: string | null;
  };
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  property: {
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zip: string;
  } | null;
  lineItems: DocumentPdfLineItem[];
  subtotalCents: number;
  discountCents: number;
  /** Printed as its own line only when above $0. */
  fuelSurchargeCents?: number;
  /** Amount already paid (a deposit, or invoice payments); the PDF then shows what's still owed. */
  paidCents?: number;
  paidLabel?: string;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  // Only for kind === "PURCHASE_ORDER": the addressee is a vendor, not a customer,
  // and there's delivery/pickup info instead of a service location.
  purchaseOrder?: {
    vendorName: string;
    vendorLines: string[];
    fulfillment: "DELIVERY" | "PICKUP";
    fulfillmentLines: string[];
    expectedDate: string | null;
    paymentTerms: string | null;
  };
}

const KIND_LABELS = {
  ESTIMATE: { title: "ESTIMATE", number: "Estimate #" },
  INVOICE: { title: "INVOICE", number: "Invoice #" },
  PURCHASE_ORDER: { title: "PURCHASE ORDER", number: "PO #" },
} as const;

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function DocumentPdf(props: DocumentPdfProps) {
  const { kind, number, date, company, customer, property, lineItems, subtotalCents, discountCents, fuelSurchargeCents = 0, paidCents = 0, paidLabel = "Paid", taxCents, totalCents, notes, purchaseOrder } =
    props;
  const isPo = kind === "PURCHASE_ORDER" && !!purchaseOrder;
  const discountPercent = subtotalCents > 0 ? (discountCents / subtotalCents) * 100 : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company.logoDataUrl ? (
              <Image src={company.logoDataUrl} style={company.logoSize ? { width: company.logoSize.width, height: company.logoSize.height } : styles.logo} />
            ) : company.poweredBy ? null : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>Add a logo in Settings</Text>
              </View>
            )}
            <View style={styles.companyBlock}>
              <Text style={styles.companyLine}>{company.name}</Text>
              {company.website && <Text style={styles.companyLine}>{company.website}</Text>}
              {company.email && <Text style={styles.companyLine}>{company.email}</Text>}
              {company.phone && <Text style={styles.companyLine}>{company.phone}</Text>}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={isPo ? [styles.kindLabel, { fontSize: 22 }] : styles.kindLabel}>{KIND_LABELS[kind].title}</Text>
            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{KIND_LABELS[kind].number}</Text>
                <Text style={styles.metaValue}>{number}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Total</Text>
                <Text style={styles.metaValue}>{formatCents(totalCents)}</Text>
              </View>
            </View>
          </View>
        </View>

        {isPo && purchaseOrder ? (
          <View style={styles.partiesRow}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyHeading}>Vendor:</Text>
              <Text style={styles.partyLine}>{purchaseOrder.vendorName}</Text>
              {purchaseOrder.vendorLines.map((l, i) => (
                <Text key={i} style={styles.partyLine}>
                  {l}
                </Text>
              ))}
            </View>
            <View style={styles.partyBlock}>
              <Text style={styles.partyHeading}>{purchaseOrder.fulfillment === "PICKUP" ? "Pickup:" : "Deliver To:"}</Text>
              {purchaseOrder.fulfillmentLines.map((l, i) => (
                <Text key={i} style={styles.partyLine}>
                  {l}
                </Text>
              ))}
              {purchaseOrder.expectedDate && (
                <Text style={styles.partyLine}>
                  {purchaseOrder.fulfillment === "PICKUP" ? "Pickup" : "Needed by"}: {purchaseOrder.expectedDate}
                </Text>
              )}
            </View>
          </View>
        ) : (
        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyHeading}>Prepared For:</Text>
            <Text style={styles.partyLine}>{customer.name}</Text>
            {property && (
              <>
                <Text style={styles.partyLine}>
                  {property.addressLine1}
                  {property.addressLine2 ? `, ${property.addressLine2}` : ""}
                </Text>
                <Text style={styles.partyLine}>
                  {property.city}, {property.state} {property.zip}
                </Text>
              </>
            )}
            {customer.phone && <Text style={styles.partyLine}>{customer.phone}</Text>}
            {customer.email && <Text style={styles.partyLine}>{customer.email}</Text>}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyHeading}>Service Location:</Text>
            {property ? (
              <>
                <Text style={styles.partyLine}>
                  {property.addressLine1}
                  {property.addressLine2 ? `, ${property.addressLine2}` : ""}
                </Text>
                <Text style={styles.partyLine}>
                  {property.city}, {property.state} {property.zip}
                </Text>
              </>
            ) : (
              <Text style={styles.partyLine}>No property on file</Text>
            )}
          </View>
        </View>
        )}

        <View style={styles.divider} />

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
          <Text style={[styles.colQty, styles.headerCell]}>QTY</Text>
          <Text style={[styles.colPrice, styles.headerCell]}>{isPo ? "Cost" : "Price"}</Text>
          <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
        </View>
        {lineItems.map((li, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.colDescription, styles.descriptionCell]}>{li.description}</Text>
            <Text style={styles.colQty}>{formatQty(li.quantity, !!li.isRental)}</Text>
            <Text style={styles.colPrice}>{formatUnitPrice(formatCents(li.unitPriceCents), !!li.isRental)}</Text>
            <Text style={styles.colAmount}>{formatCents(li.quantity * li.unitPriceCents)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sub total</Text>
            <Text style={styles.totalsValue}>{formatCents(subtotalCents)}</Text>
          </View>
          {discountCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>
                {formatCents(discountCents)} ({discountPercent.toFixed(2)}%)
              </Text>
            </View>
          )}
          {fuelSurchargeCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Fuel surcharge</Text>
              <Text style={styles.totalsValue}>{formatCents(fuelSurchargeCents)}</Text>
            </View>
          )}
          {taxCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCents(taxCents)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCents(totalCents)}</Text>
          </View>
          {paidCents > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>{paidLabel}</Text>
                <Text style={styles.totalsValue}>-{formatCents(paidCents)}</Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Balance due</Text>
                <Text style={styles.grandTotalValue}>{formatCents(Math.max(0, totalCents - paidCents))}</Text>
              </View>
            </>
          )}
        </View>

        {company.paymentLink && (
          <View style={{ marginTop: 10, alignItems: "flex-end" }}>
            <Link
              src={company.paymentLink.url}
              style={{ fontSize: 12, fontWeight: 700, color: "#ffffff", textDecoration: "none", backgroundColor: "#c2410c", paddingVertical: 8, paddingHorizontal: 18, borderRadius: 4 }}
            >
              {company.paymentLink.label}
            </Link>
          </View>
        )}

        {company.reviewLink && (
          <View style={{ marginTop: 10, alignItems: "flex-end" }}>
            <Link src={company.reviewLink} style={{ fontSize: 11, color: "#c2410c", textDecoration: "underline" }}>
              Happy with our service? Leave us a review
            </Link>
          </View>
        )}

        {isPo && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Payment terms:</Text>
            <Text style={styles.sectionBody}>{purchaseOrder?.paymentTerms ?? ""}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Notes:</Text>
          <Text style={styles.sectionBody}>{notes || ""}</Text>
        </View>

        {!isPo && (
          // Small, tight black type so the terms fit under the totals on the first page; longer terms flow onto the next.
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Terms:</Text>
            {parseTerms(company.termsText || DEFAULT_TERMS).map((b, i) => {
              if (b.kind === "space") return <View key={i} style={{ height: 2 }} />;
              const runs = b.runs.map((r, j) => (
                <Text key={j} style={r.bold ? { fontWeight: 700 } : undefined}>
                  {r.text}
                </Text>
              ));
              if (b.kind === "numbered") {
                return (
                  <View key={i} style={{ flexDirection: "row", marginTop: 1 }}>
                    <Text style={[styles.termsText, { width: 14, fontWeight: 700 }]}>{b.label}</Text>
                    <Text style={[styles.termsText, { flex: 1 }]}>{runs}</Text>
                  </View>
                );
              }
              if (b.kind === "bullet") {
                return (
                  <View key={i} style={{ flexDirection: "row", paddingLeft: b.depth ? 24 : 12 }}>
                    <Text style={[styles.termsText, { width: 7 }]}>•</Text>
                    <Text style={[styles.termsText, { flex: 1 }]}>{runs}</Text>
                  </View>
                );
              }
              return (
                <Text key={i} style={[styles.termsText, b.kind === "heading" ? { marginTop: 3, fontWeight: 700 } : {}]}>
                  {runs}
                </Text>
              );
            })}
          </View>
        )}

        <Text style={styles.footer}>{isPo ? "Thank you" : "Thank you for your business"}</Text>
        {company.poweredBy && <Text style={{ marginTop: 6, textAlign: "center", fontSize: 8, color: "#a1a1aa" }}>Powered by {company.poweredBy}</Text>}
      </Page>
    </Document>
  );
}
