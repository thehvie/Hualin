import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Encrypts third-party secrets (a company's own Mailgun keys) before they're stored, so a database dump alone doesn't
// reveal them. AES-256-GCM. Set SECRETS_ENCRYPTION_KEY to a long random string (openssl rand -hex 32); without it the
// key is derived from NEXTAUTH_SECRET, which works but means rotating that secret makes stored keys unreadable.

function key(): Buffer {
  const material = process.env.SECRETS_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!material) throw new Error("No SECRETS_ENCRYPTION_KEY or NEXTAUTH_SECRET is set, so secrets can't be encrypted.");
  return createHash("sha256").update(material).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

/** Returns null (never throws) if the value is missing or can't be decrypted. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  try {
    const [version, iv, tag, data] = stored.split(":");
    if (version !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
