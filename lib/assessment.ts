// Server-side persistence for the user's uploaded colour assessment.
// Stored as a single JSON blob (newest wins), mirroring lib/reference.ts.
// Falls back to the example DEFAULT_ASSESSMENT until the user uploads their own.
import { list, put, del } from "@vercel/blob";
import { DEFAULT_ASSESSMENT, type ColorAssessment } from "./profile";

const PREFIX = "assessment/";

export async function getSavedAssessment(): Promise<ColorAssessment | null> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 20 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ColorAssessment;
  } catch {
    return null;
  }
}

// The assessment to show: the user's uploaded one, or the example default.
export async function resolveAssessment(): Promise<{ assessment: ColorAssessment; custom: boolean }> {
  const saved = await getSavedAssessment();
  return saved ? { assessment: saved, custom: true } : { assessment: DEFAULT_ASSESSMENT, custom: false };
}

export async function clearAssessment(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 100 });
    await Promise.all(blobs.map((b) => del(b.url)));
  } catch {
    /* ignore — nothing to clear */
  }
}

export async function saveAssessment(a: ColorAssessment): Promise<void> {
  await clearAssessment(); // keep only the newest
  await put(`${PREFIX}current.json`, JSON.stringify(a), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true,
  });
}
