import { requireSession } from "@/lib/session";
import { CopySnippet } from "./copy-snippet";

export default async function OnlineBookingPage() {
  const { companyId } = await requireSession();

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const bookingUrl = `${baseUrl}/book/${companyId}`;
  const embedCode = `<iframe src="${bookingUrl}" width="100%" height="900" style="border:0;max-width:640px" title="Book an appointment"></iframe>`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Online Booking</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Let customers book an appointment straight from your website. They pick an open time slot, and it lands
          on your Schedule automatically.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Your booking page</h2>
        <p className="mb-3 text-sm text-zinc-500">Share this link directly, or embed it on your website below.</p>
        <CopySnippet value={bookingUrl} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Embed on your website</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Paste this snippet into a page on your site (e.g. a &ldquo;Book Now&rdquo; page):
        </p>
        <CopySnippet value={embedCode} multiline />
      </div>
    </div>
  );
}
