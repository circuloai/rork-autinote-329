import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "@/backend/trpc/create-context";
import { buildMinimalAutumnContext, loadAutumnData } from "./context";
import { buildAutumnPrompt } from "./prompt";
import { generateAutumnResponse } from "../openai";

type RateState = { minuteStartedAt: number; minuteCount: number; hourStartedAt: number; hourCount: number };
const rateState = new Map<string, RateState>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const current = rateState.get(userId) || {
    minuteStartedAt: now,
    minuteCount: 0,
    hourStartedAt: now,
    hourCount: 0,
  };
  if (now - current.minuteStartedAt >= 60_000) {
    current.minuteStartedAt = now;
    current.minuteCount = 0;
  }
  if (now - current.hourStartedAt >= 3_600_000) {
    current.hourStartedAt = now;
    current.hourCount = 0;
  }
  if (
    current.minuteCount >= Number(process.env.AI_CHAT_BURST_LIMIT || 5) ||
    current.hourCount >= Number(process.env.AI_CHAT_REQUESTS_PER_HOUR || 30)
  ) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Autumn is taking a short break. Please try again later.",
    });
  }
  current.minuteCount += 1;
  current.hourCount += 1;
  rateState.set(userId, current);
}

const inputSchema = z.object({
  childId: z.string().uuid(),
  message: z.string().trim().min(1).max(500),
  recentMessages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(800),
    })
  ).max(4),
  useChildContext: z.boolean().default(true),
  style: z.enum(["warm", "professional", "brief"]).default("warm"),
  focus: z.array(z.string().max(30)).max(5).default([]),
  verbosity: z.enum(["short", "balanced", "detailed"]).default("balanced"),
});

export default protectedProcedure
  .input(inputSchema)
  .mutation(async ({ ctx, input }) => {
    checkRateLimit(ctx.auth.user.id);

    let data;
    try {
      data = await loadAutumnData(ctx.auth.supabase, ctx.auth.user, input.childId);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "CAREGIVER_ONLY") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Autumn is available from the caregiver account." });
      }
      if (code === "CHILD_NOT_FOUND") {
        throw new TRPCError({ code: "FORBIDDEN", message: "That child profile is not available." });
      }
      if (code === "AI_CONSENT_REQUIRED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please review Autumn’s AI privacy notice before continuing." });
      }
      if (code === "CONSENT_STORE_UNAVAILABLE") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Autumn privacy settings are not ready yet. Please try again shortly." });
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Autumn could not load the selected profile." });
    }

    const context = buildMinimalAutumnContext({
      message: input.message,
      useChildContext: input.useChildContext,
      child: data.child,
      logs: data.logs,
    });

    const prompt = buildAutumnPrompt({
      style: input.style,
      focus: input.focus,
      verbosity: input.verbosity,
      history: input.recentMessages,
      message: input.message,
      context,
    });

    try {
      const response = await generateAutumnResponse({
        ...prompt,
        maxOutputTokens: input.verbosity === "detailed" ? 450 : input.verbosity === "short" ? 140 : 280,
      });
      console.log("[ai] Autumn response completed", {
        model: process.env.OPENAI_AUTUMN_MODEL || "gpt-5-mini",
        messageLength: input.message.length,
        contextKeys: Object.keys(context),
      });
      return { response };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "OPENAI_NOT_CONFIGURED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Autumn is not configured yet. Please try again later." });
      }
      if (message.includes("aborted") || message.includes("timeout")) {
        throw new TRPCError({ code: "TIMEOUT", message: "Autumn took too long to respond. Please try again." });
      }
      console.error("[ai] Autumn provider error", { name: error instanceof Error ? error.name : "unknown" });
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Autumn is temporarily unavailable. Please try again." });
    }
  });