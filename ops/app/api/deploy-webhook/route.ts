import { spawn } from "node:child_process";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

// GitHub webhook receiver. On a push to main, spawns deploy.sh in the
// background and returns immediately so GitHub doesn't time out.
// Configure DEPLOY_WEBHOOK_SECRET in .env and enter the same value as the
// "Secret" field on the GitHub webhook.

export async function POST(req: NextRequest) {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signatureHeader = req.headers.get("x-hub-signature-256");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const data = JSON.parse(payload) as { ref?: string };
  if (data.ref !== "refs/heads/main") {
    return NextResponse.json({ message: "Ignored: not a push to main" });
  }

  const deployScript = path.join(process.cwd(), "deploy", "deploy.sh");
  const child = spawn("bash", [deployScript], {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd(),
  });
  child.unref();

  return NextResponse.json({ message: "Deploy triggered" });
}
