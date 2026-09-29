"use client";

import { useState, useTransition } from "react";
import { saveServicePlan } from "./actions";
import { BILLING_FREQUENCY_LABELS, cyclesForFrequency } from "@/lib/service-plans";
import { formatCents } from "@/lib/money";

type DurationUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";

interface BillingOptionData {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  discountPercent: number | null;
  amountCents: number;
}

export interface ServicePlanData {
  id: string;
  name: string;
  scopeOfWork: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
  autoRenew: boolean;
  visitsPerPeriod: number;
  jobTypeId: string | null;
  priceCents: number;
  billingOptions: BillingOptionData[];
}

interface JobTypeOption {
  id: string;
  name: string;
}

function centsToStr(cents: number) {
  return (cents / 100).toFixed(2);
}

export function CreatePlanButton({ jobTypes }: { jobTypes: JobTypeOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + Create new plan
      </button>
      {open && <PlanModal jobTypes={jobTypes} onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditPlanTrigger({
  plan,
  jobTypes,
  children,
}: {
  plan: ServicePlanData;
  jobTypes: JobTypeOption[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full text-left">
        {children}
      </button>
      {open && <PlanModal plan={plan} jobTypes={jobTypes} onClose={() => setOpen(false)} />}
    </>
  );
}

function PlanModal({
  plan,
  jobTypes,
  onClose,
}: {
  plan?: ServicePlanData;
  jobTypes: JobTypeOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [durationValue, setDurationValue] = useState(plan?.durationValue ?? 1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(plan?.durationUnit ?? "YEAR");
  const [priceCents, setPriceCents] = useState(plan?.priceCents ?? 0);
  const [billingOptions, setBillingOptions] = useState<{ frequency: BillingOptionData["frequency"]; discountPercent: string }[]>(
    plan?.billingOptions.map((b) => ({ frequency: b.frequency, discountPercent: b.discountPercent != null ? String(b.discountPercent) : "" })) ?? [
      { frequency: "ANNUALLY", discountPercent: "" },
    ],
  );

  function addBillingOption() {
    const used = new Set(billingOptions.map((b) => b.frequency));
    const next = (["ANNUALLY", "QUARTERLY", "MONTHLY", "WEEKLY", "DAILY"] as const).find((f) => !used.has(f));
    if (!next) return;
    setBillingOptions((prev) => [...prev, { frequency: next, discountPercent: "" }]);
  }

  function removeBillingOption(i: number) {
    setBillingOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(fd: FormData) {
    setError(null);
    fd.set(
      "billingOptions",
      JSON.stringify(
        billingOptions.map((b) => ({
          frequency: b.frequency,
          discountPercent: b.discountPercent ? parseInt(b.discountPercent, 10) : null,
        })),
      ),
    );
    startTransition(async () => {
      const res = await saveServicePlan(plan?.id ?? null, fd);
      if (!res.ok) {
        setError(res.error || "Could not save plan.");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{plan ? "Edit plan" : "Create new plan"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Field label="Plan name" name="name" defaultValue={plan?.name} placeholder="Example plan" required />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Scope of work</label>
            <textarea
              name="scopeOfWork"
              defaultValue={plan?.scopeOfWork ?? ""}
              rows={3}
              placeholder={"- Line 1\n- Line 2"}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
            />
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <h3 className="mb-2 text-sm font-bold text-zinc-900">Plan duration</h3>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-zinc-700">Service period</label>
              <div className="flex gap-2">
                <input
                  name="durationValue"
                  type="number"
                  min={1}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                />
                <select
                  name="durationUnit"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                >
                  <option value="DAY">Day</option>
                  <option value="WEEK">Week</option>
                  <option value="MONTH">Month</option>
                  <option value="YEAR">Year</option>
                </select>
              </div>
            </div>
            <label className="mt-3 flex items-center justify-between text-sm text-zinc-700">
              Renew automatically
              <Toggle name="autoRenew" defaultChecked={plan?.autoRenew ?? true} />
            </label>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <h3 className="mb-2 text-sm font-bold text-zinc-900">Number of visits</h3>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-zinc-700">Visits within service period</label>
              <input
                name="visitsPerPeriod"
                type="number"
                min={1}
                defaultValue={plan?.visitsPerPeriod ?? 1}
                className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Job type</label>
              <select
                name="jobTypeId"
                defaultValue={plan?.jobTypeId ?? ""}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              >
                <option value="">Select job type</option>
                {jobTypes.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Plan price</h3>
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={centsToStr(priceCents)}
                onChange={(e) => setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))}
                className="w-28 rounded-lg border border-zinc-300 px-2 py-1.5 text-right text-sm font-semibold outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span>Billing options</span>
              <span>Discount %</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {billingOptions.map((b, i) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                <select
                  value={b.frequency}
                  onChange={(e) =>
                    setBillingOptions((prev) =>
                      prev.map((opt, idx) => (idx === i ? { ...opt, frequency: e.target.value as BillingOptionData["frequency"] } : opt)),
                    )
                  }
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                >
                  {(Object.keys(BILLING_FREQUENCY_LABELS) as BillingOptionData["frequency"][]).map((f) => (
                    <option key={f} value={f}>{BILLING_FREQUENCY_LABELS[f]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Optional"
                  value={b.discountPercent}
                  onChange={(e) =>
                    setBillingOptions((prev) => prev.map((opt, idx) => (idx === i ? { ...opt, discountPercent: e.target.value } : opt)))
                  }
                  className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                />
                <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-right text-sm text-zinc-600">
                  {formatCents(Math.round(priceCents / cyclesForFrequency(durationValue, durationUnit, b.frequency)) || 0)}
                </div>
                {billingOptions.length > 1 ? (
                  <button type="button" onClick={() => removeBillingOption(i)} className="text-zinc-400 hover:text-red-500">
                    ✕
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {billingOptions.length < 3 && (
              <button
                type="button"
                onClick={addBillingOption}
                className="mt-3 w-full rounded-lg border border-brand/40 py-2 text-sm font-medium text-brand hover:bg-brand/5"
              >
                + Add another billing option
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-2 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {plan ? "Save changes" : "Create plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

function Toggle({ name, defaultChecked }: { name: string; defaultChecked?: boolean }) {
  return (
    <span className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-brand" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  );
}
