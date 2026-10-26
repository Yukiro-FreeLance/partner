"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import { deleteMemberPermanentlyAction, setAccountStatusAction, setMemberRoleAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, Dialog, DialogContent, DialogDescription, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";

type AccountStatus = "active" | "archived" | "deleted";

export function UserActions({ userId, name, role, isDemo, status }: { userId: string; name: string; role: "user" | "admin" | "super_admin"; isDemo: boolean; status: AccountStatus }) {
  const [roleOpen, setRoleOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "archive" | "delete" | "purge">(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${name}`}>
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "active" && role !== "super_admin" && (
            <form method="post" action="/api/admin/impersonate">
              <input type="hidden" name="userId" value={userId} />
              <DropdownMenuItem asChild><button type="submit" className="w-full text-left">Impersonate</button></DropdownMenuItem>
            </form>
          )}
          {!isDemo && status !== "deleted" && <DropdownMenuItem onSelect={() => setRoleOpen(true)}>Change role</DropdownMenuItem>}
          {status === "active" && role !== "super_admin" && <DropdownMenuItem onSelect={() => setConfirm("archive")}>Archive</DropdownMenuItem>}
          {status !== "active" && <DropdownMenuItem onSelect={() => setConfirm("archive")}>Restore</DropdownMenuItem>}
          {status !== "deleted" && role !== "super_admin" && <DropdownMenuItem onSelect={() => setConfirm("delete")}>Delete</DropdownMenuItem>}
          {!isDemo && role !== "super_admin" && <DropdownMenuItem className="text-destructive" onSelect={() => setConfirm("purge")}>Delete permanently</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>{name} can be a member, an admin, or a super admin.</DialogDescription>
          <form action={setMemberRoleAction} className="mt-4 grid gap-3">
            <input type="hidden" name="userId" value={userId} />
            <label className="grid gap-1 text-sm">Role
              <select name="role" defaultValue={role} className="h-11 rounded-2xl border bg-white px-3 text-sm">
                <option value="user">Member</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <Button type="submit">Save role</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Confirm
        open={confirm === "archive"}
        title={status === "active" ? `Archive ${name}?` : `Restore ${name}?`}
        body={status === "active" ? "They cannot sign in until you restore the account. Their records stay on the server." : "They can sign in again. Their records are unchanged."}
        confirmLabel={status === "active" ? "Archive" : "Restore"}
        action={setAccountStatusAction}
        userId={userId}
        status={status === "active" ? "archived" : "active"}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
      <Confirm
        open={confirm === "delete"}
        title={`Delete ${name}?`}
        body="The account is marked deleted and cannot sign in. You can restore it, or delete it permanently."
        confirmLabel="Delete"
        destructive
        action={setAccountStatusAction}
        userId={userId}
        status="deleted"
        onOpenChange={(open) => !open && setConfirm(null)}
      />
      <Confirm
        open={confirm === "purge"}
        title={`Permanently delete ${name}?`}
        body="This erases the account and the records that belong only to them. Shared records that still point at the account keep it marked deleted instead."
        confirmLabel="Delete permanently"
        destructive
        action={deleteMemberPermanentlyAction}
        userId={userId}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </>
  );
}

function Confirm({ open, title, body, confirmLabel, destructive, action, userId, status, onOpenChange }: { open: boolean; title: string; body: string; confirmLabel: string; destructive?: boolean; action: (formData: FormData) => void; userId: string; status?: AccountStatus; onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="userId" value={userId} />
          {status && <input type="hidden" name="status" value={status} />}
          <AlertDialogTitle className="font-serif text-2xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">{body}</AlertDialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialogCancel type="button" className="inline-flex h-11 items-center rounded-full border px-4 text-sm">Cancel</AlertDialogCancel>
            <Button type="submit" variant={destructive ? "destructive" : "default"}>{confirmLabel}</Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
