"use client";

import { useActionState, useState } from "react";
import { LogoUploadField } from "./logo-upload-field";
import { TIMEZONE_OPTIONS } from "@/lib/tz";
import { US_STATES } from "@/lib/us-states";
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
    timezone: string;
    state: string | null;
    fuelRate: string;
    fuelFreeMiles: number;
    fuelRoundTrip: boolean;
    officeAddressLine1: string | null;
    officeCity: string | null;
    officeState: string | null;
    officeZip: string | null;
    salesTaxPercent: string;
    logoDataUrl: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState<SettingsFormState, FormData>(
    updateCompanyProfile,
    {},
  );
  const [isReadingFile, setIsReadingFile] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      {state.error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.error}
        </div>
      )}

      <LogoUploadField initialLogoDataUrl={company.logoDataUrl} onReadingChange={setIsReadingFile} />

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
        <label htmlFor="timezone" className="text-sm font-medium text-zinc-700">
          Time zone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={company.timezone}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">
          Used for your schedule, online booking times, and the confirmations customers receive.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="state" className="text-sm font-medium text-zinc-700">
          State
        </label>
        <select
          id="state"
          name="state"
          defaultValue={company.state || ""}
          className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="">Select…</option>
          {US_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-400">
          The state you work in. Online booking fills it in for customers so they don&apos;t have to pick one.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700">Office address</p>
        <input
          name="officeAddressLine1"
          defaultValue={company.officeAddressLine1 || ""}
          placeholder="Street address"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <input
            name="officeCity"
            defaultValue={company.officeCity || ""}
            placeholder="City"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <select
            name="officeState"
            defaultValue={company.officeState || ""}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">State</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            name="officeZip"
            defaultValue={company.officeZip || ""}
            placeholder="Zip"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <p className="text-xs text-zinc-400">Where your jobs start from. Estimates show the drive from here to the customer.</p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700">Fuel surcharge</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Rate per mile ($)</span>
            <input
              name="fuelRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={company.fuelRate}
              className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Free miles (one way)</span>
            <input
              name="fuelFreeMiles"
              type="number"
              step="1"
              min="0"
              defaultValue={company.fuelFreeMiles}
              className="w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700">
            <input name="fuelRoundTrip" type="checkbox" defaultChecked={company.fuelRoundTrip} />
            Charge the round trip
          </label>
        </div>
        <p className="text-xs text-zinc-400">
          Estimates show a suggested fuel surcharge from your office to the job: (distance minus free miles) times the rate. Leave the rate at 0 to turn it off.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="salesTaxPercent" className="text-sm font-medium text-zinc-700">
          Sales tax rate (%)
        </label>
        <input
          id="salesTaxPercent"
          name="salesTaxPercent"
          type="number"
          inputMode="decimal"
          min={0}
          max={20}
          step="0.01"
          defaultValue={company.salesTaxPercent}
          placeholder="0"
          className="w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <p className="text-xs text-zinc-400">
          Your state or local rate, for example 6.5. Enter 0 if you don&apos;t charge sales tax. New invoices use this rate on
          items marked taxable; invoices you&apos;ve already created keep the rate they were made with.
        </p>
      </div>

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
        disabled={isPending || isReadingFile}
        className="mt-2 self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving…" : isReadingFile ? "Reading file…" : "Save"}
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
