import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { getServiceRoleClient } from "@/backend/trpc/supabase-client";

type SupabaseServiceClient = ReturnType<typeof getServiceRoleClient>;
type IdRow = { id: string };

async function selectIds(
  supabase: SupabaseServiceClient,
  table: string,
  column: string,
  ids: string[],
): Promise<IdRow[]> {
  if (ids.length === 0) return [];

  const { data, error } = await (supabase.from(table) as any)
    .select("id")
    .in(column, ids);
  if (error) throw error;
  return (data ?? []) as IdRow[];
}

async function deleteAvatarFiles(
  supabase: SupabaseServiceClient,
  userId: string,
  childIds: string[],
) {
  const paths = [
    `${userId}/profile.jpg`,
    ...childIds.map((childId) => `${userId}/children/${childId}/avatar.jpg`),
  ];
  const { error } = await supabase.storage.from("avatars").remove(paths);
  if (!error) return;

  // Older accounts may predate the avatars bucket. In that case there are no
  // stored avatar objects to remove; other storage failures must abort the
  // deletion rather than silently leaving account data behind.
  const statusCode = String((error as { statusCode?: string | number }).statusCode ?? "");
  const bucketMissing =
    statusCode === "404" || /bucket.*not found|not found.*bucket/i.test(error.message);
  if (!bucketMissing) throw error;
}

export const deleteAccount = protectedProcedure.mutation(async ({ ctx }) => {
  const userId = ctx.auth.user.id;
  let supabase: SupabaseServiceClient;

  try {
    supabase = getServiceRoleClient();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId);
    if (profilesError) throw profilesError;

    const profileIds = ((profiles ?? []) as IdRow[]).map((profile) => profile.id);

    const children = await selectIds(
      supabase,
      "children",
      "profile_id",
      profileIds,
    );
    const childIds = children.map((child) => child.id);

    // Storage objects cannot participate in the PostgreSQL transaction below.
    // Remove them first so a storage failure leaves all database rows intact.
    await deleteAvatarFiles(supabase, userId, childIds);

    const { error: dataDeleteError } = await (supabase as any).rpc(
      "delete_account_data",
      { p_user_id: userId },
    );
    if (dataDeleteError) throw dataDeleteError;

    // The auth user is deliberately deleted last. If this call fails, the
    // account data RPC is safe to retry and will simply find no rows.
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) throw authDeleteError;

    return { deleted: true };
  } catch (error) {
    console.error("[account] Account deletion failed", {
      userId,
      message: error instanceof Error ? error.message : "unknown error",
    });
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not delete your account. Please try again.",
    });
  }
});
