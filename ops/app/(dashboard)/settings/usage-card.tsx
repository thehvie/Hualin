import { MAX_COMPANY_ATTACHMENT_BYTES, formatBytes } from "@/lib/comm-attachment-constants";
import { OVERAGE_CAP_CENTS, OVERAGE_MARKUP, SERVICE_LABELS, formatMicros, type UsageStatus } from "@/lib/usage";

export function UsageCard({ usage, storageUsedBytes }: { usage: UsageStatus; storageUsedBytes: number }) {
  const pct = Math.min(100, Math.round((usage.usedMicros / usage.includedMicros) * 100));
  const over = usage.usedMicros > usage.includedMicros;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">AI and map usage this month</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Voice features, address lookups, routes and maps. {formatMicros(usage.includedMicros)} is included each month. Usage beyond that is billed at cost plus{" "}
          {Math.round((OVERAGE_MARKUP - 1) * 100)}% on your next invoice, up to ${OVERAGE_CAP_CENTS / 100}, then these features pause until the 1st.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-zinc-900">
            {formatMicros(usage.usedMicros)} <span className="font-normal text-zinc-500">of {formatMicros(usage.includedMicros)} included</span>
          </span>
          {over && <span className="text-xs font-medium text-amber-700">Overage so far: ${(usage.overageCents / 100).toFixed(2)}</span>}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
          <div className={`h-full rounded-full ${over ? "bg-amber-500" : "bg-brand"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {usage.capped && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          You&apos;ve reached this month&apos;s usage limit, so voice features and maps are paused until the 1st.
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Email attachment storage: {formatBytes(storageUsedBytes)} of {formatBytes(MAX_COMPANY_ATTACHMENT_BYTES)} used.
      </p>

      {usage.byService.length > 0 && (
        <ul className="divide-y divide-zinc-100 text-sm">
          {usage.byService.map((s) => (
            <li key={s.service} className="flex justify-between py-1.5">
              <span className="text-zinc-700">{SERVICE_LABELS[s.service] ?? s.service}</span>
              <span className="text-zinc-500">
                {s.count} {s.count === 1 ? "use" : "uses"} · {formatMicros(s.costMicros)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
