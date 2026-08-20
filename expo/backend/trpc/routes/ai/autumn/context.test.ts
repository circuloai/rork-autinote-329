import { describe, expect, test } from "bun:test";
import { buildMinimalAutumnContext } from "./context";

describe("buildMinimalAutumnContext", () => {
  const child = {
    age: 8,
    diagnosis: "Autism spectrum disorder",
    common_triggers: ["loud noise", "unexpected transitions"],
  };

  const logs = [
    {
      date: new Date().toISOString(),
      mood: "anxious",
      tags: ["sensory", "tired"],
      triggers: ["loud noise"],
      type: "daily",
    },
  ];

  test("omits child context for a general question", () => {
    expect(buildMinimalAutumnContext({
      message: "How can I make a visual schedule?",
      useChildContext: true,
      child,
      logs,
    })).toEqual({});
  });

  test("shares only a bounded, structured observation for a relevant question", () => {
    const context = buildMinimalAutumnContext({
      message: "What recent sensory patterns should I consider?",
      useChildContext: true,
      child,
      logs,
    });

    expect(context).toEqual({
      supportContext: "autism support",
      relevantTriggers: ["loud noise", "unexpected transitions"],
      recentObservations: [{
        relativeDate: "today",
        mood: "anxious",
        tags: ["sensory", "tired"],
        triggers: ["loud noise"],
      }],
    });
  });

  test("does not include personal profile fields or context after withdrawal", () => {
    const context = buildMinimalAutumnContext({
      message: "What patterns are happening for my child?",
      useChildContext: false,
      child,
      logs,
    });

    expect(context).toEqual({});
    expect(JSON.stringify(context)).not.toContain("Autism spectrum disorder");
  });
});