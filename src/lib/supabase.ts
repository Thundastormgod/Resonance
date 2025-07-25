import { createClient } from '@supabase/supabase-js';

const getSupabaseEnv = () => {
  // Vite/Browser environment
  if (import.meta.env) {
    return {
      url: import.meta.env.VITE_SUPABASE_URL!,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
    };
  }

  // Netlify/Server environment
  return {
    url: process.env.VITE_SUPABASE_URL!,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  };
};

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to handle errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  throw error;
};
