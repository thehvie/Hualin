import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login and /signup (unauthenticated by definition)
     * - /e/*, /i/* and /po/* (customer estimate/invoice links and vendor PO downloads, unguessable token)
     * - /book/* (public online-booking widget, embedded on the marketing site)
     * - /api/auth/* (NextAuth's own routes)
     * - /service-plans/subscribe/[id]/success (customer lands here after Stripe Checkout)
     * - /api/deploy-webhook, /api/stripe/webhook, /api/stripe/service-plans/webhook, /api/mailgun/inbound, /api/twilio/inbound, /api/cron/* (server-to-server, no session cookie; cron routes check CRON_SECRET)
     * - Next.js internals and static assets
     */
    "/((?!login|signup|book|e/|i/|po/|api/auth|api/deploy-webhook|api/stripe/webhook|api/stripe/service-plans/webhook|service-plans/subscribe/[^/]+/success|api/mailgun/inbound|api/twilio/inbound|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
