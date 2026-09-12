import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;

  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { properties: { take: 1, orderBy: { createdAt: "asc" } } },
    });
    if (!customer) {
      throw new Error("Customer not found");
    }
    const estimate = await prisma.estimate.create({
      data: {
        customerId: customer.id,
        propertyId: customer.properties[0]?.id,
      },
    });
    redirect(`/estimates/${estimate.id}`);
  }

  // No customer chosen yet -- show a picker.
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/estimates" className="hover:text-zinc-600">
            Estimates
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Who is this estimate for?</h1>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">No customers yet — add one first.</p>
          <Link href="/customers/new" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
            Add a customer
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/estimates/new?customerId=${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50"
              >
                <span>
                  <span className="font-medium text-zinc-900">
                    {c.firstName} {c.lastName}
                  </span>
                  {c.companyName && <span className="ml-2 text-sm text-zinc-400">{c.companyName}</span>}
                </span>
                <span className="text-sm text-zinc-400">{c.phone}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
