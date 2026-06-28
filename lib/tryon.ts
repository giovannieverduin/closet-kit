// FASHN virtual try-on: submit a (person, garment) pair, poll until the image is ready.
// Docs: https://docs.fashn.ai — submit to /run, poll /status/:id.

const FASHN_BASE = "https://api.fashn.ai/v1";
const MODEL = "tryon-v1.6";

// FASHN errors can be a string or an object ({ name, message } etc.) — render readably.
function fashnErr(e: any): string {
  if (!e) return "unknown error";
  if (typeof e === "string") return e;
  if (e.message) return typeof e.message === "string" ? e.message : JSON.stringify(e.message);
  if (e.name) return e.name;
  return JSON.stringify(e);
}

export async function fashnTryOn(
  personImage: string,
  garmentImage: string,
  category: "tops" | "bottoms" | "one-pieces"
): Promise<string> {
  const key = process.env.FASHN_API_KEY;
  if (!key) throw new Error("FASHN_API_KEY is not set");

  const run = await fetch(`${FASHN_BASE}/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model_name: MODEL,
      inputs: { model_image: personImage, garment_image: garmentImage, category, mode: "quality" }
    })
  });
  if (!run.ok) throw new Error(`FASHN run failed (${run.status}): ${await run.text().catch(() => "")}`);
  const started = await run.json();
  const id = started.id || started.prediction_id;
  if (!id) throw new Error("FASHN did not return a prediction id");

  // Poll up to ~60s.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const st = await fetch(`${FASHN_BASE}/status/${id}`, { headers: { Authorization: `Bearer ${key}` } });
    const data = await st.json().catch(() => ({}));
    if (data.status === "completed") {
      const out = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!out) throw new Error("FASHN completed without an output image");
      return out as string;
    }
    if (data.status === "failed" || data.error) {
      throw new Error(`FASHN failed: ${fashnErr(data.error)}`);
    }
  }
  throw new Error("FASHN try-on timed out");
}
