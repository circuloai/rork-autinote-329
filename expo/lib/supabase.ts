import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FALLBACK_URL = 'https://kedbkwjhwylctwbqdslb.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZGJrd2pod3lsY3R3YnFkc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODc5NTgsImV4cCI6MjA3OTk2Mzk1OH0.6on7Nk0RU9ygoXc03hAn-8QqpgIdQeLAWGDt7AFO0cg';

function pickUrl(): string {
  let env = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (env && env.startsWith('https://') && (env.includes('.supabase.co') || env.includes('.supabase.com')) && !env.includes('placeholder')) {
    env = env.replace('.supabase.com', '.supabase.co');
    return env;
  }
  return FALLBACK_URL;
}

function pickKey(): string {
  const env = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (env && env.length > 50 && !env.includes('placeholder')) {
    return env;
  }
  return FALLBACK_KEY;
}

const supabaseUrl = pickUrl();
const supabaseAnonKey = pickKey();

console.log('[Supabase] URL:', supabaseUrl.substring(0, 40) + '...');
console.log('[Supabase] Platform:', Platform.OS);

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (...args) => {
      return fetch(...args);
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          caregiver_name: string | null;
          caregiver_email: string | null;
          caregiver_phone: string | null;
          therapist_phone: string | null;
          avatar: string | null;
          active_child_id: string | null;
          is_explore_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          caregiver_name?: string | null;
          caregiver_email?: string | null;
          caregiver_phone?: string | null;
          therapist_phone?: string | null;
          avatar?: string | null;
          active_child_id?: string | null;
          is_explore_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          caregiver_name?: string | null;
          caregiver_email?: string | null;
          caregiver_phone?: string | null;
          therapist_phone?: string | null;
          avatar?: string | null;
          active_child_id?: string | null;
          is_explore_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          age: number;
          diagnosis: string | null;
          grade_level: string | null;
          school_name: string | null;
          height: string | null;
          weight: string | null;
          common_triggers: string[];
          strengths: string[] | null;
          interests: string[] | null;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          age: number;
          diagnosis?: string | null;
          grade_level?: string | null;
          school_name?: string | null;
          height?: string | null;
          weight?: string | null;
          common_triggers?: string[];
          strengths?: string[] | null;
          interests?: string[] | null;
          avatar?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          name?: string;
          age?: number;
          diagnosis?: string | null;
          grade_level?: string | null;
          school_name?: string | null;
          height?: string | null;
          weight?: string | null;
          common_triggers?: string[];
          strengths?: string[] | null;
          interests?: string[] | null;
          avatar?: string | null;
          created_at?: string;
        };
      };
      log_entries: {
        Row: {
          id: string;
          child_id: string;
          date: string;
          mood_rating: string;
          positive_notes: string | null;
          challenge_notes: string | null;
          mood_tags: string[];
          type: string;
          behaviors: string[] | null;
          sleep_hours: number | null;
          triggers: string[] | null;
          voice_notes: string | null;
          photos: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id: string;
          date: string;
          mood_rating: string;
          positive_notes?: string | null;
          challenge_notes?: string | null;
          mood_tags?: string[];
          type: string;
          behaviors?: string[] | null;
          sleep_hours?: number | null;
          triggers?: string[] | null;
          voice_notes?: string | null;
          photos?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          child_id?: string;
          date?: string;
          mood_rating?: string;
          positive_notes?: string | null;
          challenge_notes?: string | null;
          mood_tags?: string[];
          type?: string;
          behaviors?: string[] | null;
          sleep_hours?: number | null;
          triggers?: string[] | null;
          voice_notes?: string | null;
          photos?: string[] | null;
          created_at?: string;
        };
      };
      preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          color_theme: string;
          font_size: string;
          text_to_speech: boolean;
          reminders: boolean;
          reminder_time: string | null;
          quick_reminders: Record<string, unknown>[] | null;
          custom_reminders: Record<string, unknown>[] | null;
          ai_preferences: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          color_theme?: string;
          font_size?: string;
          text_to_speech?: boolean;
          reminders?: boolean;
          reminder_time?: string | null;
          quick_reminders?: Record<string, unknown>[] | null;
          custom_reminders?: Record<string, unknown>[] | null;
          ai_preferences?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          color_theme?: string;
          font_size?: string;
          text_to_speech?: boolean;
          reminders?: boolean;
          reminder_time?: string | null;
          quick_reminders?: Record<string, unknown>[] | null;
          custom_reminders?: Record<string, unknown>[] | null;
          ai_preferences?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
