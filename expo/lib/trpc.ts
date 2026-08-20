import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  console.warn('EXPO_PUBLIC_API_BASE_URL not set, using local API fallback');
  return 'http://localhost:3001';
};

let trpcClientInstance: ReturnType<typeof trpc.createClient> | null = null;

export function getTRPCClient() {
  if (trpcClientInstance) return trpcClientInstance;
  
  try {
    trpcClientInstance = trpc.createClient({
      links: [
        httpLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers: async () => {
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {};
          },
        }),
      ],
    });
    return trpcClientInstance;
  } catch (error) {
    console.error('Failed to create tRPC client:', error);
    trpcClientInstance = trpc.createClient({
      links: [
        httpLink({
          url: 'http://localhost:3001/api/trpc',
          transformer: superjson,
          headers: async () => {
            const { data } = await supabase.auth.getSession();
            return data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {};
          },
        }),
      ],
    });
    return trpcClientInstance;
  }
}

export const trpcClient = getTRPCClient();
