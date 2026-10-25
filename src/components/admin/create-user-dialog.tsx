"use client";

import { createMemberAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/overlays";

export function CreateUserDialog({ defaultOpen = false, error }: { defaultOpen?: boolean; error?: string }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button type="button">Create user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create user</DialogTitle>
        <DialogDescription>New accounts are real sign-ins. Demo profiles cannot be promoted.</DialogDescription>
        {error && <p className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
        <form action={createMemberAction} className="mt-4 grid gap-3">
          <Input name="displayName" required maxLength={40} placeholder="Display name" autoComplete="off" />
          <Input name="email" type="email" required placeholder="Email" autoComplete="off" />
          <Input name="password" type="password" required minLength={8} placeholder="Password" autoComplete="new-password" />
          <label className="grid gap-1 text-sm">Role
            <select name="role" defaultValue="user" className="h-11 rounded-2xl border bg-white px-3 text-sm">
              <option value="user">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <Button type="submit">Create user</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
