import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// We'll map the variables shortly in env.ts
export const supabase = createClient(env.supabaseUrl || "http://localhost:54321", env.supabaseServiceKey || "anon-key", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export async function connectDatabase(): Promise<void> {
  // Supabase REST client doesn't need a stateful connection
}

export function isDatabaseReady(): boolean {
  return true;
}

export async function disconnectDatabase(): Promise<void> {
  // No-op for Supabase REST client
}
