"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { AssignMap, type MapDriver } from "@/components/assign-map";
import { assignTask } from "../assign-actions";
import type { DispatchTask } from "@/lib/dispatch-tasks";

export interface BoardDriver extends MapDriver {
  vehicle: string | null;
}

const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function TaskChip({ t }: { t: DispatchTask }) {
  const label = t.kind === "DELIVERY" ? "Drop-off" : t.swap ? "Swap pickup" : "Pickup";
  const tone = t.kind === "DELIVERY" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800";
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{label}</span>
      {t.requested && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-800">Requested</span>}
      {t.overdue && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">Overdue</span>}
    </span>
  );
}

/** The dispatch map screen: unassigned stops and drivers on the left, the day's map on the right. */
export function AssignBoard({
  tasks,
  drivers,
  office,
  usageRef,
  canEdit,
}: {
  tasks: DispatchTask[];
  drivers: BoardDriver[];
  office: { lat: number; lng: number } | null;
  usageRef: string;
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => Object.fromEntries(tasks.map((t) => [t.id, t.driverId])));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openDriver, setOpenDriver] = useState<string | null>(null);
  const [overDriver, setOverDriver] = useState<string | null>(null);
  const [taskQuery, setTaskQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const match = (t: DispatchTask, q: string) => !q.trim() || `${t.customer} ${t.unit} ${t.address ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());

  const unassigned = tasks.filter((t) => !assignments[t.id] && match(t, taskQuery));
  const unassignedTotal = tasks.filter((t) => !assignments[t.id]).length;
  const shownDrivers = drivers.filter((d) => !driverQuery.trim() || `${d.name} ${d.vehicle ?? ""}`.toLowerCase().includes(driverQuery.trim().toLowerCase()));

  function assign(taskId: string, driverId: string | null) {
    const t = byId.get(taskId);
    if (!t || !canEdit || (assignments[taskId] ?? null) === driverId) return;
    const previous = assignments[taskId] ?? null;
    setError(null);
    setAssignments((a) => ({ ...a, [taskId]: driverId }));
    if (driverId) setOpenDriver(driverId);
    start(async () => {
      const res = await assignTask(t.bookingId, t.kind, driverId);
      if (!res.ok) {
        setAssignments((a) => ({ ...a, [taskId]: previous }));
        setError(res.error);
      }
    });
  }

  const select = (id: string) => {
    setSelectedId(id);
    document.getElementById(`task-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const taskCard = (t: DispatchTask) => (
    <li
      key={t.id}
      id={`task-${t.id}`}
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", t.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => setSelectedId(t.id)}
      className={`flex cursor-pointer flex-col gap-1.5 rounded-lg border bg-white p-2.5 text-sm ${selectedId === t.id ? "border-brand ring-1 ring-brand" : "border-zinc-200"} ${canEdit ? "active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <TaskChip t={t} />
          <p className="mt-1 truncate font-semibold text-zinc-900">{t.customer}</p>
          <p className="truncate text-xs text-zinc-600">{t.unit}</p>
        </div>
        <Link href={t.href} onClick={(e) => e.stopPropagation()} className="shrink-0 text-xs font-medium text-zinc-400 hover:text-brand">
          Open
        </Link>
      </div>
      <p className="text-xs font-semibold text-orange-700">{t.when}</p>
      <p className={`truncate text-xs ${t.address ? "text-zinc-500" : "text-amber-700"}`}>{t.address ?? "No address, so no pin"}</p>
      {canEdit && (
        <select
          aria-label={`Assign ${t.customer}`}
          value={assignments[t.id] ?? ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => assign(t.id, e.target.value || null)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
        >
          <option value="">Unassigned</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {drivers.length === 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You haven&apos;t added any drivers yet.{" "}
          <Link href="/drivers" className="font-semibold underline">
            Add drivers
          </Link>{" "}
          to assign stops to them.
        </p>
      )}

      <div className="grid gap-4 lg:h-[calc(100vh-15rem)] lg:min-h-[520px] lg:grid-cols-[280px_280px_1fr]">
        <section className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Unassigned tasks</h2>
          <p className="mb-2 text-xs text-zinc-500">
            {unassignedTotal} task{unassignedTotal === 1 ? "" : "s"}
          </p>
          <input value={taskQuery} onChange={(e) => setTaskQuery(e.target.value)} placeholder="Search…" className={input} />
          <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {unassigned.length === 0 ? <li className="py-6 text-center text-xs text-zinc-400">{unassignedTotal === 0 ? "Everything is assigned." : "No matches."}</li> : unassigned.map(taskCard)}
          </ul>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Drivers</h2>
          <p className="mb-2 text-xs text-zinc-500">
            {drivers.length} driver{drivers.length === 1 ? "" : "s"}. Drag a task onto one.
          </p>
          <input value={driverQuery} onChange={(e) => setDriverQuery(e.target.value)} placeholder="Search…" className={input} />
          <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {shownDrivers.map((d) => {
              const mine = tasks.filter((t) => assignments[t.id] === d.id);
              const open = openDriver === d.id;
              return (
                <li
                  key={d.id}
                  onDragOver={(e) => {
                    if (canEdit) {
                      e.preventDefault();
                      setOverDriver(d.id);
                    }
                  }}
                  onDragLeave={() => setOverDriver((o) => (o === d.id ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOverDriver(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) assign(id, d.id);
                  }}
                  className={`rounded-lg border bg-white ${overDriver === d.id ? "border-brand ring-2 ring-brand/30" : "border-zinc-200"}`}
                >
                  <button type="button" onClick={() => setOpenDriver(open ? null : d.id)} className="flex w-full items-center gap-2.5 p-2.5 text-left">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: d.color }} aria-hidden>
                      {d.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zinc-900">{d.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{mine.length === 0 ? "No tasks" : `${mine.length} task${mine.length === 1 ? "" : "s"}`}{d.vehicle ? ` · ${d.vehicle}` : ""}</span>
                    </span>
                    <span className="text-zinc-400" aria-hidden>
                      {open ? "⌃" : "›"}
                    </span>
                  </button>
                  {open && mine.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-zinc-100 p-2">
                      {mine.map(taskCard)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="min-h-[360px]">
          <AssignMap tasks={tasks} assignments={assignments} drivers={drivers} office={office} selectedId={selectedId} onSelect={select} usageRef={usageRef} />
        </section>
      </div>

      {drivers.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-bold text-white">D</span> Drop-off
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-600 text-[9px] font-bold text-white">P</span> Pickup
          </span>
          <span className="text-zinc-400">Pins take their driver&apos;s colour. Dark grey is unassigned.</span>
          {drivers.map((d) => (
            <span key={d.id} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: driverById.get(d.id)?.color }} />
              {d.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
