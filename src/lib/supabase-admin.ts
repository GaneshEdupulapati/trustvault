
import "server-only";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SECRET_KEY environment variable. Add your Supabase secret key to the server-only .env.local file (never prefix it with NEXT_PUBLIC_)."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
