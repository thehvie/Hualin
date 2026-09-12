import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Deliberately does NOT augment next-auth's `User` interface: @auth/prisma-adapter
// ships its own nested copy of @auth/core with its own AdapterUser type, and
// widening the shared `User` interface here makes that adapter's internal
// getUser/getUserByEmail return types stop structurally matching it. Session
// and JWT aren't touched by the adapter's types, so augmenting only those is
// safe — `authorize()`/`jwt()` in lib/auth.ts still use a local cast for the
// extra fields on the raw user object, same as before this file existed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      companyId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    companyId: string;
  }
}
