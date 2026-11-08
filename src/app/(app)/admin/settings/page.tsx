import { siteSettingsAction } from "@/app/actions";
import { PendingButton } from "@/components/pending-button";
import { Input, Label } from "@/components/ui/field";
import { requireUser } from "@/lib/auth/session";
import { providerCredentials } from "@/lib/services/ai";
import { aiProviders, loadSiteSettings, siteAssetUrl } from "@/lib/site-settings";
import type { AIProvider } from "@/lib/domain";

export const metadata = { title: "Site settings" };

const assets = [
  ["favicon", "Favicon", "Browser tab icon. PNG, ICO, WEBP, or GIF, up to 2 MB."],
  ["apple", "Apple touch icon", "Home screen icon on Apple devices."],
  ["icon", "App icon", "Used by the installed app and the manifest."],
  ["og", "Social image", "Shown when a link is shared. JPEG, PNG, or WEBP, up to 5 MB."],
] as const;

const keyProviders: { value: AIProvider; label: string; keyField: string; removeField: string }[] = [
  { value: "openrouter", label: "OpenRouter", keyField: "aiKeyOpenRouter", removeField: "aiRemoveKeyOpenRouter" },
  { value: "openai", label: "OpenAI", keyField: "aiKeyOpenAI", removeField: "aiRemoveKeyOpenAI" },
  { value: "anthropic", label: "Anthropic", keyField: "aiKeyAnthropic", removeField: "aiRemoveKeyAnthropic" },
  { value: "google", label: "Google Gemini", keyField: "aiKeyGoogle", removeField: "aiRemoveKeyGoogle" },
];

export default async function SiteSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warn?: string }> }) {
  const user = await requireUser();
  const actor = user.actor ?? user.profile;
  if (actor.role !== "super_admin") return <main className="p-6">Site settings are limited to the super admin.</main>;
  const { saved, error, warn } = await searchParams;
  const loaded = await loadSiteSettings();
  const settings = loaded.settings;
  const credentials = await providerCredentials([...keyProviders.map((provider) => provider.value), settings.aiCustomProvider?.trim().toLowerCase() ?? ""].filter(Boolean) as string[]).catch(() => null);
  return (
    <main className="grid gap-6">
      <div>
        <h1 className="font-serif text-4xl">Site settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Search title, description, theme color, favicon, Apple icon, app icon, and the image used when a link is shared.</p>
      </div>
      {loaded.status === "unavailable" && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">Site settings could not be loaded. The saved settings were left unchanged, and this form is showing built-in defaults until the database responds.</p>}
      {saved && <p className="rounded-2xl bg-accent px-4 py-3 text-sm" role="status">Site settings saved.</p>}
      {warn && <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">{warn}</p>}
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
        <section className="grid gap-4 rounded-[1.75rem] bg-white p-5 shadow-[var(--shadow)] lg:grid-cols-3">
          <div className="lg:col-span-3"><h2 className="font-serif text-2xl">WenX chatbot</h2><p className="mt-1 text-sm text-muted-foreground">Choose the AI provider and model used by the server-side chatbot. Google Gemini can use <code className="rounded bg-secondary px-1">GEMINI_API_KEY</code> from the server environment when OpenCode is not running. Other providers need OpenCode; keys entered below are stored on the OpenCode server and never in the database.</p></div>
          <label className="flex items-start gap-3 text-sm lg:col-span-3"><input name="aiEnabled" type="checkbox" defaultChecked={settings.aiEnabled} className="mt-1 size-4" /><span><strong>Enable chatbot</strong><br /><span className="text-muted-foreground">Allow authenticated users to use WenX.</span></span></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="aiName">Chatbot name</Label><Input id="aiName" name="aiName" maxLength={40} defaultValue={settings.aiName} /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="aiProvider">Provider</Label><select id="aiProvider" name="aiProvider" defaultValue={settings.aiProvider} className="h-11 rounded-xl border bg-white px-3 text-sm">{aiProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="aiModel">Model ID <span className="text-muted-foreground">(optional)</span></Label><Input id="aiModel" name="aiModel" maxLength={160} defaultValue={settings.aiModel} placeholder="e.g. openai/gpt-4o-mini" /></label>
          <label className="grid gap-2 text-sm"><Label htmlFor="aiCustomProvider">Custom provider ID <span className="text-muted-foreground">(used with “Custom provider”)</span></Label><Input id="aiCustomProvider" name="aiCustomProvider" maxLength={60} defaultValue={settings.aiCustomProvider} placeholder="e.g. deepseek, moonshot, groq" /></label>
          <div className="grid gap-4 rounded-2xl border border-primary/10 bg-secondary/40 p-4 lg:col-span-3">
            <div><h3 className="font-semibold">Provider API keys</h3><p className="text-xs text-muted-foreground">Leave a key blank to keep the stored one, or check “Remove key” to disconnect a provider. Adding a key makes every model of that provider selectable as the chatbot&apos;s model.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {keyProviders.map((provider) => {
                const connected = credentials?.find((credential) => credential.integrationId === provider.value) ?? null;
                return <div key={provider.value} className="grid gap-2 rounded-xl border bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-2"><strong>{provider.label}</strong>{credentials === null ? <span className="text-xs text-muted-foreground">Status unknown</span> : connected ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">{connected.type === "key" ? "Key added" : "Connected (OAuth)"}</span> : <span className="text-xs text-muted-foreground">No API key yet</span>}</div>
                  <Input name={provider.keyField} type="password" autoComplete="new-password" placeholder="Paste an API key to add or replace" />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name={provider.removeField} className="size-3.5" />Remove key</label>
                </div>;
              })}
              <div className="grid gap-2 rounded-xl border bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><strong>Custom provider</strong>{credentials === null ? <span className="text-xs text-muted-foreground">Status unknown</span> : settings.aiCustomProvider && credentials.some((credential) => credential.integrationId === settings.aiCustomProvider?.toLowerCase()) ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">Key added</span> : <span className="text-xs text-muted-foreground">No API key yet</span>}</div>
                <p className="text-xs text-muted-foreground">Uses the custom provider ID above (any provider OpenCode knows, e.g. deepseek).</p>
                <Input name="aiKeyCustom" type="password" autoComplete="new-password" placeholder="Paste an API key to add or replace" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="aiRemoveKeyCustom" className="size-3.5" />Remove key</label>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground lg:col-span-3">OpenCode configuration stays server-only. API keys entered here are connected on the OpenCode server and are never written to the database.</p>
        </section>
        <PendingButton disabled={loaded.status === "unavailable"} pendingLabel="Saving site settings…">Save site settings</PendingButton>
      </form>
    </main>
  );
}
