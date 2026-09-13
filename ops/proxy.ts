import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login and /signup (unauthenticated by definition)
     * - /book/* (public online-booking widget, embedded on the marketing site)
     * - /api/auth/* (NextAuth's own routes)
     * - /api/deploy-webhook, /api/stripe/webhook, /api/mailgun/inbound (server-to-server, no session cookie)
     * - Next.js internals and static assets
     */
    "/((?!login|signup|book|api/auth|api/deploy-webhook|api/stripe/webhook|api/mailgun/inbound|_next/static|_next/image|favicon.ico).*)",
  ],
};
