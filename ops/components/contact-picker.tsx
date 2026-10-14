"use client";

import { useState, useTransition } from "react";

import { setDocumentContact } from "@/app/(dashboard)/customers/contact-actions";

export interface PickerContact {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
}

/** Who at the customer an estimate or invoice is for. Email and text for it go to them instead of the main contact. */
export function ContactPicker({
  kind,
  documentId,
  contacts,
  contactId,
  customerName,
}: {
  kind: "estimate" | "invoice";
  documentId: string;
  contacts: PickerContact[];
  contactId: string | null;
  customerName: string;
}) {
  const [value, setValue] = useState(contactId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (contacts.length === 0) return null;

  const picked = contacts.find((c) => c.id === value) ?? null;

  function change(next: string) {
    setError(null);
    const prev = value;
    setValue(next);
    start(async () => {
      const res = await setDocumentContact(kind, documentId, next || null);
      if (!res.ok) {
        setValue(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm">
      <label htmlFor={`contact-${documentId}`} className="font-semibold text-zinc-900">
        Contact
      </label>
      <select id={`contact-${documentId}`} value={value} disabled={pending} onChange={(e) => change(e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">
        <option value="">{customerName} (main contact)</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.title ? `, ${c.title}` : ""}
          </option>
        ))}
      </select>
      <span className="text-xs text-zinc-500">
        {picked
          ? picked.email || picked.phone
            ? `Messages go to ${[picked.email, picked.phone].filter(Boolean).join(" / ")}. Anything they lack goes to the main contact.`
            : "They have no email or phone saved, so messages go to the main contact."
          : "Add people on the customer's page to send this to someone else."}
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
