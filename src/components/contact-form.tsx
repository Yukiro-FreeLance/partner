"use client";

import { useActionState } from "react";
import { contactAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      {state.message && <p className="text-sm" role="status">{state.message}</p>}
      <label className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></label>
      <label className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></label>
      <label className="grid gap-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required /></label>
      <Button disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
    </form>
  );
}
