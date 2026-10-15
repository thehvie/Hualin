import Link from "next/link";

import { requireSession } from "@/lib/session";
import { ImportForm } from "./import-form";

export default async function ImportCustomersPage() {
  await requireSession();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/customers" className="hover:text-zinc-600">
            Customers
          </Link>{" "}
          / Import
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Import customers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Save your spreadsheet as a CSV file (in Excel or Google Sheets: File, Save as, CSV). The first row should have headings.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
        <p className="font-semibold text-zinc-900">Headings we understand</p>
        <p className="mt-1 text-zinc-600">
          First name, Last name (or a single Name), Company, Email, Phone, Address, City, State, Zip. Other columns are ignored. Customers whose email is already in your list are skipped, so it&apos;s safe to import twice.
        </p>
        <p className="mt-3 rounded-lg bg-zinc-50 p-3 font-mono text-xs text-zinc-600">
          First name,Last name,Company,Email,Phone,Address,City,State,Zip
          <br />
          Jane,Smith,Smith Roofing,jane@example.com,407-555-0100,12 Oak St,Orlando,FL,32801
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
