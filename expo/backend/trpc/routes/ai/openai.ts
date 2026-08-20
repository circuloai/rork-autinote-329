import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function generateAutumnResponse(input: {
  instructions: string;
  input: string;
  model?: string;
  maxOutputTokens: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || 15000));

  try {
    const response = await getClient().responses.create(
      {
        model: input.model || process.env.OPENAI_AUTUMN_MODEL || "gpt-5-mini",
        instructions: input.instructions,
        input: input.input,
        max_output_tokens: input.maxOutputTokens,
      },
      { signal: controller.signal }
    );

    const text = response.output_text?.trim();
    if (!text) throw new Error("OPENAI_EMPTY_RESPONSE");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}