"use client";

import { useActionState } from "react";
import { memoryAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { CoupleMemory } from "@/lib/domain";

export function MemoryForm({ memory }: { memory?: CoupleMemory }) {
  const [state, action, pending] = useActionState(memoryAction, {});
  return (
    <form action={action} className="mt-6 grid gap-4">
      {state.error && <p className="text-sm text-destructive" role="alert">{state.error}</p>}
      {memory && <input type="hidden" name="memoryId" value={memory.id} />}
      <label className="grid gap-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" required defaultValue={memory?.title} /></label>
      <label className="grid gap-2"><Label htmlFor="body">Note</Label><Textarea id="body" name="body" defaultValue={memory?.body ?? ""} /></label>
      <label className="grid gap-2 text-sm">Kind
        <select name="kind" defaultValue={memory?.kind ?? "moment"} className="h-11 rounded-2xl border bg-card px-3">
          <option value="milestone">Milestone</option><option value="trip">Trip</option><option value="moment">Moment</option><option value="plan">Future plan</option><option value="note">Note</option>
        </select>
      </label>
      <label className="grid gap-2"><Label htmlFor="occurredOn">Date</Label><Input id="occurredOn" name="occurredOn" type="date" defaultValue={memory?.occurredOn ?? ""} /></label>
      <label className="grid gap-2"><Label htmlFor="remindOn">Optional reminder</Label><Input id="remindOn" name="remindOn" type="date" defaultValue={memory?.remindOn ?? ""} /></label>
      <fieldset className="flex gap-4 text-sm"><label><input type="radio" name="visibility" value="shared" defaultChecked={memory?.visibility !== "private"} /> Shared</label><label><input type="radio" name="visibility" value="private" defaultChecked={memory?.visibility === "private"} /> Private</label></fieldset>
      <PhotoField memoryId={memory?.id} />
      <Button disabled={pending}>{pending ? "Saving…" : "Save memory"}</Button>
    </form>
  );
}

function PhotoField({ memoryId }: { memoryId?: string }) {
  return (
    <label className="grid gap-2 text-sm">Photo, optional
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file || !memoryId) return;
        const body = new FormData();
        body.set("file", file);
        body.set("memoryId", memoryId);
        await fetch("/api/media", { method: "POST", body });
      }} />
      {!memoryId && <span className="text-xs text-muted-foreground">Save the memory first, then add a photo on the next screen.</span>}
    </label>
  );
}
