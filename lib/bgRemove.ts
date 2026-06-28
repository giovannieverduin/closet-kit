"use client";

// In-browser background removal via @imgly, loaded from CDN at runtime (webpackIgnore) so the
// heavy ML runtime is never bundled by Next. Returns a transparent-PNG Blob, or null on failure
// (the caller falls back to the original). The photo never leaves the device.
export async function removeBg(file: Blob): Promise<Blob | null> {
  try {
    // @ts-ignore runtime ESM module loaded from CDN, no local types
    const mod: any = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/+esm");
    const out = await mod.removeBackground(file);
    return out instanceof Blob ? out : null;
  } catch {
    return null;
  }
}
