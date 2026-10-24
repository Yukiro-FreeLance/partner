"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui/field";

export function PasswordField({ label, name, autoComplete }: { label: string; name: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <span className="relative">
        <Input id={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required className="pr-12" />
        <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}
