import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/config";
import { getSiteSettings, siteAssetUrl } from "@/lib/site-settings";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const keywords = settings.keywords.split(",").map((item) => item.trim()).filter(Boolean);
  const icon = [{ url: siteAssetUrl("favicon", settings.updatedAt), type: settings.faviconType ?? "image/jpeg" }];
  const apple = [{ url: siteAssetUrl("apple", settings.updatedAt), type: settings.appleIconType ?? settings.faviconType ?? "image/jpeg" }];
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: settings.title, template: `%s · ${settings.siteName}` },
    description: settings.description,
    applicationName: settings.siteName,
    keywords,
    icons: { icon, apple, shortcut: icon },
    openGraph: {
      title: settings.ogTitle || settings.title,
      description: settings.ogDescription || settings.description,
      siteName: settings.siteName,
      type: "website",
      images: settings.ogImagePath ? [siteAssetUrl("og")] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.ogTitle || settings.title,
      description: settings.ogDescription || settings.description,
      images: settings.ogImagePath ? [siteAssetUrl("og")] : undefined,
    },
    appleWebApp: { capable: true, title: settings.siteName, statusBarStyle: "default" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings();
  return {
    themeColor: settings.themeColor || "#6d28d9",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const theme = store.get("theme")?.value;
  const locale = store.get("locale")?.value === "fil" ? "fil" : "en";
  const dark = theme === "dark" || (theme === "system" && false);
  return (
    <html lang={locale} className={`${poppins.variable} ${montserrat.variable} h-full antialiased ${dark ? "dark" : ""}`}>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
