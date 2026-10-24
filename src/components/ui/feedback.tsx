"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground", className)} {...props} />;
}

export function Progress({ className, value = 0, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
      <ProgressPrimitive.Indicator className="h-full bg-primary transition-all" style={{ width: `${value ?? 0}%` }} />
    </ProgressPrimitive.Root>
  );
}

export function Avatar({ className, name, src }: { className?: string; name: string; src?: string | null }) {
  const initials = name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <AvatarPrimitive.Root className={cn("inline-flex size-12 items-center justify-center overflow-hidden rounded-full bg-blush text-sm font-semibold text-primary", className)}>
      <AvatarPrimitive.Image src={src ?? undefined} alt="" className="size-full object-cover" />
      <AvatarPrimitive.Fallback>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export function Separator({ className, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root className={cn("h-px w-full bg-border", className)} {...props} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-2xl bg-muted", className)} {...props} />;
}

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root className={cn("peer inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-muted data-[state=checked]:bg-primary", className)} {...props}>
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root className={cn("flex size-5 items-center justify-center rounded-md border bg-card data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className)} {...props}>
      <CheckboxPrimitive.Indicator><Check className="size-3.5" /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex w-full touch-none items-center", className)} {...props}>
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-5 rounded-full border bg-card" />
    </SliderPrimitive.Root>
  );
}
