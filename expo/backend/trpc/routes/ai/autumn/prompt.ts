import type { AutumnContext } from "./context";

const STYLE_INSTRUCTIONS: Record<string, string> = {
  warm: "Be warm, calm, empathetic, and conversational. Use natural language and contractions.",
  professional: "Use a clear, professional, evidence-informed tone. Avoid jargon unless it helps the caregiver.",
  brief: "Be direct and concise. Skip pleasantries and give the most useful next step first.",
};

const VERBOSITY_INSTRUCTIONS: Record<string, string> = {
  short: "Use 1–2 sentences.",
  balanced: "Use 2–5 sentences with practical context.",
  detailed: "Use a few short paragraphs with concrete examples, but avoid an essay.",
};

export function buildAutumnPrompt({
  style,
  focus,
  verbosity,
  history,
  message,
  context,
}: {
  style?: string;
  focus?: string[];
  verbosity?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  context: AutumnContext;
}) {
  const focusList = Array.isArray(focus) && focus.length > 0
    ? focus.slice(0, 5).join(", ")
    : "autism support, behavior, emotional regulation, sleep, and sensory needs";

  const instructions = `You are Autumn, a thoughtful support assistant for caregivers of autistic children.

Your purpose is to help caregivers reflect on everyday patterns, routines, communication, sensory needs, emotional regulation, sleep, school, and behavior. Be practical, calm, and human.

${STYLE_INSTRUCTIONS[style || "warm"] || STYLE_INSTRUCTIONS.warm}
${VERBOSITY_INSTRUCTIONS[verbosity || "balanced"] || VERBOSITY_INSTRUCTIONS.balanced}
Prioritize these focus areas when relevant: ${focusList}.

Respond directly. Do not repeatedly restate the caregiver's message. Do not provide generic autism education unless it directly helps. Ask at most one follow-up question, and only when it would materially improve the next step.

Use only the context provided below. Treat it as incomplete and potentially outdated. Never mention records, logs, stored context, or that you can see private information. Do not invent facts, diagnose, prescribe, or present a possible explanation as certain. Encourage an appropriate licensed professional for medical, developmental, or safety concerns. For an immediate safety concern, encourage urgent local help.

Return plain text suitable for a short chat response. Do not use asterisks, headings, or long disclaimers.

Relevant child context (may be empty):
${JSON.stringify(context)}
`;

  const conversation = history
    .slice(-4)
    .map((item) => `${item.role === "user" ? "Caregiver" : "Autumn"}: ${item.content.slice(0, 600)}`)
    .join("\n");

  return {
    instructions,
    input: `Recent conversation:\n${conversation || "(none)"}\n\nCaregiver's current message:\n${message}`,
  };
}