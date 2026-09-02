import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getSupabaseClientForToken } from "./supabase-client";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  return {
    req: opts.req,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
};

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const accessToken = getBearerToken(ctx.req);
  if (!accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }

  const supabase = getSupabaseClientForToken(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." });
  }

  return next({
    ctx: {
      ...ctx,
      auth: {
        accessToken,
        user: data.user,
        supabase,
      },
    },
  });
});
