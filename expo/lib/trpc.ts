import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  console.warn('EXPO_PUBLIC_RORK_API_BASE_URL not set, using fallback');
  return 'http://localhost:3000';
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
        }),
      ],
    });
    return trpcClientInstance;
  } catch (error) {
    console.error('Failed to create tRPC client:', error);
    trpcClientInstance = trpc.createClient({
      links: [
        httpLink({
          url: 'http://localhost:3000/api/trpc',
          transformer: superjson,
        }),
      ],
    });
    return trpcClientInstance;
  }
}

export const trpcClient = getTRPCClient();
