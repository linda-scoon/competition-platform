const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const MODERATION_UNAVAILABLE_REASON = "AI moderation is temporarily unavailable. Please try again later.";

type ChallengeModerationResult = {
  decision: "approved" | "rejected";
  reasons: string[];
};

type ResponsesApiOutputItem = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

type ResponsesApiPayload = {
  output?: ResponsesApiOutputItem[];
};

const challengeModerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "reasons"],
  properties: {
    decision: {
      type: "string",
      enum: ["approved", "rejected"],
    },
    reasons: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;

function buildModerationPrompt(input: { title: string; shortDescription: string; longDescription: string }) {
  return [
    "Moderate this challenge content for safe public display.",
    "Reject disallowed unsafe/abusive/illegal/sexual/self-harm/extremist content.",
    "Return JSON only.",
    `Title: ${input.title}`,
    `Short Description: ${input.shortDescription}`,
    `Long Description: ${input.longDescription}`,
  ].join("\n\n");
}

function extractJsonText(payload: ResponsesApiPayload) {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function rejectResult(reason: string): ChallengeModerationResult {
  return {
    decision: "rejected",
    reasons: [reason],
  };
}

export async function moderateChallengeContent(input: {
  title: string;
  shortDescription: string;
  longDescription: string;
}): Promise<ChallengeModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL;

  if (!apiKey || !model) {
    return rejectResult(MODERATION_UNAVAILABLE_REASON);
  }

  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildModerationPrompt(input),
        text: {
          format: {
            type: "json_schema",
            name: "challenge_moderation_result",
            schema: challengeModerationSchema,
            strict: true,
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return rejectResult(MODERATION_UNAVAILABLE_REASON);
    }

    const payload = (await response.json()) as ResponsesApiPayload;
    const jsonText = extractJsonText(payload);

    if (!jsonText) {
      return rejectResult("Challenge content could not be moderated at this time.");
    }

    const parsed = JSON.parse(jsonText) as Partial<ChallengeModerationResult>;

    if (
      (parsed.decision !== "approved" && parsed.decision !== "rejected") ||
      !Array.isArray(parsed.reasons) ||
      parsed.reasons.some((reason) => typeof reason !== "string")
    ) {
      return rejectResult("Challenge content could not be moderated at this time.");
    }

    return {
      decision: parsed.decision,
      reasons: parsed.reasons,
    };
  } catch {
    return rejectResult(MODERATION_UNAVAILABLE_REASON);
  }
}

export type { ChallengeModerationResult };
export { MODERATION_UNAVAILABLE_REASON };
