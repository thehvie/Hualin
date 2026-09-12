import Link from "next/link";
import { createCustomer } from "../actions";

const SOURCES = [
  { value: "WEBSITE", label: "Website" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "REFERRAL", label: "Referral" },
  { value: "YELP", label: "Yelp" },
  { value: "DOOR_HANGER", label: "Door Hanger" },
  { value: "REPEAT", label: "Repeat Customer" },
  { value: "OTHER", label: "Other" },
];

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/customers" className="hover:text-zinc-600">
            Customers
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Add New Client</h1>
      </div>

      <form action={createCustomer} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Client Details */}
          <Section title="Client Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
            </div>
            <Field label="Company name" name="companyName" placeholder="Optional" />

            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Contact Information
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_100px]">
              <Field label="Phone number" name="phone" type="tel" />
              <Field label="Ext" name="phoneExt" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_100px]">
              <Field label="Secondary phone" name="secondaryPhone" type="tel" />
              <Field label="Ext" name="secondaryPhoneExt" />
            </div>
            <Field label="Email" name="email" type="email" />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="source" className="text-sm font-medium text-zinc-700">
                Ad Source
              </label>
              <select
                id="source"
                name="source"
                defaultValue="WEBSITE"
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <Toggle label="Allow Billing" name="allowBilling" />
              <Toggle label="Tax Exempt" name="taxExempt" />
            </div>
          </Section>

          {/* Client Address */}
          <Section title="Client Address">
            <div className="flex h-[180px] w-full items-center justify-center rounded-lg bg-zinc-100 text-center text-xs text-zinc-400">
              Map preview available after saving
            </div>
            <Field label="Address" name="addressLine1" />
            <Field label="Unit" name="addressLine2" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City" name="city" />
              <Field label="Region" name="state" placeholder="FL" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Postal code" name="zip" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="country" className="text-sm font-medium text-zinc-700">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  defaultValue="US"
                  className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  <option value="US">United States</option>
                </select>
              </div>
            </div>
          </Section>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/customers"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Create Customer
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        required={required}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

function Toggle({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex items-center justify-between text-sm font-medium text-zinc-700">
      {label}
      <span className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" name={name} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-brand" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
