import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * File storage abstraction. Local disk by default; any S3-compatible cloud
 * storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO) when configured:
 *
 *   STORAGE_DRIVER=s3
 *   S3_BUCKET=...        S3_REGION=...   (region defaults to "auto")
 *   S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
 *   S3_ENDPOINT=...      (only for non-AWS providers, e.g. R2)
 */

export type StorageDriver = "local" | "s3";

const LOCAL_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "data", "uploads");

export function currentDriver(): StorageDriver {
  return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
}

let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return s3Client;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET is not configured");
  return b;
}

export function makeKey(userId: number, fileName: string): string {
  const safe = fileName.replace(/[^\w.֐-׿-]+/g, "_").slice(-80);
  return `${userId}/${crypto.randomUUID()}-${safe}`;
}

export async function saveFile(
  key: string,
  data: Buffer,
  contentType: string
): Promise<StorageDriver> {
  if (currentDriver() === "s3") {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
    return "s3";
  }
  const filePath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return "local";
}

export async function readFile(
  key: string,
  driver: StorageDriver
): Promise<Buffer> {
  if (driver === "s3") {
    const res = await s3().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key })
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return fs.readFile(path.join(LOCAL_DIR, key));
}

export async function deleteFile(
  key: string,
  driver: StorageDriver
): Promise<void> {
  if (driver === "s3") {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, key), { force: true });
}
