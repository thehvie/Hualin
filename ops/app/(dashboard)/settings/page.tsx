import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { LogoUploadField } from "./logo-upload-field";
import { updateCompanyProfile, removeCompanyLogo } from "./actions";

export default async function SettingsPage() {
  const { companyId } = await requireSession();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          This shows up on your estimates and invoices, including downloaded PDFs.
        </p>
      </div>

      <form action={updateCompanyProfile} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
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

        <button
          type="submit"
          className="mt-2 self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Save
        </button>
      </form>
    </div>
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
