"use client";

import { useTransition } from "react";
import { deletePriceBookItem, setPriceBookItemActive } from "./actions";

/** Archive or restore, and delete, straight from the list. Delete is refused for items already in use. */
export function RowActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setPriceBookItemActive(id, !active);
      if (!res.ok) alert(res.error);
    });
  }

  function remove() {
    if (!confirm(`Delete "${name}" from the Price Book? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deletePriceBookItem(id);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      <button type="button" disabled={pending} onClick={toggle} className="text-zinc-600 hover:text-zinc-900 disabled:opacity-50">
        {active ? "Archive" : "Restore"}
      </button>
      <button type="button" disabled={pending} onClick={remove} className="text-red-500 hover:text-red-700 disabled:opacity-50">
        Delete
      </button>
    </div>
  );
}
