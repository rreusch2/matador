import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type SignUpInput = { firstName: string; email: string; password: string; marketing: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** True until the stored session has been read on launch. */
  loading: boolean;
  /** Resolves to a user-facing error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
};

const NOT_CONFIGURED = 'Sign in is not set up yet. Add your Supabase keys to .env.local.';

function friendly(error: { message: string } | null): string | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return "That email and password don't match.";
  if (msg.includes('email not confirmed')) return 'Confirm your email first - check your inbox for the link.';
  if (msg.includes('already registered')) return 'That email already has an account. Try signing in.';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Give it a minute and try again.';
  if (msg.includes('network') || msg.includes('fetch')) return "Can't reach the server. Check your connection.";
  if (msg.includes('password')) return error.message;
  return 'Something went wrong. Please try again.';
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return friendly(error);
      },
      signUp: async ({ firstName, email, password, marketing }) => {
        if (!isSupabaseConfigured) return { error: NOT_CONFIGURED, needsConfirmation: false };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName, marketing_opt_in: marketing } },
        });
        if (error) return { error: friendly(error), needsConfirmation: false };
        // With email confirmation on, an existing email comes back as a user with no identities.
        if (data.user && data.user.identities?.length === 0) {
          return { error: 'That email already has an account. Try signing in.', needsConfirmation: false };
        }
        return { error: null, needsConfirmation: !data.session };
      },
      resetPassword: async (email) => {
        if (!isSupabaseConfigured) return NOT_CONFIGURED;
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return friendly(error);
      },
      signOut: async () => {
        await supabase.auth.signOut().catch(() => {});
      },
      deleteAccount: async () => {
        const { error } = await supabase.rpc('delete_my_account');
        if (error) return friendly(error);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return null;
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
