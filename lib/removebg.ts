// Server-side background removal via remove.bg. Optional: if REMOVE_BG_API_KEY is set,
// returns the subject composited on white; otherwise returns null (store the photo as-is).
export async function removeBackgroundWhite(input: Buffer, contentType: string): Promise<Buffer | null> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return null;

  const form = new FormData();
  form.append("image_file", new Blob([input], { type: contentType }), "image.jpg");
  form.append("size", "auto");
  form.append("bg_color", "ffffff");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": key },
    body: form
  });
  if (!res.ok) throw new Error(`remove.bg failed (${res.status}): ${await res.text().catch(() => "")}`);
  return Buffer.from(await res.arrayBuffer());
}
