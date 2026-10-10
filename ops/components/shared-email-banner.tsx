import Link from "next/link";
import { SHARED_EMAIL_DAYS, SHARED_EMAIL_WARN_DAYS } from "@/lib/mail-config-constants";
import type { SharedEmailStatus } from "@/lib/mail-config";

/** Counts down the shared email sender, and says plainly when email has been paused. Nothing shows otherwise. */
export function SharedEmailBanner({ status }: { status: SharedEmailStatus }) {
  if (status.mode === "expired") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <span>
          <strong>Email is paused.</strong> Your {SHARED_EMAIL_DAYS}-day trial of the shared sender has ended. Connect your own Mailgun account to send estimates, invoices and messages again.
        </span>
        <Link href="/settings" className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
          Set up email
        </Link>
      </div>
    );
  }
  if (status.mode === "shared" && status.daysLeft <= SHARED_EMAIL_WARN_DAYS) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span>
          <strong>{status.daysLeft} day{status.daysLeft === 1 ? "" : "s"} left</strong> on the shared email sender. Connect your own Mailgun account before then so sending doesn&apos;t stop.
        </span>
        <Link href="/settings" className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900">
          Set up email
        </Link>
      </div>
    );
  }
  return null;
}
