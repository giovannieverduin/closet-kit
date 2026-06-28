import { list } from "@vercel/blob";

export type Ref = { url: string; pathname: string };

// The server-side reference photo for try-on: stored under "reference/", newest wins.
export async function getReference(): Promise<Ref | null> {
  try {
    const { blobs } = await list({ prefix: "reference/", limit: 20 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    return { url: blobs[0].url, pathname: blobs[0].pathname };
  } catch {
    return null;
  }
}

export async function getReferenceUrl(): Promise<string | null> {
  return (await getReference())?.url ?? null;
}

// Resolve one of our Blob objects by its pathname (for the gated image proxy).
export async function blobUrlForPath(pathname: string): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    return blobs[0]?.url ?? null;
  } catch {
    return null;
  }
}
