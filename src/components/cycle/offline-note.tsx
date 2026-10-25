"use client";

import { useEffect, useState } from "react";

export function OfflineNote() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">You appear to be offline. Saved cycle data will load again when you reconnect. A check-in is stored only after Save succeeds.</p>;
}
