"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendEmail } from "@/lib/mailgun";
import { COMPANY_PLAN_SELECT, PLATFORM_BRAND, isBranded } from "@/lib/plans";
import { logoUrlFor } from "@/lib/customer-messages";
import { SAMPLE_VARS, TEMPLATE_KEYS, buildEmailHtml, detailsFromVars, renderTemplateText, tidy, type TemplateContent, type TemplateKey, type Vars } from "@/lib/message-templates";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const isKey = (k: string): k is TemplateKey => (TEMPLATE_KEYS as string[]).includes(k);

export async function saveTemplate(key: string, input: TemplateContent): Promise<Result> {
  const { companyId, role } = await requireSession();
  if (role !== "ADMIN") return { ok: false, error: "Only an admin can change message templates." };
  if (!isKey(key)) return { ok: false, error: "Unknown template." };

  const emailSubject = String(input.emailSubject ?? "").trim();
  const emailHeadline = String(input.emailHeadline ?? "").trim();
  const emailBody = String(input.emailBody ?? "").trim();
  const smsBody = String(input.smsBody ?? "").trim();
  if (input.emailOn && (!emailSubject || !emailHeadline || !emailBody)) return { ok: false, error: "The email needs a subject, a headline and a message." };
  if (input.smsOn && !smsBody) return { ok: false, error: "The text message is empty." };
  if (emailSubject.length > 150 || emailHeadline.length > 100 || emailBody.length > 4000 || smsBody.length > 480) {
    return { ok: false, error: "That's too long. Subject 150, headline 100, email 4,000 and text 480 characters at most." };
  }

  const data = { emailOn: !!input.emailOn, emailSubject, emailHeadline, emailBody, smsOn: !!input.smsOn, smsBody };
  await prisma.messageTemplate.upsert({ where: { companyId_key: { companyId, key } }, create: { companyId, key, ...data }, update: data });
  revalidatePath("/settings/customer-requests");
  return { ok: true };
}

export async function resetTemplate(key: string): Promise<Result> {
  const { companyId, role } = await requireSession();
  if (role !== "ADMIN") return { ok: false, error: "Only an admin can change message templates." };
  if (!isKey(key)) return { ok: false, error: "Unknown template." };
  await prisma.messageTemplate.deleteMany({ where: { companyId, key } });
  revalidatePath("/settings/customer-requests");
  return { ok: true };
}

/** Sends the template, with sample details, to the signed-in user's own email so they can see it in a real inbox. */
export async function sendTestEmail(key: string, input: TemplateContent): Promise<Result> {
  const { companyId } = await requireSession();
  if (!isKey(key)) return { ok: false, error: "Unknown template." };
  const session = await getServerSession(authOptions);
  const to = session?.user?.email;
  if (!to) return { ok: false, error: "Your login has no email address." };

  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { id: true, name: true, phone: true, logoDataUrl: true, ...COMPANY_PLAN_SELECT } });
  const vars: Vars = { ...SAMPLE_VARS, company_name: company.name, company_phone: company.phone || SAMPLE_VARS.company_phone };
  const html = buildEmailHtml({
    companyName: company.name,
    logoUrl: logoUrlFor(company, isBranded(company)),
    headline: tidy(renderTemplateText(input.emailHeadline, vars)),
    body: renderTemplateText(input.emailBody, vars),
    details: detailsFromVars(vars),
    ctaLabel: "View my rental",
    ctaUrl: vars.rental_link,
    phone: company.phone,
    sentTo: to,
    poweredBy: isBranded(company) ? null : PLATFORM_BRAND,
  });
  try {
    await sendEmail({ to, fromName: company.name, companyId, subject: `[Test] ${tidy(renderTemplateText(input.emailSubject, vars))}`, text: tidy(renderTemplateText(input.emailBody, vars)), html });
  } catch (err) {
    console.error("[customer requests] test email failed", err);
    return { ok: false, error: "The test email couldn't be sent. Check your email setup in Settings." };
  }
  return { ok: true, message: `Test sent to ${to}.` };
}
