import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '../config/env.js';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** Used only to verify access tokens. */
export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, options);

/**
 * A client that acts as the signed-in user, so Row Level Security applies to every query.
 * The server never needs the service-role key for user data.
 */
export function supabaseForUser(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
