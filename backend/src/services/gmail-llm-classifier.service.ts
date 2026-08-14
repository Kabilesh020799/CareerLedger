import { z } from "zod";
import { openAiConfig } from "../config/openai";
import type { GmailMessageMetadata } from "./gmail-update-classifier";

const supportedStatuses = [
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

const classificationSchema = z
  .object({
    isRecruitmentUpdate: z.boolean(),
    status: z.enum(supportedStatuses).nullable(),
    confidence: z.number().int().min(0).max(100),
  })
  .strict()
  .refine(
    (result) => result.isRecruitmentUpdate === (result.status !== null),
    "Recruitment updates must include a status and unrelated messages must not",
  );

type Fetch = typeof fetch;

type ResponsesApiResult = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{ type?: string; text?: unknown }>;
  }>;
};

function outputText(response: ResponsesApiResult) {
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return null;
}

/** Creates a fail-safe classifier that accepts only validated structured output. */
export function createGmailLlmClassifier(
  request: Fetch = fetch,
  config = openAiConfig,
) {
  return {
    async classify(
      message: Pick<GmailMessageMetadata, "subject" | "sender" | "snippet">,
      accountEmail: string,
    ): Promise<{ status: (typeof supportedStatuses)[number]; confidence: number } | null> {
      if (
        !config.apiKey ||
        !config.allowedAccountEmails.has(
          accountEmail.trim().toLocaleLowerCase("en-US"),
        )
      ) {
        return null;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      try {
        const response = await request("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            store: false,
            instructions:
              "Classify whether this email metadata is a job-application lifecycle update. Use only the supplied metadata. Marketing, newsletters, job alerts, and unrelated mail are not recruitment updates. Never invent a status.",
            input: JSON.stringify({
              subject: message.subject.slice(0, 500),
              sender: message.sender.slice(0, 320),
              snippet: message.snippet.slice(0, 2_000),
            }),
            text: {
              format: {
                type: "json_schema",
                name: "gmail_recruitment_update",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["isRecruitmentUpdate", "status", "confidence"],
                  properties: {
                    isRecruitmentUpdate: { type: "boolean" },
                    status: {
                      anyOf: [
                        { type: "string", enum: supportedStatuses },
                        { type: "null" },
                      ],
                    },
                    confidence: { type: "integer", minimum: 0, maximum: 100 },
                  },
                },
              },
            },
          }),
        });
        if (!response.ok) return null;

        const body = (await response.json()) as ResponsesApiResult;
        const text = outputText(body);
        if (!text) return null;
        const parsed = classificationSchema.safeParse(JSON.parse(text));
        if (!parsed.success) return null;
        if (
          !parsed.data.isRecruitmentUpdate ||
          parsed.data.status === null ||
          parsed.data.confidence < config.confidenceThreshold
        ) {
          return null;
        }
        return {
          status: parsed.data.status,
          confidence: parsed.data.confidence,
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

/** Optional production classifier; an absent API key makes it a no-op. */
export const gmailLlmClassifier = createGmailLlmClassifier();
