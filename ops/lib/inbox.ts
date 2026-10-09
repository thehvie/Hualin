import { prisma } from "@/lib/prisma";

/** Customer messages nobody has opened yet, across every estimate, invoice, and loose text. */
export function unreadMessageCount(companyId: string) {
  return prisma.communication.count({ where: { companyId, direction: "INBOUND", readAt: null } });
}
