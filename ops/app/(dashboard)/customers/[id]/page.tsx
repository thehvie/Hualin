import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GoogleMap } from "@/components/google-map";
import { getHomeBaseLocation, haversineDistanceMiles } from "@/lib/geocode";

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  REFERRAL: "Referral",
  YELP: "Yelp",
  DOOR_HANGER: "Door Hanger",
  WEBSITE: "Website",
  REPEAT: "Repeat Customer",
  OTHER: "Other",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      properties: true,
      estimates: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      jobs: { orderBy: { createdAt: "desc" } },
      dumpsterRentals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) notFound();

  const primaryProperty = customer.properties[0];
  let distanceFromBase: number | null = null;
  if (primaryProperty?.latitude != null && primaryProperty?.longitude != null) {
    const homeBase = await getHomeBaseLocation();
    if (homeBase) {
      distanceFromBase = haversineDistanceMiles(homeBase, {
        latitude: primaryProperty.latitude,
        longitude: primaryProperty.longitude,
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/customers" className="hover:text-zinc-600">
            Customers
          </Link>
        </p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="flex gap-2">
            <Link
              href={`/estimates/new?customerId=${customer.id}`}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              + Estimate
            </Link>
          </div>
        </div>
        {customer.companyName && <p className="text-sm text-zinc-500">{customer.companyName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-1">
          <Card title="Contact">
            <dl className="flex flex-col gap-2 text-sm">
              <InfoRow
                label="Phone"
                value={customer.phone ? `${customer.phone}${customer.phoneExt ? ` ext. ${customer.phoneExt}` : ""}` : "—"}
                href={customer.phone ? `tel:${customer.phone}` : undefined}
              />
              {customer.secondaryPhone && (
                <InfoRow
                  label="Secondary phone"
                  value={`${customer.secondaryPhone}${customer.secondaryPhoneExt ? ` ext. ${customer.secondaryPhoneExt}` : ""}`}
                  href={`tel:${customer.secondaryPhone}`}
                />
              )}
              <InfoRow label="Email" value={customer.email || "—"} />
              <InfoRow label="Source" value={SOURCE_LABELS[customer.source] || customer.source} />
              <InfoRow label="Customer since" value={formatDate(customer.createdAt)} />
            </dl>
            {(customer.allowBilling || customer.taxExempt) && (
              <div className="mt-3 flex gap-2">
                {customer.allowBilling && <Badge label="Billing allowed" />}
                {customer.taxExempt && <Badge label="Tax exempt" />}
              </div>
            )}
          </Card>

          <Card title="Properties">
            {customer.properties.length === 0 ? (
              <p className="text-sm text-zinc-400">No properties on file.</p>
            ) : (
              <>
                <GoogleMap
                  latitude={primaryProperty.latitude}
                  longitude={primaryProperty.longitude}
                  label={primaryProperty.addressLine1}
                />
                {distanceFromBase != null && (
                  <p className="mt-2 text-xs text-zinc-500">
                    ~{distanceFromBase.toFixed(1)} mi from home base (straight-line)
                  </p>
                )}
                <ul className="mt-3 flex flex-col gap-3">
                  {customer.properties.map((p) => (
                    <li key={p.id} className="text-sm text-zinc-700">
                      {p.addressLine1}
                      {p.addressLine2 ? `, ${p.addressLine2}` : ""}
                      <br />
                      {p.city}, {p.state} {p.zip}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {customer.notes && (
            <Card title="Notes">
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{customer.notes}</p>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <RecordList
            title="Estimates"
            emptyLabel="No estimates yet."
            addHref={`/estimates/new?customerId=${customer.id}`}
            rows={customer.estimates.map((e) => ({
              id: e.id,
              primary: `Estimate #${e.number}`,
              secondary: e.status,
              date: e.createdAt,
              href: `/estimates/${e.id}`,
            }))}
          />
          <RecordList
            title="Invoices"
            emptyLabel="No invoices yet."
            rows={customer.invoices.map((i) => ({
              id: i.id,
              primary: `Invoice #${i.number}`,
              secondary: i.status,
              date: i.createdAt,
              href: `/invoices/${i.id}`,
            }))}
          />
          <RecordList
            title="Jobs"
            emptyLabel="No jobs yet."
            rows={customer.jobs.map((j) => ({
              id: j.id,
              primary: j.scheduledAt ? formatDate(j.scheduledAt) : "Unscheduled",
              secondary: j.status,
              date: j.createdAt,
              href: `/jobs/${j.id}`,
            }))}
          />
          {customer.dumpsterRentals.length > 0 && (
            <RecordList
              title="Dumpster Rentals"
              emptyLabel="No rentals yet."
              rows={customer.dumpsterRentals.map((r) => ({
                id: r.id,
                primary: r.scheduledDeliveryAt ? formatDate(r.scheduledDeliveryAt) : "Not scheduled",
                secondary: r.status,
                date: r.createdAt,
                href: `/dumpster-rentals/${r.id}`,
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-dark">
      {label}
    </span>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-900">
        {href ? (
          <a href={href} className="text-brand hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function RecordList({
  title,
  emptyLabel,
  addHref,
  rows,
}: {
  title: string;
  emptyLabel: string;
  addHref?: string;
  rows: { id: string; primary: string; secondary: string; date: Date; href: string }[];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {addHref && (
          <Link href={addHref} className="text-xs font-medium text-brand hover:underline">
            + Add
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="flex items-center justify-between py-2.5 text-sm hover:text-brand">
                <span className="font-medium text-zinc-900">{r.primary}</span>
                <span className="text-zinc-400">{r.secondary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
