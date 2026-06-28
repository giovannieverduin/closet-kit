"use client";

// Normalize any uploaded image to a JPEG (Claude vision rejects AVIF/HEIC) and cap
// its dimensions. Crucially this also bakes EXIF orientation into the pixels, so a photo
// shot sideways/upside-down is stored upright regardless of the source — the resulting JPEG
// carries no orientation tag, so it renders the same everywhere (and in the bg-removal step).
// Returns base64 (for the vision API), a Blob (for upload), and a data URL (for preview).
export async function fileToJpeg(file: File, maxDim = 1600): Promise<{ base64: string; blob: Blob; dataUrl: string }> {
  // Orientation: decode through an <img> element and draw it to a canvas. Browsers auto-apply
  // EXIF orientation when an HTMLImageElement is drawn (`image-orientation: from-image` is the
  // default — Chrome, Firefox, and iOS/desktop Safari 13.4+), and naturalWidth/naturalHeight
  // already report the upright dimensions, so the canvas comes out the right way round.
  // We deliberately do NOT use createImageBitmap's `imageOrientation` option: Safari ignores it
  // (without throwing), which left photos stored sideways. The output JPEG carries no orientation
  // tag (canvas strips it), so it renders identically everywhere and through background removal.
  const srcDataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = srcDataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (Math.max(width, height) > maxDim) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  const base64 = dataUrl.split(",")[1];
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9));
  return { base64, blob, dataUrl };
}

// Rotate an image blob 90° clockwise, returning a new blob + data URL. Preserves transparency
// for cut-outs (png/webp); JPEG otherwise. Used by the manual "Rotate" control on Add, since
// browser EXIF auto-orientation can't be relied on (Chrome on Android leaves some photos sideways).
export async function rotate90(blob: Blob): Promise<{ blob: Blob; dataUrl: string }> {
  const srcDataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = srcDataUrl;
  });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = h; // swap dimensions for a quarter turn
  canvas.height = w;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0, w, h);

  const alpha = /png|webp/i.test(blob.type);
  const type = alpha ? "image/webp" : "image/jpeg";
  const out = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), type, 0.9));
  const dataUrl = canvas.toDataURL(type, 0.9);
  return { blob: out, dataUrl };
}

// Compress a (possibly transparent) image blob to a capped-dimension WebP, preserving
// alpha. Background removal returns a full-res transparent PNG that is often several MB —
// past Vercel's ~4.5MB serverless body limit, which 413s the upload — so shrink it first.
// Falls back to PNG (then the original) if the browser can't encode WebP.
export async function compressTransparent(blob: Blob, maxDim = 1400, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(blob);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (Math.max(width, height) > maxDim) {
    const s = maxDim / Math.max(width, height);
    width = Math.round(width * s);
    height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0, width, height); // canvas starts transparent, so alpha is kept

  const webp = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/webp", quality));
  if (webp && webp.size > 0) return webp;
  const png = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png"));
  return png && png.size > 0 ? png : blob;
}
