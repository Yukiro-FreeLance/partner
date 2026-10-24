import { siteSettingsAction } from "@/app/actions";
import { PendingButton } from "@/components/pending-button";
import { Input, Label } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { loadSiteSettings, siteAssetUrl } from "@/lib/site-settings";

export const metadata = { title: "Site settings" };

const assets = [
  ["favicon", "Favicon", "Browser tab icon. PNG, ICO, WEBP, or GIF, up to 2 MB."],
  ["apple", "Apple touch icon", "Home screen icon on Apple devices."],
  ["icon", "App icon", "Used by the installed app and the manifest."],
  ["og", "Social image", "Shown when a link is shared. JPEG, PNG, or WEBP, up to 5 MB."],
] as const;

export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") return <main className="p-6">Site settings are limited to the super admin.</main>;
  const { saved, error } = await searchParams;
  const loaded = await loadSiteSettings();
  const settings = loaded.settings;
  return (
    <main className="grid gap-6">
      <div>
        <h1 className="font-serif text-4xl">Site settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Search title, description, theme color, favicon, Apple icon, app icon, and the image used when a link is shared.</p>
      </div>
      {loaded.status === "unavailable" && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">Site settings could not be loaded. The saved settings were left unchanged, and this form is showing built-in defaults until the database responds.</p>}
      {saved && <p className="rounded-2xl bg-accent px-4 py-3 text-sm" role="status">Site settings saved.</p>}
      {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</p>}
      <form action={siteSettingsAction} className="grid gap-6">
        <section className="grid gap-4 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)] lg:grid-cols-3">
          <h2 className="font-serif text-2xl lg:col-span-3">Search and sharing</h2>
          <label className="grid gap-2 text-sm"><Label htmlFor="siteName">Site name</Label><Input id="siteName" name="siteName" required maxLength={40} defaultValue={settings.siteName} /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="title">Default title</Label><Input id="title" name="title" required maxLength={140} defaultValue={settings.title} /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="keywords">Keywords</Label><Input id="keywords" name="keywords" maxLength={240} defaultValue={settings.keywords} placeholder="couple quiz, relationship" /></label>
          <label className="grid gap-2 text-sm lg:col-span-2"><Label htmlFor="description">Description</Label><textarea id="description" name="description" required maxLength={300} defaultValue={settings.description} className="min-h-24 rounded-2xl border bg-white px-3 py-2 text-sm" /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="themeColor">Theme color</Label><Input id="themeColor" name="themeColor" type="color" defaultValue={settings.themeColor} className="h-11 w-24 p-1" /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="ogTitle">Share title</Label><Input id="ogTitle" name="ogTitle" maxLength={140} defaultValue={settings.ogTitle} /></label>
          <label className="grid gap-2 text-sm lg:col-span-2"><Label htmlFor="ogDescription">Share description</Label><textarea id="ogDescription" name="ogDescription" maxLength={300} defaultValue={settings.ogDescription} className="min-h-24 rounded-2xl border bg-white px-3 py-2 text-sm" /></label>
        </section>
        <section className="grid gap-4 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)]">
          <h2 className="font-serif text-2xl">Icons and favicons</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {assets.map(([kind, label, help]) => {
              const ready = kind === "favicon" ? settings.faviconPath : kind === "apple" ? settings.appleIconPath : kind === "icon" ? settings.iconPath : settings.ogImagePath;
              return (
                <label key={kind} className="grid gap-2 text-sm">
                  <Label htmlFor={kind}>{label}</Label>
                  {ready ? <img src={`${siteAssetUrl(kind, settings.updatedAt)}`} alt="" className="h-16 w-16 rounded-2xl border object-cover" /> : <img src="/brand/logo.jpg" alt="" className="h-16 w-16 rounded-2xl border object-cover" />}
                  <input id={kind} name={kind} type="file" accept={kind === "favicon" ? "image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico" : "image/png,image/jpeg,image/webp,image/gif"} className="text-sm" />
                  <span className="text-muted-foreground">{help}</span>
                </label>
              );
            })}
          </div>
        </section>
        <PendingButton disabled={loaded.status === "unavailable"} pendingLabel="Saving site settings…">Save site settings</PendingButton>
      </form>
    </main>
  );
}
