"use client";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/overlays";

export function ConfirmSubmit({ action, fields, label, title, description }: { action: (formData: FormData) => void | Promise<void>; fields: Record<string, string>; label: string; title: string; description: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="font-serif text-2xl">{title}</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">{description}</AlertDialogDescription>
        <form action={action} className="mt-5 flex flex-wrap justify-end gap-2">
          {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
          <AlertDialogCancel type="button" className="inline-flex h-11 items-center rounded-full px-4 text-sm">Cancel</AlertDialogCancel>
          <AlertDialogAction asChild><Button type="submit" variant="destructive">Delete</Button></AlertDialogAction>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
