import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { getServiceRoleClient } from "@/backend/trpc/supabase-client";

type SupabaseServiceClient = ReturnType<typeof getServiceRoleClient>;
type IdRow = { id: string };

async function deleteByIds(
  supabase: SupabaseServiceClient,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) return;

  const { error } = await (supabase.from(table) as any).delete().in(column, ids);
  if (error) throw error;
}

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

    const [children, parentAccess, therapistAccess] = await Promise.all([
      selectIds(supabase, "children", "profile_id", profileIds),
      selectIds(supabase, "shared_access", "parent_id", profileIds),
      selectIds(supabase, "shared_access", "therapist_id", profileIds),
    ]);

    const childIds = children.map((child) => child.id);
    const childAccess = await selectIds(supabase, "shared_access", "child_id", childIds);
    const sharedAccessIds = Array.from(
      new Set([
        ...parentAccess.map((access) => access.id),
        ...therapistAccess.map((access) => access.id),
        ...childAccess.map((access) => access.id),
      ]),
    );

    // Collect notes before deleting their child/access rows so comments can
    // be removed explicitly even when the database does not cascade them.
    const notesResult = await (async () => {
      const queries: Promise<IdRow[]>[] = [];
      if (childIds.length > 0) {
        queries.push(selectIds(supabase, "therapist_notes", "child_id", childIds));
      }
      if (profileIds.length > 0) {
        queries.push(selectIds(supabase, "therapist_notes", "therapist_id", profileIds));
      }
      if (sharedAccessIds.length > 0) {
        queries.push(selectIds(supabase, "therapist_notes", "shared_access_id", sharedAccessIds));
      }

      const results = await Promise.all(queries);
      return results.flat();
    })();

    const noteIds = Array.from(new Set(notesResult.map((note) => note.id)));

    // Delete dependent records first. This handles both caregiver-owned data
    // and records created through therapist sharing relationships.
    await deleteAvatarFiles(supabase, userId, childIds);
    await deleteByIds(supabase, "note_comments", "note_id", noteIds);
    await deleteByIds(supabase, "note_comments", "commenter_id", profileIds);
    await deleteByIds(supabase, "therapist_notes", "id", noteIds);
    await deleteByIds(supabase, "chat_messages", "shared_access_id", sharedAccessIds);
    await deleteByIds(supabase, "chat_messages", "sender_id", profileIds);
    await deleteByIds(supabase, "log_entries", "child_id", childIds);
    await deleteByIds(supabase, "shared_access", "id", sharedAccessIds);
    await deleteByIds(supabase, "children", "id", childIds);
    await deleteByIds(supabase, "preferences", "user_id", [userId]);
    await deleteByIds(supabase, "profiles", "id", profileIds);

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
