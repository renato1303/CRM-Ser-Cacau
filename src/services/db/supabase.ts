import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Supabase synchronization helper service.
 * Automatically syncs local repository state with Supabase tables if configured,
 * falling back gracefully to localStorage.
 */
export const supabaseService = {
  async fetchTable<T>(tableName: string, fallbackData: T[]): Promise<T[]> {
    if (!supabase) return fallbackData;
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error || !data) return fallbackData;
      return data as T[];
    } catch {
      return fallbackData;
    }
  },

  async upsertRecord(tableName: string, record: Record<string, any>): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(tableName).upsert(record);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteRecord(tableName: string, id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  }
};
