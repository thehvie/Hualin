import { prisma } from "@/lib/prisma";

/** A company may email and text customers once one of its people has confirmed their email address. */
export async function companyVerified(companyId: string): Promise<boolean> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { freeUnlimited: true } });
  if (company?.freeUnlimited) return true;
  return (await prisma.user.count({ where: { companyId, emailVerified: { not: null } } })) > 0;
}
