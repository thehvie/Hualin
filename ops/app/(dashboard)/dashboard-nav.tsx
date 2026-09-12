"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_SECTIONS = [
  {
    items: [{ label: "Home", href: "/" }],
  },
  {
    title: "CRM & Billing",
    items: [
      { label: "Customers", href: "/customers" },
      { label: "Estimates", href: "/estimates" },
      { label: "Invoices", href: "/invoices" },
      { label: "Price Book", href: "/price-book" },
    ],
  },
  {
    title: "Scheduling & Dispatch",
    items: [
      { label: "Schedule", href: "/schedule" },
      { label: "Jobs", href: "/jobs" },
      { label: "Map", href: "/map" },
      { label: "Dumpster Rentals", href: "/dumpster-rentals" },
      { label: "Equipment", href: "/equipment" },
      { label: "Purchase Orders", href: "/purchase-orders" },
    ],
  },
  {
    title: "Growth",
    items: [
      { label: "Online Booking", href: "/online-booking" },
      { label: "Automations", href: "/automations" },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/reports" }],
  },
];

export function DashboardNav({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile topbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="text-sm font-bold text-zinc-900">{companyName}</span>
        <div className="w-9" />
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 -translate-x-full flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-5">
          <div>
            <span className="text-base font-bold text-zinc-900">{companyName}</span>
            <span className="block text-xs font-medium text-zinc-400">Ops</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className="mb-5">
              {section.title && (
                <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-brand/10 text-brand-dark"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 px-5 py-4">
          <p className="truncate text-sm font-medium text-zinc-900">
            {session?.user?.name || session?.user?.email}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
