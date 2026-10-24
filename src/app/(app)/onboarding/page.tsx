import { finishOnboardingAction, onboardingAction } from "@/app/actions";
import { CreateCoupleForm, JoinForm } from "@/components/join-form";
import { RelationshipStatusField } from "@/components/relationship-status";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { categories, interests } from "@/lib/content/catalog";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const { step = user.preferences.onboardingStep || "profile" } = await searchParams;
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <p className="text-sm text-muted-foreground">You can skip this and come back.</p>
      <h1 className="mt-2 font-serif text-4xl">Let’s set up your space</h1>
      {step === "profile" && (
        <form action={onboardingAction} className="mt-6 grid gap-4">
          <input type="hidden" name="step" value="profile" />
          <label className="grid gap-2"><Label htmlFor="displayName">Display name</Label><Input id="displayName" name="displayName" defaultValue={user.profile.displayName} required /></label>
          <p className="text-sm text-muted-foreground">A profile photo can be added from settings after you are paired.</p>
          <Button>Continue</Button>
        </form>
      )}
      {step === "relationship" && (
        <form action={onboardingAction} className="mt-6 grid gap-4">
          <input type="hidden" name="step" value="relationship" />
          <RelationshipStatusField defaultValue={user.profile.relationshipStatus} />
          <label className="grid gap-2"><Label htmlFor="relationshipStartedOn">Together since, optional</Label><Input id="relationshipStartedOn" name="relationshipStartedOn" type="date" /></label>
          <Button>Continue</Button>
        </form>
      )}
      {step === "language" && (
        <form action={onboardingAction} className="mt-6 grid gap-4">
          <input type="hidden" name="step" value="language" />
          <label className="grid gap-2 text-sm">Preferred language
            <select name="locale" defaultValue={user.preferences.locale} className="h-11 rounded-2xl border bg-card px-3"><option value="en">English</option><option value="fil">Filipino</option></select>
          </label>
          <Button>Continue</Button>
        </form>
      )}
      {step === "interests" && (
        <form action={onboardingAction} className="mt-6 grid gap-4">
          <input type="hidden" name="step" value="interests" />
          <fieldset className="grid gap-2"><legend className="text-sm">Interests</legend>{interests.map((interest) => <label key={interest} className="text-sm"><input type="checkbox" name="interests" value={interest} /> {interest}</label>)}</fieldset>
          <fieldset className="grid gap-2"><legend className="text-sm">Quiz categories</legend>{categories.map((category) => <label key={category.id} className="text-sm"><input type="checkbox" name="categories" value={category.slug} /> {category.name}</label>)}</fieldset>
          <Button>Continue</Button>
        </form>
      )}
      {step === "pairing" && (
        <div className="mt-6 grid gap-6">
          <CreateCoupleForm />
          <JoinForm />
          <form action={finishOnboardingAction}><Button variant="ghost" type="submit">I’ll do this later</Button></form>
        </div>
      )}
      <form action={onboardingAction} className="mt-4"><input type="hidden" name="step" value="skip" /><button className="text-sm text-muted-foreground">Skip onboarding</button></form>
    </main>
  );
}
