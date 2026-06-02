import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
import { getSupabaseClient } from "@/backend/trpc/supabase-client";

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function codeExpiry(): string {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

export const requestCode = publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const supabase = getSupabaseClient();
    const code = generateCode();

    const { error } = await supabase
      .from("password_reset_codes")
      .insert({
        email: input.email.toLowerCase().trim(),
        code,
        expires_at: codeExpiry(),
      });

    if (error) {
      console.error("[reset] Failed to store code:", error.message);
      return {
        success: false,
        message: "Failed to generate reset code. Please try again.",
      };
    }

    // In production, send the code via email/SMS here.
    // For now we return success — the code is stored in the DB.
    console.log(`[reset] Code ${code} generated for ${input.email}`);
    return {
      success: true,
      message: "If an account exists with that email, a verification code has been sent.",
    };
  });

export const verifyCode = publicProcedure
  .input(z.object({ email: z.string().email(), code: z.string().length(4) }))
  .mutation(async ({ input }) => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("password_reset_codes")
      .select("id")
      .eq("email", input.email.toLowerCase().trim())
      .eq("code", input.code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
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
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc(
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
