// Guard for server-side fetches of caller/LLM/Notion-supplied URLs (SSRF mitigation).
// Requires https and blocks loopback, private, link-local, and cloud-metadata hosts.
// Hostname-based (no DNS resolution) — a pragmatic block, not a perfect one.

const BLOCKED_EXACT = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "0.0.0.0",
  "::1",
  "[::1]"
]);

function hostIsBlocked(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_EXACT.has(h)) return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;

  // IPv4 private / loopback / link-local / metadata ranges.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  // IPv6 loopback / unique-local / link-local.
  if (h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}

// Returns the URL string if it is a safe public https URL, else null.
export function safePublicUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!u.hostname || hostIsBlocked(u.hostname)) return null;
  return u.toString();
}
