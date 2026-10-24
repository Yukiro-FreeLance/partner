import { ResendForm } from "@/components/auth-forms";
import { SiteHeader } from "@/components/site";
import { verifyAction } from "@/app/actions";

export const metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyAction(token) : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <h1 className="font-serif text-4xl">Verify your email</h1>
        {result && <p className="mt-4 text-sm" role={result.error ? "alert" : "status"}>{result.error || result.message}</p>}
        <ResendForm />
      </main>
    </>
  );
}
