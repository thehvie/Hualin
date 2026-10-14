"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/phone";
import { requireSession } from "@/lib/session";

type Result = { ok: true } | { ok: false; error: string };

export interface ContactInput {
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
}

function clean(input: ContactInput): { data: { name: string; title: string | null; email: string | null; phone: string | null; notes: string | null } } | { error: string } {
  const name = String(input.name ?? "").trim().slice(0, 100);
  const email = String(input.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = formatPhone(String(input.phone ?? ""));
  if (!name) return { error: "Give the contact a name." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
  return {
    data: {
      name,
      title: String(input.title ?? "").trim().slice(0, 100) || null,
      email: email || null,
      phone: phone || null,
      notes: String(input.notes ?? "").trim().slice(0, 1000) || null,
    },
  };
}

export async function addContact(customerId: string, input: ContactInput): Promise<Result> {
  const { companyId } = await requireSession();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } });
  if (!customer) return { ok: false, error: "Customer not found." };
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error };
  await prisma.customerContact.create({ data: { companyId, customerId, ...c.data } });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true };
}

export async function updateContact(contactId: string, input: ContactInput): Promise<Result> {
  const { companyId } = await requireSession();
  const existing = await prisma.customerContact.findFirst({ where: { id: contactId, companyId }, select: { customerId: true } });
  if (!existing) return { ok: false, error: "Contact not found." };
  const c = clean(input);
  if ("error" in c) return { ok: false, error: c.error };
  await prisma.customerContact.update({ where: { id: contactId }, data: c.data });
  revalidatePath(`/customers/${existing.customerId}`);
  return { ok: true };
}

/** Removing a contact leaves their estimates and invoices in place, now addressed to the main customer again. */
export async function deleteContact(contactId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const existing = await prisma.customerContact.findFirst({ where: { id: contactId, companyId }, select: { customerId: true } });
  if (!existing) return { ok: false, error: "Contact not found." };
  await prisma.customerContact.delete({ where: { id: contactId } });
  revalidatePath(`/customers/${existing.customerId}`);
  return { ok: true };
}

/** Assigns a contact (or nobody, meaning the main customer) to an estimate or invoice. */
export async function setDocumentContact(kind: "estimate" | "invoice", documentId: string, contactId: string | null): Promise<Result> {
  const { companyId } = await requireSession();
  const doc =
    kind === "estimate"
      ? await prisma.estimate.findFirst({ where: { id: documentId, companyId }, select: { customerId: true } })
      : await prisma.invoice.findFirst({ where: { id: documentId, companyId }, select: { customerId: true } });
  if (!doc) return { ok: false, error: "Document not found." };
  if (contactId) {
    const contact = await prisma.customerContact.findFirst({ where: { id: contactId, companyId, customerId: doc.customerId }, select: { id: true } });
    if (!contact) return { ok: false, error: "That contact belongs to a different customer." };
  }
  if (kind === "estimate") await prisma.estimate.update({ where: { id: documentId }, data: { contactId } });
  else await prisma.invoice.update({ where: { id: documentId }, data: { contactId } });
  revalidatePath(`/${kind === "estimate" ? "estimates" : "invoices"}/${documentId}`);
  return { ok: true };
}
