import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { safePairPath } from "@/lib/auth/session";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const pairPath = safePairPath(next);
  return (
    <AuthShell title="Start your couple journey" subtitle="Create your account, confirm your email, then open a private space or join the one your partner shared.">
      <RegisterForm next={pairPath ?? ""} />
      <p className="mt-4 text-sm">Already have an account? <Link className="font-medium text-primary underline-offset-4 hover:underline" href={pairPath ? `/login?next=${encodeURIComponent(pairPath)}` : "/login"}>Sign in</Link></p>
    </AuthShell>
  );
}
