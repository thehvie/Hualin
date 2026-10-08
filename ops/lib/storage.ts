import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// File storage on DigitalOcean Spaces (S3-compatible; the AWS SDK is just the client library, no AWS account).
// Set DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_REGION (e.g. nyc3) and DO_SPACES_BUCKET to turn it on. Without them
// callers fall back to storing file bytes in the database, so development works with no setup.

let client: S3Client | null = null;

export function spacesConfigured(): boolean {
  return !!(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET && process.env.DO_SPACES_REGION && process.env.DO_SPACES_BUCKET);
}

function s3(): S3Client {
  if (!client) {
    const region = process.env.DO_SPACES_REGION!;
    client = new S3Client({
      region,
      endpoint: `https://${region}.digitaloceanspaces.com`,
      credentials: { accessKeyId: process.env.DO_SPACES_KEY!, secretAccessKey: process.env.DO_SPACES_SECRET! },
    });
  }
  return client;
}

const bucket = () => process.env.DO_SPACES_BUCKET!;

/** Stores a private object (never public; it is only reachable through signed links). */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType, ACL: "private" }));
}

export async function getObjectBytes(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** A link that works for a few minutes. Photos display inline; everything else downloads. */
export async function signedDownloadUrl(key: string, filename: string, inline: boolean, contentType: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: inline ? contentType : "application/octet-stream",
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
    }),
    { expiresIn: 300 },
  );
}
