import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = 'https://kedbkwjhwylctwbqdslb.supabase.co';

function pickSupabaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (
    configuredUrl &&
    /^https:\/\//i.test(configuredUrl) &&
    (configuredUrl.includes('.supabase.co') || configuredUrl.includes('.supabase.com')) &&
    !configuredUrl.includes('placeholder')
  ) {
    return configuredUrl.replace('.supabase.com', '.supabase.co');
  }
  return FALLBACK_URL;
}

const supabaseUrl = pickSupabaseUrl();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZGJrd2pod3lsY3R3YnFkc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzODc5NTgsImV4cCI6MjA3OTk2Mzk1OH0.6on7Nk0RU9ygoXc03hAn-8QqpgIdQeLAWGDt7AFO0cg';

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return client;
}

export function getSupabaseClientForToken(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

// Service-role client for server-side operations that must not be reachable
// from the public anon key (e.g. password-reset RPC functions). This client
// uses SUPABASE_SERVICE_ROLE_KEY which is a server-only secret — never expose
// it to the client bundle or log it.
let serviceClient: ReturnType<typeof createClient> | null = null;

export function getServiceRoleClient() {
  if (!serviceClient) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured. " +
        "Set it as a secret in the Replit environment."
      );
    }
    serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serviceClient;
}
