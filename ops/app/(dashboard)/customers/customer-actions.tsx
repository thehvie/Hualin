"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteCustomer, setCustomerArchived } from "./actions";

/** Archive or restore, and delete. Delete is refused for customers with history. `goBack` returns to the list after. */
export function CustomerActions({ id, name, archived, goBack = false, className = "" }: { id: string; name: string; archived: boolean; goBack?: boolean; className?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const res = await setCustomerArchived(id, !archived);
      if (!res.ok) alert(res.error);
      else if (goBack && !archived) router.push("/customers");
    });
  }

  function remove() {
    if (!confirm(`Delete ${name}? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (!res.ok) alert(res.error);
      else if (goBack) router.push("/customers");
    });
  }

  return (
    <div className={`flex items-center gap-3 text-xs font-medium ${className}`}>
      <button type="button" disabled={pending} onClick={toggle} className="text-zinc-600 hover:text-zinc-900 disabled:opacity-50">
        {archived ? "Restore" : "Archive"}
      </button>
      <button type="button" disabled={pending} onClick={remove} className="text-red-500 hover:text-red-700 disabled:opacity-50">
        Delete
      </button>
    </div>
  );
}
