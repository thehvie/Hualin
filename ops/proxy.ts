import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login and /signup (unauthenticated by definition)
     * - /e/* (customer estimate-signing links, unguessable token)
     * - /book/* (public online-booking widget, embedded on the marketing site)
     * - /api/auth/* (NextAuth's own routes)
     * - /service-plans/subscribe/[id]/success (customer lands here after Stripe Checkout)
     * - /api/deploy-webhook, /api/stripe/webhook, /api/stripe/service-plans/webhook, /api/mailgun/inbound (server-to-server, no session cookie)
     * - Next.js internals and static assets
     */
    "/((?!login|signup|book|e/|api/auth|api/deploy-webhook|api/stripe/webhook|api/stripe/service-plans/webhook|service-plans/subscribe/[^/]+/success|api/mailgun/inbound|_next/static|_next/image|favicon.ico).*)",
  ],
};
