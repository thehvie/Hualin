"use client";

import { useEffect, useState, useTransition } from "react";
import { getAvailableSlots, submitBooking } from "./actions";

const STEPS = ["Schedule", "Details", "Summary"] as const;
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

export function BookingWizard({
  companyId,
  companyName,
  serviceName,
}: {
  companyId: string;
  companyName: string;
  serviceName: string;
}) {
  const today = startOfDay(new Date());
  const [step, setStep] = useState(0);
  const [weekStart, setWeekStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<{ hour: number; label: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [contact, setContact] = useState<ContactInfo>({
    firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", zip: "", notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    setSlotsLoading(true);
    setSelectedHour(null);
    getAvailableSlots(companyId, selectedDate.toISOString()).then((result) => {
      setSlots(result);
      setSlotsLoading(false);
    });
  }, [companyId, selectedDate]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.set("firstName", contact.firstName);
    fd.set("lastName", contact.lastName);
    fd.set("email", contact.email);
    fd.set("phone", contact.phone);
    fd.set("address", contact.address);
    fd.set("city", contact.city);
    fd.set("state", contact.state);
    fd.set("zip", contact.zip);
    fd.set("notes", contact.notes);
    fd.set("dateIso", selectedDate.toISOString());
    fd.set("hour", String(selectedHour));

    startTransition(async () => {
      const res = await submitBooking(companyId, fd);
      if (!res.ok) {
        setError(res.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    });
  }

  const selectedSlotLabel = slots.find((s) => s.hour === selectedHour)?.label;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-3xl">✅</span>
        <h2 className="text-lg font-bold text-zinc-900">You&rsquo;re booked!</h2>
        <p className="max-w-sm text-sm text-zinc-500">
          {companyName} will see you on {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {selectedSlotLabel ? `, ${selectedSlotLabel}` : ""}. A confirmation has been noted on your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  i < step
                    ? "border-brand bg-brand text-white"
                    : i === step
                      ? "border-brand text-brand"
                      : "border-zinc-200 text-zinc-300"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium ${i === step ? "text-brand" : "text-zinc-400"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-10 bg-zinc-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      {/* Step 0: Schedule */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-900">When works best for you?</h3>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={isSameDay(weekStart, today)}
                  onClick={() => setWeekStart((w) => addDays(w, -7))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  onClick={() => setWeekStart((w) => addDays(w, 7))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const past = d < today;
                const selected = isSameDay(d, selectedDate);
                return (
                  <button
                    key={d.toISOString()}
                    disabled={past}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg py-2.5 text-sm ${
                      selected
                        ? "bg-brand text-white"
                        : past
                          ? "text-zinc-300"
                          : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <span className="text-xs uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="font-semibold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-zinc-400">Times are shown in {companyName}&rsquo;s local time.</p>

            <h4 className="mb-2 mt-4 text-sm font-semibold text-zinc-900">Select a visit time</h4>
            {slotsLoading ? (
              <p className="text-sm text-zinc-400">Loading times…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-zinc-400">No times available this day — try another date.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((s) => (
                  <button
                    key={s.hour}
                    onClick={() => setSelectedHour(s.hour)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                      selectedHour === s.hour
                        ? "border-brand bg-brand text-white"
                        : "border-zinc-300 text-zinc-700 hover:border-brand"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            disabled={selectedHour === null}
            onClick={() => setStep(1)}
            className="self-end rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-900">Please provide your contact info</h3>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name" value={contact.firstName} onChange={(v) => setContact({ ...contact, firstName: v })} required />
              <Field label="Last name" value={contact.lastName} onChange={(v) => setContact({ ...contact, lastName: v })} required />
              <Field label="Email address" type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} required />
              <Field label="Phone number" type="tel" value={contact.phone} onChange={(v) => setContact({ ...contact, phone: v })} required />
              <Field label="Address" value={contact.address} onChange={(v) => setContact({ ...contact, address: v })} required />
              <Field label="City" value={contact.city} onChange={(v) => setContact({ ...contact, city: v })} required />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  value={contact.state}
                  onChange={(e) => setContact({ ...contact, state: e.target.value })}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
                >
                  <option value="">Select…</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Field label="Zip code" value={contact.zip} onChange={(v) => setContact({ ...contact, zip: v })} required />
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">What do you need hauled away? (optional)</label>
              <textarea
                rows={3}
                value={contact.notes}
                onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                placeholder="Add your description here…"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Back
            </button>
            <button
              disabled={
                !contact.firstName || !contact.lastName || !contact.email || !contact.phone ||
                !contact.address || !contact.city || !contact.state || !contact.zip
              }
              onClick={() => setStep(2)}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Summary */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-zinc-900">Review your appointment</h3>
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service</p>
              <p className="text-zinc-900">{serviceName} with {companyName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">When</p>
              <p className="text-zinc-900">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {selectedSlotLabel ? `, ${selectedSlotLabel}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Contact</p>
              <p className="text-zinc-900">{contact.firstName} {contact.lastName}</p>
              <p className="text-zinc-500">{contact.email} · {contact.phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Address</p>
              <p className="text-zinc-900">{contact.address}, {contact.city}, {contact.state} {contact.zip}</p>
            </div>
            {contact.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
                <p className="text-zinc-900">{contact.notes}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              Back
            </button>
            <button
              disabled={isPending}
              onClick={handleSubmit}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {isPending ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
      />
    </div>
  );
}
