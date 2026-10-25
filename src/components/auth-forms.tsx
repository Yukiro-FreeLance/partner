"use client";

import Link from "next/link";
import { useActionState } from "react";
import { demoAction, forgotAction, loginAction, registerAction, resendAction, resetAction } from "@/app/actions";
import { PasswordField } from "@/components/password-field";
import { GenderField } from "@/components/gender-field";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { FormState } from "@/app/actions";

function Notice({ state }: { state: FormState }) {
  if (!state.error && !state.message) return null;
  return (
    <div className={`rounded-2xl p-3 text-sm ${state.error ? "bg-destructive/10 text-destructive" : "bg-accent"}`} role={state.error ? "alert" : "status"}>
      <p>{state.error || state.message}</p>
      {state.link && <Link className="mt-2 inline-block font-medium underline" href={state.link}>Open the one-time link</Link>}
    </div>
  );
}

export function LoginForm({ google, next = "" }: { google: boolean; next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4" data-testid="login-form">
        <Notice state={state} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></label>
        <PasswordField label="Password" name="password" autoComplete="current-password" />
        <Link href="/forgot-password" className="justify-self-start text-sm font-medium text-primary underline-offset-4 hover:underline">Forgot password</Link>
        <Button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      {google && <GoogleButton />}
      <div className="grid gap-3">
        <form action={demoAction}><input type="hidden" name="who" value="maya" /><Button type="submit" variant="secondary" className="h-auto min-h-11 w-full whitespace-normal px-4 py-3 text-center">Enter as Maya, fictional demo</Button></form>
        <form action={demoAction}><input type="hidden" name="who" value="jordan" /><Button type="submit" variant="outline" className="h-auto min-h-11 w-full whitespace-normal px-4 py-3 text-center">Enter as Jordan, fictional demo</Button></form>
      </div>
      <p className="text-sm text-muted-foreground">The demo accounts are sample people.</p>
    </div>
  );
}

export function RegisterForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action} className="grid gap-4" data-testid="register-form">
      <Notice state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="grid gap-2"><Label htmlFor="displayName">Display name</Label><Input id="displayName" name="displayName" required maxLength={40} /></label>
      <label className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></label>
      <GenderField />
      <PasswordField label="Password" name="password" autoComplete="new-password" />
      <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" />
      <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" name="acceptTerms" required /> I agree to the <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.</label>
      <Button disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, {});
  return <form action={action} className="grid gap-4"><Notice state={state} /><label className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></label><Button disabled={pending}>Send reset link</Button></form>;
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetAction, {});
  return <form action={action} className="grid gap-4"><Notice state={state} /><input type="hidden" name="token" value={token} /><PasswordField label="New password" name="password" autoComplete="new-password" /><PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" /><Button disabled={pending}>Update password</Button></form>;
}

export function ResendForm() {
  const [state, action, pending] = useActionState(resendAction, {});
  return <form action={action} className="mt-6 grid gap-3"><Notice state={state} /><Input name="email" type="email" placeholder="Email" required /><Button variant="outline" disabled={pending}>Resend verification link</Button></form>;
}

function GoogleButton() {
  return <button type="button" className="h-11 rounded-full border bg-card" onClick={async () => {
    const { createBrowserSupabase } = await import("@/lib/supabase/browser");
    await createBrowserSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }}>Continue with Google</button>;
}
