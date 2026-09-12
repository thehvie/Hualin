import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { AddItemButton, EditItemTrigger } from "./item-modal";

export default async function PriceBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await requireSession();
  const { q } = await searchParams;
  const query = (q || "").trim();

  const items = await prisma.priceBookItem.findMany({
    where: {
      companyId,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { modelNumber: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { number: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Price Book</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Organize and manage your business offerings and pricing so estimates and invoices
              pull from consistent, reusable items.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex" method="get">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search price book…"
            className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </form>
        <AddItemButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <span className="text-3xl">📖</span>
          <p className="text-sm font-semibold text-zinc-900">
            {query ? "No items match your search" : "Price book is empty"}
          </p>
          <p className="text-xs text-zinc-400">Add items so estimates can pull from them.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <EditItemTrigger item={item}>
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-zinc-900">{item.name}</span>
                    <span className="font-medium text-zinc-900">{formatCents(item.unitPriceCents)}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    #{item.number} · {item.type === "SERVICE" ? "Service" : "Product"}
                    {item.category ? ` · ${item.category}` : ""}
                    {!item.active ? " · Inactive" : ""}
                  </p>
                </EditItemTrigger>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Id</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Model #</th>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => (
                  <tr key={item.id} className={`hover:bg-zinc-50 ${!item.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 text-zinc-500">
                      <EditItemTrigger item={item}>
                        <span>{1000 + item.number - 1}</span>
                      </EditItemTrigger>
                    </td>
                    <td className="px-4 py-3">
                      <EditItemTrigger item={item}>
                        <span className="font-medium text-zinc-900 hover:text-brand">{item.name}</span>
                      </EditItemTrigger>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-500">
                      {item.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">{formatCents(item.unitPriceCents)}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {item.costCents != null ? formatCents(item.costCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {item.type === "SERVICE" ? "Service" : "Product"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.category || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{item.modelNumber || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{item.bookable ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-zinc-600">{item.active ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
