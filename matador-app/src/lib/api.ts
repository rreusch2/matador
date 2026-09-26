import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

const API_PORT = 4000;

/**
 * EXPO_PUBLIC_API_URL wins. In development, fall back to the machine running Metro
 * (same LAN IP the phone already reaches), so Expo Go on a real device just works.
 */
function resolveBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && !host.includes('.exp.direct') && !host.includes('ngrok')) return `http://${host}:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
};

export async function api<T>(path: string, { method = 'GET', body, timeoutMs = 75_000 }: Options = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Please sign in again.', 401, 'unauthorized');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      aborted ? 'That took too long. Please try again.' : "Can't reach the server. Check your connection and try again.",
      0,
      aborted ? 'timeout' : 'network'
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      payload?.error ?? 'Something went wrong. Please try again.',
      res.status,
      payload?.code ?? 'server_error'
    );
  }
  return payload as T;
}
