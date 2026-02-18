// supabaseClient.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://pxjnrkkkaznebjtxmuqp.supabase.co";
export const SUPABASE_ANON_KEY = "ISI_PUBLISHABLE_KEY_DI_SINI"; // harus sb_publishable_...

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
