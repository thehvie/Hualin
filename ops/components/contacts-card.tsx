"use client";

import { useState, useTransition } from "react";

import { addContact, deleteContact, updateContact, type ContactInput } from "@/app/(dashboard)/customers/contact-actions";

export interface ContactRow {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

const field = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const blank: ContactInput = { name: "", title: "", email: "", phone: "", notes: "" };

function Form({ initial, onSave, onCancel, pending, error }: { initial: ContactInput; onSave: (v: ContactInput) => void; onCancel: () => void; pending: boolean; error: string | null }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof ContactInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <input value={v.name} onChange={set("name")} placeholder="Name" className={field} />
      <input value={v.title} onChange={set("title")} placeholder="Role, like Office manager" className={field} />
      <input value={v.email} onChange={set("email")} placeholder="Email" type="email" className={field} />
      <input value={v.phone} onChange={set("phone")} placeholder="Phone" inputMode="tel" className={field} />
      <textarea value={v.notes} onChange={set("notes")} placeholder="Notes (best time to call, gate code...)" rows={2} className={field} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => onSave(v)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Other people at this customer: staff to reach, or to put on an estimate or invoice. */
export function ContactsCard({ customerId, contacts }: { customerId: string; contacts: ContactRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else setEditing(null);
    });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">People at this customer</h2>
        {editing !== "new" && (
          <button type="button" onClick={() => { setError(null); setEditing("new"); }} className="text-xs font-semibold text-brand hover:text-brand-dark">
            + Add person
          </button>
        )}
      </div>

      {contacts.length === 0 && editing !== "new" && <p className="text-sm text-zinc-400">No other contacts. Add staff, a property manager or an accountant to put them on an estimate or invoice.</p>}

      <ul className="flex flex-col gap-3">
        {contacts.map((c) =>
          editing === c.id ? (
            <li key={c.id}>
              <Form initial={{ name: c.name, title: c.title ?? "", email: c.email ?? "", phone: c.phone ?? "", notes: c.notes ?? "" }} pending={pending} error={error} onCancel={() => setEditing(null)} onSave={(v) => run(() => updateContact(c.id, v))} />
            </li>
          ) : (
            <li key={c.id} className="text-sm">
              <p className="font-medium text-zinc-900">
                {c.name}
                {c.title && <span className="font-normal text-zinc-500"> · {c.title}</span>}
              </p>
              {c.email && <p className="text-zinc-600">{c.email}</p>}
              {c.phone && <p className="text-zinc-600">{c.phone}</p>}
              {c.notes && <p className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-500">{c.notes}</p>}
              <div className="mt-1 flex gap-3 text-xs">
                <button type="button" onClick={() => { setError(null); setEditing(c.id); }} className="font-medium text-zinc-500 hover:text-zinc-800">
                  Edit
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(`Remove ${c.name}? Their estimates and invoices stay and go back to the main contact.`)) run(() => deleteContact(c.id));
                  }}
                  className="font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </li>
          ),
        )}
        {editing === "new" && (
          <li>
            <Form initial={blank} pending={pending} error={error} onCancel={() => setEditing(null)} onSave={(v) => run(() => addContact(customerId, v))} />
          </li>
        )}
      </ul>
    </div>
  );
}
