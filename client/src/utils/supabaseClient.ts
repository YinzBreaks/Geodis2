import { createClient } from '@supabase/supabase-js';

// Safe environment variable accessor for browser / Vite client runtime
const getEnvVar = (key: string, fallback: string = ''): string => {
  // Check Vite import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = (import.meta as any).env[key];
      if (val) return val;
    }
  } catch {
    // Ignore
  }

  // Check globalThis or window fallback
  const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : (window as any);
  if (globalObj?.__ENV__?.[key]) {
    return globalObj.__ENV__[key];
  }

  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://placeholder-project.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'placeholder-anon-key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
