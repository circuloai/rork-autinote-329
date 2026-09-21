import { describe, expect, mock, test } from "bun:test";

type Row = Record<string, string>;
type Tables = Record<string, Row[]>;

type Fixture = {
  tables: Tables;
  removedAvatarPaths: string[];
  deletedAuthUsers: string[];
  rpcCalls: { name: string; args: Record<string, string> }[];
  rpcError?: Error;
};

let activeFixture: Fixture;
let authenticatedUserId: string | null = null;

function createFixture(tables: Tables): Fixture {
  return {
    tables,
    removedAvatarPaths: [],
    deletedAuthUsers: [],
    rpcCalls: [],
  };
}

function createFakeServiceClient(fixture: Fixture) {
  const removeRows = (table: string, shouldRemove: (row: Row) => boolean) => {
    const rows = fixture.tables[table];
    if (!rows) return;
    fixture.tables[table] = rows.filter((row) => !shouldRemove(row));
  };

  return {
    from(table: string) {
      const filters = new Map<string, string[]>();
      let operation: "select" | "delete" = "select";
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: string) => {
          filters.set(column, [value]);
          return builder;
        },
        in: (column: string, values: string[]) => {
          filters.set(column, values);
          return builder;
        },
        delete: () => {
          operation = "delete";
          return builder;
        },
        then: (resolve: (result: { data: Row[] | null; error: null }) => unknown) => {
          const rows = fixture.tables[table] ?? [];
          const matches = rows.filter((row) =>
            Array.from(filters.entries()).every(([column, values]) => values.includes(row[column])),
          );

          if (operation === "delete") {
            fixture.tables[table] = rows.filter((row) => !matches.includes(row));
            return Promise.resolve(resolve({ data: null, error: null }));
          }

          return Promise.resolve(resolve({
            data: matches.map((row) => ({ id: row.id })),
            error: null,
          }));
        },
      };
      return builder;
    },
    rpc: async (name: string, args: Record<string, string>) => {
      fixture.rpcCalls.push({ name, args });
      if (fixture.rpcError) return { data: null, error: fixture.rpcError };

      const profileIds = new Set(
        (fixture.tables.profiles ?? [])
          .filter((profile) => profile.user_id === args.p_user_id)
          .map((profile) => profile.id),
      );
      const childIds = new Set(
        (fixture.tables.children ?? [])
          .filter((child) => profileIds.has(child.profile_id))
          .map((child) => child.id),
      );
      const sharedAccessIds = new Set(
        (fixture.tables.shared_access ?? [])
          .filter(
            (access) =>
              profileIds.has(access.parent_id) ||
              profileIds.has(access.therapist_id) ||
              childIds.has(access.child_id),
          )
          .map((access) => access.id),
      );
      const noteIds = new Set(
        (fixture.tables.therapist_notes ?? [])
          .filter(
            (note) =>
              childIds.has(note.child_id) ||
              profileIds.has(note.therapist_id) ||
              sharedAccessIds.has(note.shared_access_id),
          )
          .map((note) => note.id),
      );

      removeRows(
        "note_comments",
        (comment) => profileIds.has(comment.commenter_id) || noteIds.has(comment.note_id),
      );
      removeRows(
        "therapist_notes",
        (note) =>
          childIds.has(note.child_id) ||
          profileIds.has(note.therapist_id) ||
          sharedAccessIds.has(note.shared_access_id),
      );
      removeRows(
        "chat_messages",
        (message) =>
          profileIds.has(message.sender_id) ||
          sharedAccessIds.has(message.shared_access_id),
      );
      removeRows("log_entries", (entry) => childIds.has(entry.child_id));
      removeRows("shared_access", (access) => sharedAccessIds.has(access.id));
      removeRows("children", (child) => childIds.has(child.id));
      removeRows("preferences", (preferences) => preferences.user_id === args.p_user_id);
      removeRows("profiles", (profile) => profileIds.has(profile.id));

      return { data: null, error: null };
    },
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          fixture.removedAvatarPaths.push(...paths);
          return { data: null, error: null };
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          fixture.deletedAuthUsers.push(userId);
          return { data: { user: null }, error: null };
        },
      },
    },
  };
}

mock.module("@/backend/trpc/supabase-client", () => ({
  getServiceRoleClient: () => createFakeServiceClient(activeFixture),
  getSupabaseClientForToken: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: authenticatedUserId ? { id: authenticatedUserId } : null,
        },
        error: authenticatedUserId ? null : new Error("invalid token"),
      }),
    },
  }),
}));

mock.module("../../../supabase-client", () => ({
  getServiceRoleClient: () => createFakeServiceClient(activeFixture),
  getSupabaseClientForToken: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: authenticatedUserId ? { id: authenticatedUserId } : null,
        },
        error: authenticatedUserId ? null : new Error("invalid token"),
      }),
    },
  }),
}));

const { appRouter } = await import("../../../app-router");

function authenticatedCaller() {
  return appRouter.createCaller({
    req: new Request("http://localhost/api/trpc/account.deleteAccount", {
      headers: { authorization: "Bearer valid-token" },
    }),
  });
}

describe("account.deleteAccount", () => {
  test("deletes caregiver-owned records and the auth user", async () => {
    authenticatedUserId = "user-caregiver";
    activeFixture = createFixture({
      profiles: [
        { id: "profile-caregiver", user_id: "user-caregiver" },
        { id: "profile-unrelated", user_id: "user-unrelated" },
      ],
      children: [
        { id: "child-owned", profile_id: "profile-caregiver" },
        { id: "child-unrelated", profile_id: "profile-unrelated" },
      ],
      shared_access: [
        { id: "access-owned", parent_id: "profile-caregiver", therapist_id: "profile-therapist", child_id: "child-owned" },
        { id: "access-unrelated", parent_id: "profile-unrelated", therapist_id: "profile-therapist", child_id: "child-unrelated" },
      ],
      therapist_notes: [
        { id: "note-owned", child_id: "child-owned", therapist_id: "profile-therapist", shared_access_id: "access-owned" },
        { id: "note-unrelated", child_id: "child-unrelated", therapist_id: "profile-therapist", shared_access_id: "access-unrelated" },
      ],
      note_comments: [
        { id: "comment-owned", note_id: "note-owned", commenter_id: "profile-therapist" },
        { id: "comment-unrelated", note_id: "note-unrelated", commenter_id: "profile-therapist" },
      ],
      chat_messages: [
        { id: "message-owned", shared_access_id: "access-owned", sender_id: "profile-therapist" },
        { id: "message-unrelated", shared_access_id: "access-unrelated", sender_id: "profile-therapist" },
      ],
      log_entries: [
        { id: "log-owned", child_id: "child-owned" },
        { id: "log-unrelated", child_id: "child-unrelated" },
      ],
      preferences: [
        { id: "preferences-owned", user_id: "user-caregiver" },
        { id: "preferences-unrelated", user_id: "user-unrelated" },
      ],
    });

    await expect(authenticatedCaller().account.deleteAccount()).resolves.toEqual({ deleted: true });

    expect(activeFixture.tables).toEqual({
      profiles: [{ id: "profile-unrelated", user_id: "user-unrelated" }],
      children: [{ id: "child-unrelated", profile_id: "profile-unrelated" }],
      shared_access: [{ id: "access-unrelated", parent_id: "profile-unrelated", therapist_id: "profile-therapist", child_id: "child-unrelated" }],
      therapist_notes: [{ id: "note-unrelated", child_id: "child-unrelated", therapist_id: "profile-therapist", shared_access_id: "access-unrelated" }],
      note_comments: [{ id: "comment-unrelated", note_id: "note-unrelated", commenter_id: "profile-therapist" }],
      chat_messages: [{ id: "message-unrelated", shared_access_id: "access-unrelated", sender_id: "profile-therapist" }],
      log_entries: [{ id: "log-unrelated", child_id: "child-unrelated" }],
      preferences: [{ id: "preferences-unrelated", user_id: "user-unrelated" }],
    });
    expect(activeFixture.removedAvatarPaths).toEqual([
      "user-caregiver/profile.jpg",
      "user-caregiver/children/child-owned/avatar.jpg",
    ]);
    expect(activeFixture.deletedAuthUsers).toEqual(["user-caregiver"]);
    expect(activeFixture.rpcCalls).toEqual([
      { name: "delete_account_data", args: { p_user_id: "user-caregiver" } },
    ]);
  });

  test("deletes therapist-linked access, notes, comments, and messages", async () => {
    authenticatedUserId = "user-therapist";
    activeFixture = createFixture({
      profiles: [
        { id: "profile-therapist", user_id: "user-therapist" },
        { id: "profile-caregiver", user_id: "user-caregiver" },
      ],
      children: [{ id: "child-caregiver", profile_id: "profile-caregiver" }],
      shared_access: [
        { id: "access-therapist", parent_id: "profile-caregiver", therapist_id: "profile-therapist", child_id: "child-caregiver" },
      ],
      therapist_notes: [
        { id: "note-therapist", child_id: "child-caregiver", therapist_id: "profile-therapist", shared_access_id: "access-therapist" },
      ],
      note_comments: [
        { id: "comment-therapist", note_id: "note-therapist", commenter_id: "profile-therapist" },
      ],
      chat_messages: [
        { id: "message-therapist", shared_access_id: "access-therapist", sender_id: "profile-therapist" },
      ],
      preferences: [{ id: "preferences-therapist", user_id: "user-therapist" }],
    });

    await expect(authenticatedCaller().account.deleteAccount()).resolves.toEqual({ deleted: true });

    expect(activeFixture.tables).toEqual({
      profiles: [{ id: "profile-caregiver", user_id: "user-caregiver" }],
      children: [{ id: "child-caregiver", profile_id: "profile-caregiver" }],
      shared_access: [],
      therapist_notes: [],
      note_comments: [],
      chat_messages: [],
      preferences: [],
    });
    expect(activeFixture.removedAvatarPaths).toEqual(["user-therapist/profile.jpg"]);
    expect(activeFixture.deletedAuthUsers).toEqual(["user-therapist"]);
    expect(activeFixture.rpcCalls).toEqual([
      { name: "delete_account_data", args: { p_user_id: "user-therapist" } },
    ]);
  });

  test("preserves database rows and auth user when atomic cleanup fails", async () => {
    authenticatedUserId = "user-retry";
    activeFixture = createFixture({
      profiles: [{ id: "profile-retry", user_id: "user-retry" }],
      children: [{ id: "child-retry", profile_id: "profile-retry" }],
      preferences: [{ id: "preferences-retry", user_id: "user-retry" }],
    });
    activeFixture.rpcError = new Error("database cleanup failed");
    const before = structuredClone(activeFixture.tables);

    await expect(authenticatedCaller().account.deleteAccount()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "We could not delete your account. Please try again.",
    });

    expect(activeFixture.tables).toEqual(before);
    expect(activeFixture.deletedAuthUsers).toEqual([]);
    expect(activeFixture.rpcCalls).toEqual([
      { name: "delete_account_data", args: { p_user_id: "user-retry" } },
    ]);
  });

  test("does not delete records when authentication fails", async () => {
    authenticatedUserId = null;
    activeFixture = createFixture({
      profiles: [{ id: "profile-protected", user_id: "user-protected" }],
      preferences: [{ id: "preferences-protected", user_id: "user-protected" }],
    });
    const before = structuredClone(activeFixture.tables);

    await expect(authenticatedCaller().account.deleteAccount()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    expect(activeFixture.tables).toEqual(before);
    expect(activeFixture.removedAvatarPaths).toEqual([]);
    expect(activeFixture.deletedAuthUsers).toEqual([]);
  });
});