import "server-only";
import { del } from "@vercel/blob";

const VERCEL_BLOB_HOST_RE = /\.vercel-storage\.com$/;

export function isValidBlobUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === "https:" && VERCEL_BLOB_HOST_RE.test(hostname);
  } catch {
    return false;
  }
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}
