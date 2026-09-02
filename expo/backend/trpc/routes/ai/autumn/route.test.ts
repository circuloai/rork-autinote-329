import { describe, expect, test } from "bun:test";
import {
  checkRateLimit,
  mapAutumnDataFailure,
  mapAutumnProviderFailure,
} from "./route";

describe("Autumn authorization and provider failures", () => {
  test("maps account and privacy failures to safe client messages", () => {
    expect(mapAutumnDataFailure(new Error("CAREGIVER_ONLY"))).toEqual({
      code: "FORBIDDEN",
      message: "Autumn is available from the caregiver account.",
    });
    expect(mapAutumnDataFailure(new Error("CHILD_NOT_FOUND"))).toEqual({
      code: "FORBIDDEN",
      message: "That child profile is not available.",
    });
    expect(mapAutumnDataFailure(new Error("AI_CONSENT_REQUIRED"))).toEqual({
      code: "PRECONDITION_FAILED",
      message: "Please review Autumn’s AI privacy notice before continuing.",
    });
    expect(mapAutumnDataFailure(new Error("unexpected database error")).code).toBe("INTERNAL_SERVER_ERROR");
  });

  test("maps provider failures without exposing provider details", () => {
    expect(mapAutumnProviderFailure(new Error("OPENAI_NOT_CONFIGURED")).code).toBe("PRECONDITION_FAILED");
    expect(mapAutumnProviderFailure(new Error("request timeout after 15000ms"))).toEqual({
      code: "TIMEOUT",
      message: "Autumn took too long to respond. Please try again.",
    });
    expect(mapAutumnProviderFailure(new Error("upstream returned a private provider response"))).toEqual({
      code: "SERVICE_UNAVAILABLE",
      message: "Autumn is temporarily unavailable. Please try again.",
    });
  });

  test("enforces the configured burst limit per account", () => {
    const previousBurstLimit = process.env.AI_CHAT_BURST_LIMIT;
    process.env.AI_CHAT_BURST_LIMIT = "1";
    const userId = `rate-test-${Date.now()}-${Math.random()}`;
    try {
      checkRateLimit(userId);
      expect(() => checkRateLimit(userId)).toThrow();
    } finally {
      if (previousBurstLimit === undefined) {
        delete process.env.AI_CHAT_BURST_LIMIT;
      } else {
        process.env.AI_CHAT_BURST_LIMIT = previousBurstLimit;
      }
    }
  });
});