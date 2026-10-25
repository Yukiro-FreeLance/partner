"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";

const apkHref = "/downloads/couplesync.apk";

export function AppShare({ tone = "light", layout = "row" }: { tone?: "light" | "on-dark"; layout?: "row" | "stack" }) {
  const [note, setNote] = useState("");
  const onDark = tone === "on-dark";
  const buttonClass = onDark
    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 text-sm font-medium text-white hover:bg-white/25"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#3b0764] hover:bg-[#f3e8ff]";

  async function share() {
    const url = `${window.location.origin}/`;
    const payload = { title: "CoupleSync", text: "How well do you really know your person?", url };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied");
    } catch {
      setNote(url);
    }
    window.setTimeout(() => setNote(""), 2500);
  }

  return (
    <div className={layout === "stack" ? "grid gap-2" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"}>
      <a href={apkHref} download="CoupleSync.apk" className={buttonClass}>
        <Download className="size-4" aria-hidden />
        Download APK
      </a>
      <button type="button" className={buttonClass} onClick={share}>
        <Share2 className="size-4" aria-hidden />
        Share
      </button>
      <p className="sr-only" aria-live="polite">{note}</p>
      {note ? <p className={onDark ? "text-sm text-white" : "text-sm text-[#6b6280]"}>{note}</p> : null}
    </div>
  );
}
