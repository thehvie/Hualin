import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getTextUsage } from "@/lib/plan-access";
import { COMPANY_PLAN_SELECT, PLATFORM_BRAND, isBranded } from "@/lib/plans";
import { logoUrlFor } from "@/lib/customer-messages";
import { TEMPLATES, TEMPLATE_KEYS } from "@/lib/message-templates";
import { TemplateEditor } from "./template-editor";

export default async function CustomerRequestsPage() {
  const { companyId, role } = await requireSession();
  const [company, rows, texts] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { id: true, name: true, phone: true, logoDataUrl: true, ...COMPANY_PLAN_SELECT } }),
    prisma.messageTemplate.findMany({ where: { companyId } }),
    getTextUsage(companyId),
  ]);
  const saved = new Map(rows.map((r) => [r.key, r]));
  const branded = isBranded(company);
  const preview = { name: company.name, phone: company.phone, logoUrl: logoUrlFor(company, branded), poweredBy: branded ? null : PLATFORM_BRAND };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-zinc-400 hover:text-zinc-700">
          ← Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Customer messages</h1>
        <p className="mt-1 text-sm text-zinc-500">
          What customers are told when they ask for a pickup, more time or a swap on their rental page, and the review request sent after they pay. Each message can go by email, by text, or both. Your logo and phone number are added automatically.
        </p>
      </div>

      {TEMPLATE_KEYS.map((key) => {
        const row = saved.get(key);
        const def = TEMPLATES[key];
        return (
          <TemplateEditor
            key={key}
            def={def}
            initial={row ? { emailOn: row.emailOn, emailSubject: row.emailSubject, emailHeadline: row.emailHeadline, emailBody: row.emailBody, smsOn: row.smsOn, smsBody: row.smsBody } : def.defaults}
            isCustom={!!row}
            canText={texts.enabled}
            canEdit={role === "ADMIN"}
            company={preview}
          />
        );
      })}
    </div>
  );
}
