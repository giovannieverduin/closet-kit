"use client";

import { useState } from "react";

export default function Login() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode })
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "That didn't work");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xs text-center">
        <p className="eyebrow mb-4">Private</p>
        <h1 className="font-display text-3xl tracking-[0.22em] uppercase mb-10">The Wardrobe</h1>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="PASSCODE"
          className="underline-input text-center text-[11px] tracking-luxe uppercase placeholder:text-graphite"
          autoFocus
        />
        {error && <p className="text-sale mt-4 text-[11px] uppercase tracking-wide2">{error}</p>}
        <button onClick={submit} disabled={busy || !passcode} className="btn-solid w-full mt-8">
          {busy ? "Opening…" : "Enter"}
        </button>
      </div>
    </div>
  );
}
