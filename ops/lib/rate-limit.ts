import { headers } from "next/headers";

/**
 * Small in-memory sliding-window rate limiter for the public (unauthenticated)
 * endpoints. State lives in this process, which is fine for the single PM2
 * instance we run; if we ever scale to several instances or restart often,
 * move the counters to Redis/Postgres.
 */
const hits = new Map<string, number[]>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const cutoff = now - 24 * 60 * 60 * 1000;
  for (const [key, times] of hits) {
    const recent = times.filter((t) => t > cutoff);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}

/** Records a hit and reports whether it is within `limit` hits per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  const times = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
  if (times.length >= limit) {
    hits.set(key, times);
    return { ok: false, retryAfterSec: Math.ceil((times[0] + windowMs - now) / 1000) };
  }
  times.push(now);
  hits.set(key, times);
  return { ok: true, retryAfterSec: 0 };
}

/**
 * Best-effort client IP. Only trustworthy behind our own reverse proxy
 * (nginx/Cloudflare set X-Forwarded-For); direct hits can spoof it.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
