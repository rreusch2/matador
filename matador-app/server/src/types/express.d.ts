import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. */
      user?: { id: string; email: string | null };
      /** Supabase client scoped to the signed-in user (RLS applies). Set by requireAuth. */
      db?: SupabaseClient;
    }
  }
}

export {};
