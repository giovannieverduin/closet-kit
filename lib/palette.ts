// Pure: bucket RGBA pixels into coarse bins and return the top-k as hex.
export function dominantColours(px: Uint8ClampedArray, k = 4): string[] {
  const counts = new Map<string, number>();
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue; // skip transparent
    const r = Math.min(Math.round(px[i] / 16) * 16, 255);
    const g = Math.min(Math.round(px[i + 1] / 16) * 16, 255);
    const b = Math.min(Math.round(px[i + 2] / 16) * 16, 255);
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([key]) => "#" + key.split(",").map((n) => Number(n).toString(16).padStart(2, "0")).join(""));
}

// Browser-only: draw an <img> to a canvas and extract its palette.
export function extractPaletteFromImage(img: HTMLImageElement, k = 4): string[] {
  const size = 48;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  return dominantColours(ctx.getImageData(0, 0, size, size).data, k);
}
