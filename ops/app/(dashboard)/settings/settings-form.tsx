"use client";

import { useActionState } from "react";
import { LogoUploadField } from "./logo-upload-field";
import { updateCompanyProfile, removeCompanyLogo, type SettingsFormState } from "./actions";

const DEFAULT_TERMS_PLACEHOLDER =
  "Estimates are an approximation of charges to you, and they are based on the anticipated details of the work to be done...";

export function SettingsForm({
  company,
}: {
  company: {
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    termsText: string | null;
    logoDataUrl: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState<SettingsFormState, FormData>(
    updateCompanyProfile,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      {state.error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.error}
        </div>
      )}

      <LogoUploadField initialLogoDataUrl={company.logoDataUrl} />

      {company.logoDataUrl && (
        <button
          type="submit"
          formAction={removeCompanyLogo}
          className="self-start text-xs font-medium text-red-500 hover:text-red-700"
        >
          Remove logo
        </button>
      )}

      <Field label="Company name" name="name" defaultValue={company.name} required />
      <Field label="Email" name="email" type="email" defaultValue={company.email || ""} />
      <Field label="Phone" name="phone" type="tel" defaultValue={company.phone || ""} />
      <Field label="Website" name="website" defaultValue={company.website || ""} placeholder="haulinjunkies.com" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="termsText" className="text-sm font-medium text-zinc-700">
          Terms &amp; Conditions
        </label>
        <textarea
          id="termsText"
          name="termsText"
          rows={4}
          defaultValue={company.termsText || ""}
          placeholder={DEFAULT_TERMS_PLACEHOLDER}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <p className="text-xs text-zinc-400">Shown on estimate and invoice PDFs. Leave blank to use the default wording.</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}
