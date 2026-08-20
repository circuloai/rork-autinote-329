import type { SupabaseClient, User } from "@supabase/supabase-js";

const AGE_BANDS = [
  { max: 5, label: "early childhood" },
  { max: 9, label: "early school age" },
  { max: 13, label: "school age" },
  { max: 17, label: "teenager" },
  { max: Number.POSITIVE_INFINITY, label: "adult" },
];

const CONTEXT_TERMS =
  /\b(child|son|daughter|kid|pattern|recent|log|trigger|meltdown|sensory|routine|sleep|school|behavior|behaviour|emotion|communicat|progress|overwhelm|calm)\b/i;

const AGE_TERMS = /\b(age|year old|school|development|developing|grade)\b/i;
const LOG_TERMS = /\b(pattern|recent|log|trigger|meltdown|progress|what happened|last week)\b/i;

export type AutumnLog = {
  date: string;
  mood: string;
  tags: string[];
  triggers: string[];
  sleepHours?: number;
  type: string;
};

export type AutumnContext = {
  ageBand?: string;
  supportContext?: string;
  relevantTriggers?: string[];
  recentObservations?: Array<{
    relativeDate: string;
    mood: string;
    tags: string[];
    triggers: string[];
    sleepHours?: number;
  }>;
};

function asStringArray(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, maxItems);
}

function getAgeBand(age: number | null | undefined) {
  if (typeof age !== "number" || !Number.isFinite(age) || age <= 0) return undefined;
  return AGE_BANDS.find((band) => age <= band.max)?.label;
}

function getSupportContext(diagnosis: string | null | undefined) {
  const value = diagnosis?.toLowerCase() || "";
  if (!value) return undefined;
  if (value.includes("autis") || value.includes("asd")) return "autism support";
  if (value.includes("adhd") || value.includes("attention")) return "attention and regulation support";
  return "additional developmental support";
}

function relativeDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "recently";
  const days = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return "recently";
}

function logMatchesPrompt(log: AutumnLog, message: string) {
  const searchable = [
    log.mood,
    ...log.tags,
    ...log.triggers,
    log.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const words = message.toLowerCase().match(/[a-z]{4,}/g) || [];
  return words.some((word) => searchable.includes(word));
}

export function buildMinimalAutumnContext({
  message,
  useChildContext,
  child,
  logs,
}: {
  message: string;
  useChildContext: boolean;
  child: {
    age: number | null;
    diagnosis?: string | null;
    common_triggers?: unknown;
  };
  logs: AutumnLog[];
}): AutumnContext {
  if (!useChildContext || !CONTEXT_TERMS.test(message)) return {};

  const context: AutumnContext = {};
  if (AGE_TERMS.test(message)) context.ageBand = getAgeBand(child.age);
  context.supportContext = getSupportContext(child.diagnosis);

  if (CONTEXT_TERMS.test(message)) {
    context.relevantTriggers = asStringArray(child.common_triggers, 6);
  }

  if (LOG_TERMS.test(message)) {
    const matchingLogs = logs
      .filter((log) => logMatchesPrompt(log, message))
      .slice(0, 2);
    const selectedLogs = matchingLogs.length > 0 ? matchingLogs : logs.slice(0, 2);
    context.recentObservations = selectedLogs.map((log) => ({
      relativeDate: relativeDate(log.date),
      mood: log.mood,
      tags: log.tags.slice(0, 5),
      triggers: log.triggers.slice(0, 5),
      ...(typeof log.sleepHours === "number" ? { sleepHours: log.sleepHours } : {}),
    }));
  }

  return context;
}

export async function loadAutumnData(
  supabase: SupabaseClient,
  user: User,
  childId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }
  if (profile.role === "therapist") {
    throw new Error("CAREGIVER_ONLY");
  }

  const { data: preferenceRow, error: preferenceError } = await supabase
    .from("preferences")
    .select("ai_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  if (preferenceError) {
    throw new Error("CONSENT_STORE_UNAVAILABLE");
  }
  if ((preferenceRow as any)?.ai_preferences?.consent?.status !== "granted") {
    throw new Error("AI_CONSENT_REQUIRED");
  }

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, age, diagnosis, common_triggers, profile_id")
    .eq("id", childId)
    .eq("profile_id", profile.id)
    .single();

  if (childError || !child) {
    throw new Error("CHILD_NOT_FOUND");
  }

  const { data: logs } = await supabase
    .from("log_entries")
    .select("date, mood_rating, mood_tags, type, behaviors, sleep_hours, triggers")
    .eq("child_id", childId)
    .order("date", { ascending: false })
    .limit(14);

  return {
    child,
    logs: (logs || []).map((log) => ({
      date: String(log.date || ""),
      mood: String(log.mood_rating || "unknown"),
      tags: asStringArray(log.mood_tags),
      triggers: asStringArray(log.triggers || log.behaviors),
      sleepHours: typeof log.sleep_hours === "number" ? log.sleep_hours : undefined,
      type: String(log.type || "log"),
    })),
  };
}