"use client";

export type Frame = { time: number; dataUrl: string; base64: string };

// Extract evenly-spaced keyframes from a video file, in the browser (no server video
// processing). Downscales each frame and caps the count to bound vision cost.
export async function extractFrames(
  file: File,
  opts?: { everySec?: number; maxFrames?: number; maxDim?: number }
): Promise<Frame[]> {
  const everySec = opts?.everySec ?? 1.5;
  const maxFrames = opts?.maxFrames ?? 20;
  const maxDim = opts?.maxDim ?? 768;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Couldn't read that video"));
  });

  const duration = video.duration;
  let times: number[] = [];
  if (duration && isFinite(duration) && duration > 0) {
    for (let t = 0.3; t < duration && times.length < 400; t += everySec) times.push(t);
  } else {
    times = [0.3];
  }
  if (times.length > maxFrames) {
    const step = times.length / maxFrames;
    times = Array.from({ length: maxFrames }, (_, i) => times[Math.floor(i * step)]);
  }

  const canvas = document.createElement("canvas");
  const frames: Frame[] = [];
  for (const t of times) {
    await seek(video, t);
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (!w || !h) continue;
    if (Math.max(w, h) > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    frames.push({ time: t, dataUrl, base64: dataUrl.split(",")[1] });
  }

  URL.revokeObjectURL(url);
  return frames;
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}
