import { describe, it, expect } from "vitest";
import { safePublicUrl } from "./safeUrl";

describe("safePublicUrl", () => {
  it("allows normal public https URLs", () => {
    expect(safePublicUrl("https://www.farfetch.com/shopping/x.aspx")).toBeTruthy();
    expect(safePublicUrl("https://cdn-images.farfetch-contents.com/a.jpg")).toBeTruthy();
    expect(safePublicUrl("https://zun9xfcsesrlbslv.public.blob.vercel-storage.com/x.jpg")).toBeTruthy();
  });

  it("rejects non-https schemes", () => {
    expect(safePublicUrl("http://example.com")).toBeNull();
    expect(safePublicUrl("javascript:alert(1)")).toBeNull();
    expect(safePublicUrl("data:text/html,x")).toBeNull();
    expect(safePublicUrl("file:///etc/passwd")).toBeNull();
  });

  it("blocks loopback, private, link-local and metadata hosts", () => {
    expect(safePublicUrl("https://localhost/x")).toBeNull();
    expect(safePublicUrl("https://127.0.0.1/x")).toBeNull();
    expect(safePublicUrl("https://169.254.169.254/latest/meta-data/")).toBeNull();
    expect(safePublicUrl("https://10.0.0.5/x")).toBeNull();
    expect(safePublicUrl("https://192.168.1.1/x")).toBeNull();
    expect(safePublicUrl("https://172.16.0.1/x")).toBeNull();
    expect(safePublicUrl("https://metadata.google.internal/x")).toBeNull();
    expect(safePublicUrl("https://db.internal/x")).toBeNull();
  });

  it("handles junk safely", () => {
    expect(safePublicUrl("")).toBeNull();
    expect(safePublicUrl(null)).toBeNull();
    expect(safePublicUrl("not a url")).toBeNull();
  });
});
