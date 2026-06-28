import { NextRequest, NextResponse } from "next/server";
import { listItems } from "@/lib/notion";

// Lightweight, non-blocking duplicate detector. Compares the piece being added
// against what is already in the closet on designer, category, colour and name
// overlap, and returns the closest matches so she can decide before saving.

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
const tokens = (s: string) => new Set(norm(s).split(/\s+/).filter((w) => w.length > 2));

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0;
  a.forEach((x) => b.has(x) && n++);
  return n;
}

export async function POST(req: NextRequest) {
  try {
    const { name = "", category = "", designer = "", colours = [] } = await req.json();
    const items = await listItems();

    const candName = tokens(name);
    const candCols = new Set((colours as string[]).map(norm));
    const candDesigner = norm(designer);
    const candCat = norm(category);

    const scored = items
      .map((it) => {
        const itDesigner = norm(it.designer || "");
        const itCat = norm(it.category || "");
        const itCols = new Set((it.colours || []).map(norm));
        const nameOv = overlap(candName, tokens(it.name || ""));
        const colOv = overlap(candCols, itCols);

        let score = 0;
        const reasons: string[] = [];
        if (candDesigner && itDesigner && candDesigner === itDesigner) { score += 3; reasons.push("same designer"); }
        if (candCat && itCat && candCat === itCat) { score += 1; reasons.push("same category"); }
        if (colOv > 0) { score += colOv; reasons.push("shared colour"); }
        if (nameOv > 0) { score += nameOv * 2; reasons.push("similar name"); }

        // Require more than a lone colour/category coincidence to flag.
        const meaningful = (candDesigner && itDesigner && candDesigner === itDesigner) || nameOv > 0;
        return { it, score, reasons, meaningful };
      })
      .filter((x) => x.meaningful && x.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => ({
        id: x.it.id,
        name: x.it.name,
        designer: x.it.designer,
        category: x.it.category,
        status: x.it.status,
        photo: x.it.photo,
        reason: Array.from(new Set(x.reasons)).join(", ")
      }));

    return NextResponse.json({ matches: scored });
  } catch (e: any) {
    return NextResponse.json({ matches: [], error: e.message || "dupe check failed" }, { status: 200 });
  }
}
