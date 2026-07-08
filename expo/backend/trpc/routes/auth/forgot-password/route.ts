import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { getServiceRoleClient } from "@/backend/trpc/supabase-client";

// All three mutations use the service-role Supabase client because the
// underlying RPC functions have REVOKE EXECUTE for the anon and authenticated
// roles — only service_role can call them. This prevents external attackers
// from forging reset records directly via the public Supabase REST API.

export const requestCode = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const supabase = getServiceRoleClient();

    // Code and expiry are generated server-side inside the SQL function.
    // The caller cannot supply its own code or expiry value.
    const { data, error } = await (supabase as any).rpc(
      "create_password_reset_code",
      { p_email: input.email.toLowerCase().trim() }
    );

    if (error) {
      console.error("[reset] Failed to store code:", error.message);
      return {
        success: false,
        message: "Failed to generate reset code. Please try again.",
      };
    }

    const result = data as { success: boolean; code?: string; message?: string } | null;
    if (!result?.success) {
      console.error("[reset] RPC rejected code creation:", result?.message);
      return {
        success: false,
        message: "Failed to generate reset code. Please try again.",
      };
    }

    // In production, dispatch result.code via email/SMS here.
    // Never log the actual code in production logs.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[reset] Code generated for ${input.email}: ${result.code}`);
    }

    return {
      success: true,
      message: "If an account exists with that email, a verification code has been sent.",
    };
  });

export const verifyCode = publicProcedure
  .input(z.object({ email: z.string().email(), code: z.string().length(4) }))
  .mutation(async ({ input }) => {
    const supabase = getServiceRoleClient();

    const { data, error } = await (supabase as any).rpc("check_reset_code", {
      p_email: input.email.toLowerCase().trim(),
      p_code: input.code,
    });

    if (error) {
      console.error("[reset] Failed to verify code:", error.message);
      return { success: false, message: "Invalid or expired code" };
    }

    const result = data as { success: boolean; message: string } | null;
    if (!result?.success) {
      return { success: false, message: "Invalid or expired code" };
    }

    return { success: true, message: "Code verified" };
  });

export const resetPassword = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      code: z.string().length(4),
      newPassword: z.string().min(8),
    })
  )
  .mutation(async ({ input }) => {
    const supabase = getServiceRoleClient();

    const { data, error } = await (supabase as any).rpc(
      "verify_reset_code_and_update_password",
      {
        p_email: input.email.toLowerCase().trim(),
        p_code: input.code,
        p_new_password: input.newPassword,
      }
    );

    if (error) {
      console.error("[reset] RPC error:", error.message);
      return { success: false, message: "Failed to reset password. Please try again." };
    }

    const result = data as { success: boolean; message: string } | null;
    if (!result?.success) {
      return { success: false, message: result?.message || "Invalid or expired code" };
    }

    return { success: true, message: "Password has been reset successfully" };
  });
