import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#3f3f46" },
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
  companyBlock: { marginTop: 12 },
  companyLine: { color: "#71717a", marginBottom: 2 },
  metaBlock: { alignItems: "flex-end", marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 3 },
  metaLabel: { fontWeight: 700, color: "#3f3f46" },
  metaValue: { color: "#3f3f46" },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  partyBlock: { width: "48%" },
  partyHeading: { fontWeight: 700, color: "#3f3f46", marginBottom: 4 },
  partyLine: { color: "#71717a", marginBottom: 2 },
  divider: { borderBottomWidth: 2, borderBottomColor: "#3f3f46", marginTop: 20, marginBottom: 8 },
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
  totalsBlock: { alignSelf: "flex-end", width: "45%", marginTop: 12 },
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
  section: { marginTop: 24 },
  sectionHeading: { fontWeight: 700, color: "#3f3f46", marginBottom: 4 },
  sectionBody: { color: "#52525b", lineHeight: 1.4 },
  footer: { marginTop: 60, textAlign: "center", fontSize: 16, fontWeight: 700, color: "#18181b" },
});

const DEFAULT_TERMS =
  "Estimates are an approximation of charges to you, and they are based on the anticipated details of the work to be done. It is possible for unexpected complications to cause some deviation from the estimate. If additional parts or labor are required you will be contacted immediately.";

export interface DocumentPdfLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface DocumentPdfProps {
  kind: "ESTIMATE" | "INVOICE";
  number: number;
  date: string;
  company: {
    name: string;
    logoDataUrl: string | null;
    website: string | null;
    email: string | null;
    phone: string | null;
    termsText: string | null;
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
  taxCents: number;
  totalCents: number;
  notes: string | null;
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function DocumentPdf(props: DocumentPdfProps) {
  const { kind, number, date, company, customer, property, lineItems, subtotalCents, discountCents, taxCents, totalCents, notes } =
    props;
  const discountPercent = subtotalCents > 0 ? (discountCents / subtotalCents) * 100 : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {company.logoDataUrl ? (
              <Image src={company.logoDataUrl} style={styles.logo} />
            ) : (
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
            <Text style={styles.kindLabel}>{kind === "ESTIMATE" ? "ESTIMATE" : "INVOICE"}</Text>
            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{kind === "ESTIMATE" ? "Estimate #" : "Invoice #"}</Text>
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

        <View style={styles.divider} />

        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colDescription, styles.headerCell]}>Description</Text>
          <Text style={[styles.colQty, styles.headerCell]}>QTY</Text>
          <Text style={[styles.colPrice, styles.headerCell]}>Price</Text>
          <Text style={[styles.colAmount, styles.headerCell]}>Amount</Text>
        </View>
        {lineItems.map((li, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.colDescription, styles.descriptionCell]}>{li.description}</Text>
            <Text style={styles.colQty}>{li.quantity}</Text>
            <Text style={styles.colPrice}>{formatCents(li.unitPriceCents)}</Text>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Terms:</Text>
          <Text style={styles.sectionBody}>{company.termsText || DEFAULT_TERMS}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Notes:</Text>
          <Text style={styles.sectionBody}>{notes || ""}</Text>
        </View>

        <Text style={styles.footer}>Thank you for your business</Text>
      </Page>
    </Document>
  );
}
