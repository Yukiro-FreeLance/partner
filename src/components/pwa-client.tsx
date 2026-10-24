"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaClient() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
    if (ios && !standalone && !window.localStorage.getItem("cs-install-dismissed")) setIosHint(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!install && !iosHint) return null;

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground lg:mx-0">
      <p>{iosHint ? "On iPhone or iPad, open Share and choose Add to Home Screen." : "Install CoupleSync on this device."}</p>
      <div className="flex shrink-0 gap-2">
        {install && (
          <button
            type="button"
            className="min-h-11 rounded-full bg-primary px-4 text-primary-foreground"
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
          >
            Install
          </button>
        )}
        <button
          type="button"
          className="min-h-11 px-2"
          onClick={() => {
            window.localStorage.setItem("cs-install-dismissed", "1");
            setInstall(null);
            setIosHint(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
