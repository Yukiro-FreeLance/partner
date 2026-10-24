"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

const imageName = /\.(jpe?g|png|webp|gif)$/i;
const fallback = "/brand/banner.jpg";

export function BannerUpload({ src, className, children, control = "bottom" }: { src: string | null; className?: string; children?: React.ReactNode; control?: "top" | "bottom" }) {
  const router = useRouter();
  const [preview, setPreview] = useState(src || fallback);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type && !file.type.startsWith("image/") && !imageName.test(file.name)) {
      setError("Use a JPEG, PNG, WEBP, or GIF photo.");
      return;
    }
    if (file.size > 5_000_000) {
      setError("That photo is larger than 5 MB.");
      return;
    }
    setPending(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("purpose", "banner");
    try {
      const response = await fetch("/api/media", { method: "POST", body });
      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !json.id) {
        setError(json.error ?? "The banner could not be saved.");
        setPending(false);
        return;
      }
      setPreview(`/api/media/${json.id}?v=${Date.now()}`);
      setPending(false);
      router.refresh();
    } catch {
      setError("The banner could not be saved. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" />
      {children}
      <label className={cn("absolute z-20 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-medium shadow", control === "top" ? "top-4 right-4" : "right-4 bottom-4")}>
        <ImagePlus className="size-4 text-primary" aria-hidden />
        {pending ? "Saving banner…" : "Change banner"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" className="sr-only" disabled={pending} onChange={(event) => void onChange(event)} />
      </label>
      {error && <p className="absolute bottom-4 left-4 z-20 max-w-xs rounded-2xl bg-white/95 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
