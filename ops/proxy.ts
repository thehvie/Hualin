import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login (the sign-in page itself)
     * - /api/auth/* (NextAuth's own routes)
     * - /api/deploy-webhook (GitHub deploy webhook, unauthenticated by design)
     * - Next.js internals and static assets
     */
    "/((?!login|api/auth|api/deploy-webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};
