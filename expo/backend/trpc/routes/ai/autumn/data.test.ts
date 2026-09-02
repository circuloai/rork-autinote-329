import { describe, expect, test } from "bun:test";
import type { User } from "@supabase/supabase-js";
import { loadAutumnData } from "./context";

type Fixture = {
  profile?: { id: string; role: string };
  profileError?: boolean;
  preferenceRow?: { ai_preferences?: { consent?: { status?: string } } } | null;
  preferenceError?: boolean;
  child?: { id: string; age: number; diagnosis: string; common_triggers: string[]; profile_id: string } | null;
  logs?: Array<Record<string, unknown>>;
};

function fakeSupabase(fixture: Fixture) {
  return {
    from(table: string) {
      const filters = new Map<string, unknown>();
      const builder: any = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.set(column, value);
          return builder;
        },
        single: async () => {
          if (table === "profiles") {
            return {
              data: fixture.profile ?? null,
              error: fixture.profileError || !fixture.profile ? new Error("profile missing") : null,
            };
          }
          const belongsToProfile =
            filters.get("profile_id") === fixture.profile?.id &&
            fixture.child?.profile_id === fixture.profile?.id;
          const matchesChild = filters.get("id") === fixture.child?.id;
          return {
            data: fixture.child && belongsToProfile && matchesChild ? fixture.child : null,
            error: fixture.child && belongsToProfile && matchesChild ? null : new Error("child missing"),
          };
        },
        maybeSingle: async () => ({
          data: fixture.preferenceRow ?? null,
          error: fixture.preferenceError ? new Error("preference lookup failed") : null,
        }),
        order: () => builder,
        limit: async () => ({ data: fixture.logs ?? [], error: null }),
      };
      return builder;
    },
  };
}

const user = { id: "user-caregiver" } as User;
const child = {
  id: "child-owned",
  age: 8,
  diagnosis: "Autism spectrum disorder",
  common_triggers: ["loud noise"],
  profile_id: "profile-caregiver",
};

describe("loadAutumnData account boundaries", () => {
  test("loads data for an authorized caregiver and only their child", async () => {
    const data = await loadAutumnData(
      fakeSupabase({
        profile: { id: "profile-caregiver", role: "caregiver" },
        preferenceRow: { ai_preferences: { consent: { status: "granted" } } },
        child,
        logs: [{ date: "2026-09-02", mood_rating: 4, mood_tags: ["calm"], type: "daily" }],
      }) as any,
      user,
      child.id,
    );

    expect(data.child).toEqual(child);
    expect(data.logs).toEqual([{
      date: "2026-09-02",
      mood: "4",
      tags: ["calm"],
      triggers: [],
      sleepHours: undefined,
      type: "daily",
    }]);
  });

  test("rejects missing consent before loading child data", async () => {
    await expect(loadAutumnData(
      fakeSupabase({
        profile: { id: "profile-caregiver", role: "caregiver" },
        preferenceRow: { ai_preferences: { consent: { status: "withdrawn" } } },
        child,
      }) as any,
      user,
      child.id,
    )).rejects.toThrow("AI_CONSENT_REQUIRED");
  });

  test("blocks therapist accounts and children owned by another profile", async () => {
    await expect(loadAutumnData(
      fakeSupabase({
        profile: { id: "profile-therapist", role: "therapist" },
        preferenceRow: { ai_preferences: { consent: { status: "granted" } } },
        child,
      }) as any,
      user,
      child.id,
    )).rejects.toThrow("CAREGIVER_ONLY");

    await expect(loadAutumnData(
      fakeSupabase({
        profile: { id: "profile-other", role: "caregiver" },
        preferenceRow: { ai_preferences: { consent: { status: "granted" } } },
        child,
      }) as any,
      user,
      child.id,
    )).rejects.toThrow("CHILD_NOT_FOUND");
  });
});