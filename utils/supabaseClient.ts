import { createClient } from "@supabase/supabase-js";

// ========================================
// ENV VARIABLES (VITE SAFE ACCESS)
// ========================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables not configured.");
}

// ========================================
// CLIENT
// ========================================

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
