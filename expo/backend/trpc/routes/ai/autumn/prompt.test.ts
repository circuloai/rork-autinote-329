import { describe, expect, test } from "bun:test";
import { buildAutumnPrompt } from "./prompt";

describe("buildAutumnPrompt", () => {
  test("keeps caregiver text in the user input and applies response preferences", () => {
    const prompt = buildAutumnPrompt({
      style: "brief",
      focus: ["sensory"],
      verbosity: "short",
      history: [{ role: "assistant", content: "What happened before the noise?" }],
      message: "Can you help me plan for a noisy appointment?",
      context: { relevantTriggers: ["loud noise"] },
    });

    expect(prompt.instructions).toContain("Be direct and concise");
    expect(prompt.instructions).toContain("Use 1–2 sentences");
    expect(prompt.instructions).toContain('["loud noise"]');
    expect(prompt.input).toContain("Caregiver's current message");
    expect(prompt.input).toContain("noisy appointment");
    expect(prompt.instructions).not.toContain("noisy appointment");
  }, 15_000);
});