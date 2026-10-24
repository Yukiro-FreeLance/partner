"use client";

import { useActionState } from "react";
import { createCoupleAction, previewInviteAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function JoinForm({ code = "" }: { code?: string }) {
  return (
    <form action={previewInviteAction} className="grid gap-4" data-testid="join-couple">
      <label className="grid gap-2"><Label htmlFor="code">Invitation code</Label><Input id="code" name="code" defaultValue={code} required className="uppercase tracking-widest" autoCapitalize="characters" /></label>
      <Button>Review invitation</Button>
    </form>
  );
}

export function CreateCoupleForm() {
  const [state, action, pending] = useActionState(createCoupleAction, {});
  return (
    <form action={action} className="grid gap-4" data-testid="create-couple">
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      <label className="grid gap-2"><Label htmlFor="name">Couple name</Label><Input id="name" name="name" required placeholder="Us" /></label>
      <label className="grid gap-2"><Label htmlFor="nickname">Nickname, optional</Label><Input id="nickname" name="nickname" /></label>
      <Button disabled={pending}>Create couple space</Button>
    </form>
  );
}
