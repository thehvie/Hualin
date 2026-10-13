// Colors and names for map pins. Plain constants, so both the map (client) and the page legend (server) can use them.
export type PinKind = "job" | "delivery" | "pickup" | "overdue" | "onsite";

export const PIN_STYLE: Record<PinKind, { color: string; label: string }> = {
  job: { color: "#2563eb", label: "Job" },
  delivery: { color: "#16a34a", label: "Drop-off" },
  pickup: { color: "#f97316", label: "Pickup" },
  overdue: { color: "#dc2626", label: "Overdue" },
  onsite: { color: "#0ea5e9", label: "On site" },
};
