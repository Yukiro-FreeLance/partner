"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/feedback";

const imageName = /\.(jpe?g|png|webp|gif)$/i;

export function AvatarUpload({ name, src }: { name: string; src: string | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState(src);
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
    body.set("purpose", "avatar");
    try {
      const response = await fetch("/api/media", { method: "POST", body });
      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !json.id) {
        setError(json.error ?? "The photo could not be saved.");
        setPending(false);
        return;
      }
      setPreview(`/api/media/${json.id}?v=${Date.now()}`);
      setPending(false);
      router.refresh();
    } catch {
      setError("The photo could not be saved. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <label className="flex cursor-pointer flex-col items-center">
        <span className="relative">
          <Avatar name={name} src={preview} className="size-28 text-3xl ring-4 ring-white" />
          <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Camera className="size-4" aria-hidden />
          </span>
        </span>
        <span className="mt-4 inline-flex min-h-11 items-center rounded-full bg-secondary px-4 text-sm font-medium text-secondary-foreground">{pending ? "Saving photo…" : "Upload photo"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" className="sr-only" disabled={pending} onChange={(event) => void onChange(event)} />
      </label>
      <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">JPEG, PNG, WEBP, or GIF, up to 5 MB. Your partner can see it inside your couple space.</p>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
