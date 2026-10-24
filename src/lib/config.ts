export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function supabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isGoogleAuthEnabled() {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && Boolean(supabaseUrl() && supabaseAnonKey());
}

const productionSite = "https://sync.wendev.site";

export function siteUrl() {
  if (process.env.VERCEL) return productionSite;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase());
}

export function superAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string) {
  return superAdminEmails().includes(email.toLowerCase());
}

export function dataMode(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}
