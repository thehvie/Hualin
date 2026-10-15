"use server";

import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { requireSession } from "@/lib/session";

export interface ImportResult {
  ok: boolean;
  error?: string;
  added?: number;
  skipped?: { line: number; reason: string }[];
}

const MAX_ROWS = 1000;
const MAX_BYTES = 1_000_000;

/** Minimal CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first", "given name"],
  lastName: ["last name", "lastname", "last", "surname", "family name"],
  name: ["name", "full name", "customer", "customer name", "contact"],
  companyName: ["company", "company name", "business", "organization"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "phone number", "mobile", "cell", "telephone"],
  addressLine1: ["address", "address 1", "address line 1", "street", "street address"],
  city: ["city", "town"],
  state: ["state", "st", "province"],
  zip: ["zip", "zip code", "postal code", "postcode"],
};

/** Adds customers from a spreadsheet saved as CSV. Rows whose email is already on file are skipped, not duplicated. */
export async function importCustomers(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const { companyId } = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a CSV file first." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That file is too big. Split it into files under 1 MB." };

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { ok: false, error: "The file needs a header row and at least one customer." };
  if (rows.length - 1 > MAX_ROWS) return { ok: false, error: `That's more than ${MAX_ROWS} rows. Split it into smaller files.` };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col: Record<string, number> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const at = header.findIndex((h) => names.includes(h));
    if (at >= 0) col[field] = at;
  }
  if (col.firstName === undefined && col.name === undefined) {
    return { ok: false, error: "Couldn't find a name column. The first row should have headings like First name, Last name, Email, Phone, Address." };
  }

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { state: true } });
  const existingEmails = new Set((await prisma.customer.findMany({ where: { companyId, email: { not: null } }, select: { email: true } })).map((c) => c.email!.toLowerCase()));
  const seen = new Set<string>();
  const skipped: { line: number; reason: string }[] = [];
  let added = 0;

  for (let i = 1; i < rows.length; i++) {
    const get = (f: string) => (col[f] === undefined ? "" : (rows[i][col[f]] ?? "").trim());
    let firstName = get("firstName");
    let lastName = get("lastName");
    if (!firstName && !lastName) {
      const parts = get("name").split(/\s+/).filter(Boolean);
      firstName = parts[0] ?? "";
      lastName = parts.slice(1).join(" ");
    }
    if (!firstName) {
      skipped.push({ line: i + 1, reason: "No name" });
      continue;
    }
    if (!lastName) lastName = "-";
    const email = get("email").toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ line: i + 1, reason: `Email "${email}" doesn't look right` });
      continue;
    }
    if (email && (existingEmails.has(email) || seen.has(email))) {
      skipped.push({ line: i + 1, reason: "Email already on file" });
      continue;
    }
    if (email) seen.add(email);

    const address = get("addressLine1");
    const city = get("city");
    const state = company.state || get("state");
    await prisma.customer.create({
      data: {
        companyId,
        firstName: firstName.slice(0, 100),
        lastName: lastName.slice(0, 100),
        companyName: get("companyName").slice(0, 150) || null,
        email: email || null,
        phone: formatPhone(get("phone")) || null,
        source: "OTHER",
        properties: address && city && state ? { create: { companyId, addressLine1: address.slice(0, 200), city: city.slice(0, 100), state: state.slice(0, 2).toUpperCase(), zip: get("zip").slice(0, 10), country: "US" } } : undefined,
      },
    });
    added++;
  }
  return { ok: true, added, skipped: skipped.slice(0, 50) };
}
