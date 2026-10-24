import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { isGoogleAuthEnabled } from "@/lib/config";
import { safePairPath } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const pairPath = safePairPath(next);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your private couple space. An invitation you opened will be waiting after you sign in.">
      <LoginForm google={isGoogleAuthEnabled()} next={pairPath ?? ""} />
      <p className="mt-4 text-sm">New here? <Link className="font-medium text-primary underline-offset-4 hover:underline" href={pairPath ? `/register?next=${encodeURIComponent(pairPath)}` : "/register"}>Create an account</Link></p>
    </AuthShell>
  );
}
