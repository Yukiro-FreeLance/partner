"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/config";

export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
