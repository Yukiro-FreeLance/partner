import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "CoupleSync — How well do you really know your person?", template: "%s · CoupleSync" },
  description: "Discover their little favorites, hidden dreams, personality, and the things that make your connection uniquely yours.",
  applicationName: "CoupleSync",
  openGraph: { title: "CoupleSync", description: "A private way for two people to learn each other.", type: "website" },
  twitter: { card: "summary_large_image", title: "CoupleSync", description: "How well do you really know your person?" },
  appleWebApp: { capable: true, title: "CoupleSync", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6d28d9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
