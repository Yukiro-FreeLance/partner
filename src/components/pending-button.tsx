"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function PendingButton({ children, pendingLabel, disabled }: { children: string; pendingLabel: string; disabled?: boolean }) {
  const status = useFormStatus();
  return (
    <Button type="submit" className="w-fit" disabled={disabled || status.pending}>
      {status.pending ? pendingLabel : children}
    </Button>
  );
}
