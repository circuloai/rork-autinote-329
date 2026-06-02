import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { requestCode, verifyCode, resetPassword } from "./routes/auth/forgot-password/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    forgotPassword: createTRPCRouter({
      requestCode,
      verifyCode,
      resetPassword,
    }),
  }),
});

export type AppRouter = typeof appRouter;
