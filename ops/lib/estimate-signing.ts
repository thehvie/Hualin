import { randomBytes } from "crypto";

export function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

export function estimateSigningUrl(token: string): string {
  const origin = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/e/${token}`;
}
