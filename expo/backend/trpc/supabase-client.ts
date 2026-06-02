import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kedbkwjhwylctwbqdslb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZGJrd2pod3lsY3R3YnFkc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODc5NTgsImV4cCI6MjA3OTk2Mzk1OH0.6on7Nk0RU9ygoXc03hAn-8QqpgIdQeLAWGDt7AFO0cg';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
