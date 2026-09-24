import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, test } from "bun:test";
import { appRouter } from "../../../app-router";
import { createTRPCRouter, protectedProcedure } from "../../../create-context";
import { getServiceRoleClient } from "../../../supabase-client";

const integrationEnabled =
  process.env.SUPABASE_ACCOUNT_DELETION_INTEGRATION === "true";
const deletionEnvironment = process.env.SUPABASE_ACCOUNT_DELETION_ENV;
const safeEnvironmentConfirmed =
  deletionEnvironment === "non-production" || deletionEnvironment === "staging";

if (integrationEnabled && !safeEnvironmentConfirmed) {
  throw new Error(
    "SUPABASE_ACCOUNT_DELETION_ENV must be non-production or staging when the account-deletion integration suite is enabled",
  );
}

type ServiceClient = ReturnType<typeof getServiceRoleClient>;
type Fixture = {
  targetUserId: string;
  relatedUserId: string;
  targetEmail: string;
  targetProfileId: string;
  relatedProfileId: string;
  childId: string;
  sharedAccessId: string;
  noteId: string;
  commentId: string;
  messageId: string;
  logEntryId: string;
  targetAvatarPaths: string[];
  password: string;
};

const describeIntegration = describe.skipIf(
  !integrationEnabled || !safeEnvironmentConfirmed,
);

const protectedAccountProbe = createTRPCRouter({
  readAccount: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.auth.user.id,
  })),
});

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the integration test`);
  return value;
}

function createPublicClient() {
  return createClient(
    requiredEnv("EXPO_PUBLIC_SUPABASE_URL"),
    requiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function fixtureIds() {
  return {
    targetProfileId: crypto.randomUUID(),
    relatedProfileId: crypto.randomUUID(),
    childId: crypto.randomUUID(),
    sharedAccessId: crypto.randomUUID(),
    noteId: crypto.randomUUID(),
    commentId: crypto.randomUUID(),
    messageId: crypto.randomUUID(),
    logEntryId: crypto.randomUUID(),
  };
}

async function assertRowsAbsent(
  service: ServiceClient,
  table: string,
  column: string,
  ids: string[],
) {
  const { data, error } = await (service.from(table) as any)
    .select("id")
    .in(column, ids);
  expect(error).toBeNull();
  expect(data ?? []).toHaveLength(0);
}

async function assertStorageObjectsAbsent(
  service: ServiceClient,
  paths: string[],
) {
  const storage = service.storage.from("avatars");
  for (const path of paths) {
    const { data, error } = await storage.download(path);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  }
}

async function deleteIfPresent(service: ServiceClient, table: string, column: string, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await (service.from(table) as any).delete().in(column, ids);
  if (error) throw error;
}

async function createFixture(service: ServiceClient, role: "caregiver" | "therapist"): Promise<Fixture> {
  const ids = fixtureIds();
  const from = (table: string) => service.from(table) as any;
  const targetEmail = `account-deletion-target-${crypto.randomUUID()}@example.com`;
  const relatedEmail = `account-deletion-related-${crypto.randomUUID()}@example.com`;
  const password = `Deletion-test-${crypto.randomUUID()}-Aa1!`;

  const createdUsers: string[] = [];
  let targetAvatarPaths: string[] = [];
  try {
    const target = await service.auth.admin.createUser({
      email: targetEmail,
      password,
      email_confirm: true,
    });
    if (target.error || !target.data.user) throw target.error ?? new Error("Target user was not created");
    createdUsers.push(target.data.user.id);

    const related = await service.auth.admin.createUser({
      email: relatedEmail,
      password,
      email_confirm: true,
    });
    if (related.error || !related.data.user) throw related.error ?? new Error("Related user was not created");
    createdUsers.push(related.data.user.id);

    const targetUserId = target.data.user.id;
    const relatedUserId = related.data.user.id;
    const targetIsCaregiver = role === "caregiver";
    const caregiverUserId = targetIsCaregiver ? targetUserId : relatedUserId;
    const therapistUserId = targetIsCaregiver ? relatedUserId : targetUserId;
    const caregiverProfileId = targetIsCaregiver ? ids.targetProfileId : ids.relatedProfileId;
    const therapistProfileId = targetIsCaregiver ? ids.relatedProfileId : ids.targetProfileId;

    const { error: profilesError } = await from("profiles").insert([
      {
        id: caregiverProfileId,
        user_id: caregiverUserId,
        role: "parent",
        caregiver_name: "Account deletion integration caregiver",
        caregiver_email: targetIsCaregiver ? targetEmail : relatedEmail,
      },
      {
        id: therapistProfileId,
        user_id: therapistUserId,
        role: "therapist",
        caregiver_name: "Account deletion integration therapist",
        caregiver_email: targetIsCaregiver ? relatedEmail : targetEmail,
      },
    ]);
    if (profilesError) throw profilesError;

    const { error: childError } = await from("children").insert({
      id: ids.childId,
      profile_id: caregiverProfileId,
      name: "Account deletion integration child",
    });
    if (childError) throw childError;

    const { error: preferencesError } = await from("preferences").insert({
      user_id: targetUserId,
      theme: "dark",
      color_theme: "warm",
      font_size: "medium",
      text_to_speech: false,
      reminders: true,
      reminder_time: "09:00",
    });
    if (preferencesError) throw preferencesError;

    const { error: accessError } = await from("shared_access").insert({
      id: ids.sharedAccessId,
      child_id: ids.childId,
      parent_id: caregiverProfileId,
      therapist_id: therapistProfileId,
      therapist_name: "Account deletion integration therapist",
      therapist_email: targetIsCaregiver ? relatedEmail : targetEmail,
      therapist_role: "integration",
      status: "accepted",
      can_view_logs: true,
      can_view_progress: true,
      can_view_profile: true,
      can_add_notes: true,
      can_add_sessions: true,
      can_comment: true,
      can_export: true,
      readonly_mode: false,
      accepted_at: new Date().toISOString(),
    });
    if (accessError) throw accessError;

    const { error: noteError } = await from("therapist_notes").insert({
      id: ids.noteId,
      child_id: ids.childId,
      therapist_id: therapistProfileId,
      shared_access_id: ids.sharedAccessId,
      session_date: new Date().toISOString().slice(0, 10),
      goals_worked_on: "Integration fixture goal",
      skills_practiced: "Integration fixture skill",
    });
    if (noteError) throw noteError;

    const { error: commentError } = await from("note_comments").insert({
      id: ids.commentId,
      note_id: ids.noteId,
      commenter_id: targetIsCaregiver ? caregiverProfileId : therapistProfileId,
      comment_text: "Integration fixture comment",
    });
    if (commentError) throw commentError;

    const { error: messageError } = await from("chat_messages").insert({
      id: ids.messageId,
      shared_access_id: ids.sharedAccessId,
      sender_id: targetIsCaregiver ? caregiverProfileId : therapistProfileId,
      message_text: "Integration fixture message",
      is_read: false,
    });
    if (messageError) throw messageError;

    const { error: logError } = await from("log_entries").insert({
      id: ids.logEntryId,
      child_id: ids.childId,
      date: new Date().toISOString().slice(0, 10),
      mood_rating: "good",
      positive_notes: "Integration fixture log",
      type: "daily",
    });
    if (logError) throw logError;

    targetAvatarPaths = [
      `${targetUserId}/profile.jpg`,
      ...(targetIsCaregiver
        ? [`${targetUserId}/children/${ids.childId}/avatar.jpg`]
        : []),
    ];
    for (const path of targetAvatarPaths) {
      const { error: uploadError } = await service.storage
        .from("avatars")
        .upload(path, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;
    }

    return {
      targetUserId,
      relatedUserId,
      targetEmail,
      targetProfileId: ids.targetProfileId,
      relatedProfileId: ids.relatedProfileId,
      childId: ids.childId,
      sharedAccessId: ids.sharedAccessId,
      noteId: ids.noteId,
      commentId: ids.commentId,
      messageId: ids.messageId,
      logEntryId: ids.logEntryId,
      targetAvatarPaths,
      password,
    };
  } catch (error) {
    try {
      await cleanupFixture(service, {
        targetUserId: createdUsers[0] ?? "",
        relatedUserId: createdUsers[1] ?? "",
        targetEmail,
        targetProfileId: ids.targetProfileId,
        relatedProfileId: ids.relatedProfileId,
        childId: ids.childId,
        sharedAccessId: ids.sharedAccessId,
        noteId: ids.noteId,
        commentId: ids.commentId,
        messageId: ids.messageId,
        logEntryId: ids.logEntryId,
        targetAvatarPaths,
        password,
      });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Account deletion fixture setup and cleanup failed",
      );
    }
    throw error;
  }
}

async function cleanupFixture(service: ServiceClient, fixture: Fixture) {
  const cleanupErrors: unknown[] = [];
  const attempt = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch (error) {
      cleanupErrors.push(error);
    }
  };

  const allAvatarPaths = [
    ...fixture.targetAvatarPaths,
    `${fixture.relatedUserId}/profile.jpg`,
    `${fixture.relatedUserId}/children/${fixture.childId}/avatar.jpg`,
  ];
  await attempt(async () => {
    const { error } = await service.storage.from("avatars").remove(allAvatarPaths);
    if (error) throw error;
  });

  await attempt(() => deleteIfPresent(service, "note_comments", "id", [fixture.commentId]));
  await attempt(() => deleteIfPresent(service, "therapist_notes", "id", [fixture.noteId]));
  await attempt(() => deleteIfPresent(service, "chat_messages", "id", [fixture.messageId]));
  await attempt(() => deleteIfPresent(service, "log_entries", "id", [fixture.logEntryId]));
  await attempt(() => deleteIfPresent(service, "shared_access", "id", [fixture.sharedAccessId]));
  await attempt(() => deleteIfPresent(service, "children", "id", [fixture.childId]));
  await attempt(() => deleteIfPresent(service, "preferences", "user_id", [fixture.targetUserId]));
  await attempt(() => deleteIfPresent(service, "profiles", "id", [
    fixture.targetProfileId,
    fixture.relatedProfileId,
  ]));
  if (fixture.targetUserId) {
    await attempt(async () => {
      const { error } = await service.auth.admin.deleteUser(fixture.targetUserId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }
  if (fixture.relatedUserId) {
    await attempt(async () => {
      const { error } = await service.auth.admin.deleteUser(fixture.relatedUserId);
      if (error && !/not found/i.test(error.message)) throw error;
    });
  }

  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Account deletion fixture cleanup failed");
  }
}

async function runDeletionFixture(role: "caregiver" | "therapist") {
  const service = getServiceRoleClient();
  const publicClient = createPublicClient();
  const fixture = await createFixture(service, role);

  try {
    const { data: session, error: signInError } = await publicClient.auth.signInWithPassword({
      email: fixture.targetEmail,
      password: fixture.password,
    });
    if (signInError || !session.session) {
      throw signInError ?? new Error("Fixture user did not receive a session");
    }

    await appRouter.createCaller({
      req: new Request("http://integration.test/api/trpc/account.deleteAccount", {
        headers: { authorization: `Bearer ${session.session.access_token}` },
      }),
    }).account.deleteAccount();

    await assertRowsAbsent(service, "profiles", "user_id", [fixture.targetUserId]);
    await assertRowsAbsent(service, "children", "id", [fixture.childId]);
    await assertRowsAbsent(service, "shared_access", "id", [fixture.sharedAccessId]);
    await assertRowsAbsent(service, "therapist_notes", "id", [fixture.noteId]);
    await assertRowsAbsent(service, "note_comments", "id", [fixture.commentId]);
    await assertRowsAbsent(service, "chat_messages", "id", [fixture.messageId]);
    await assertRowsAbsent(service, "log_entries", "id", [fixture.logEntryId]);
    await assertRowsAbsent(service, "preferences", "user_id", [fixture.targetUserId]);
    await assertStorageObjectsAbsent(service, fixture.targetAvatarPaths);

    const { data: deletedUser, error: deletedUserError } =
      await service.auth.admin.getUserById(fixture.targetUserId);
    expect(deletedUser).toBeNull();
    expect(deletedUserError).not.toBeNull();

    await expect(
      protectedAccountProbe.createCaller({
        req: new Request("http://integration.test/api/trpc/account.readAccount", {
          headers: { authorization: `Bearer ${session.session.access_token}` },
        }),
      }).readAccount(),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    });

    const { data: relatedProfile, error: relatedProfileError } =
      await service.from("profiles").select("id").eq("user_id", fixture.relatedUserId);
    expect(relatedProfileError).toBeNull();
    expect(relatedProfile).toHaveLength(1);
  } finally {
    await publicClient.auth.signOut();
    await cleanupFixture(service, fixture);
  }
}

describeIntegration("account.deleteAccount against Supabase", () => {
  beforeAll(() => {
    requiredEnv("EXPO_PUBLIC_SUPABASE_URL");
    requiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  });

  test("deletes an isolated caregiver fixture and its avatar objects", async () => {
    await runDeletionFixture("caregiver");
  });

  test("deletes an isolated therapist fixture and its avatar objects", async () => {
    await runDeletionFixture("therapist");
  });
});
