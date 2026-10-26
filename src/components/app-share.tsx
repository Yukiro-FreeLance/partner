"use client";

import { Download, Monitor, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type Downloads = { apk: boolean; windows: boolean; mac: boolean };

export function AppShare({ tone = "light", layout = "row" }: { tone?: "light" | "on-dark"; layout?: "row" | "stack" }) {
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<Downloads | null>(null);
  const onDark = tone === "on-dark";
  const buttonClass = onDark
    ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 text-sm font-medium text-white hover:bg-white/25"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-[#3b0764] hover:bg-[#f3e8ff]";

  useEffect(() => {
    let active = true;
    fetch("/api/download/status")
      .then((response) => response.json())
      .then((body: Downloads) => {
        if (active) setFiles({ apk: Boolean(body.apk), windows: Boolean(body.windows), mac: Boolean(body.mac) });
      })
      .catch(() => {
        if (active) setFiles({ apk: false, windows: false, mac: false });
      });
    return () => {
      active = false;
    };
  }, []);

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
    window.setTimeout(() => setNote(""), 4000);
  }

  function explain(message: string) {
    setNote(message);
    window.setTimeout(() => setNote(""), 5000);
  }

  const windows = files?.windows ? <a href="/downloads/couplesync-setup.exe" className={buttonClass}><Monitor className="size-4" aria-hidden />Windows app</a> : null;
  const mac = files?.mac ? <a href="/downloads/couplesync.dmg" className={buttonClass}><Monitor className="size-4" aria-hidden />Mac app</a> : null;

  return (
    <div className={layout === "stack" ? "grid gap-2" : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"}>
      {files?.apk ? (
        <a href="/downloads/couplesync.apk" className={buttonClass}>
          <Download className="size-4" aria-hidden />
          Download APK
        </a>
      ) : (
        <button type="button" className={buttonClass} onClick={() => explain("There is no Android install file on this server. The last download was this website, saved under the name CoupleSync.apk.")}>
          <Download className="size-4" aria-hidden />
          Download APK
        </button>
      )}
      {windows}
      {mac}
      {!windows && !mac ? (
        <button type="button" className={buttonClass} onClick={() => explain("There is no desktop installer. CoupleSync runs in this browser on Windows and Mac.")}>
          <Monitor className="size-4" aria-hidden />
          Desktop app
        </button>
      ) : null}
      <button type="button" className={buttonClass} onClick={share}>
        <Share2 className="size-4" aria-hidden />
        Share
      </button>
      <p className={note ? (onDark ? "w-full text-sm text-white" : "w-full text-sm text-[#6b6280]") : "sr-only"} aria-live="polite">{note}</p>
    </div>
  );
}
