import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm font-medium", className)} {...props} />;
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("flex h-11 w-full rounded-2xl border bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50 md:text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn("flex min-h-28 w-full rounded-2xl border bg-card px-3 py-3 text-base outline-none placeholder:text-muted-foreground md:text-sm", className)} {...props} />;
}
