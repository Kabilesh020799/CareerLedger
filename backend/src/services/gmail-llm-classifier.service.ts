import { z } from "zod";
import { openAiConfig } from "../config/openai";
import type { GmailClassification, GmailMessageMetadata } from "./gmail-update-classifier";

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
    index: z.number().int().nonnegative(),
    status: z.enum(supportedStatuses).nullable(),
    confidence: z.number().int().min(0).max(100),
    company: z.string().trim().min(2).max(120).nullable(),
    jobTitle: z.string().trim().min(2).max(120).nullable(),
  })
  .strict();

const batchClassificationSchema = z
  .object({ results: z.array(classificationSchema) })
  .strict();

const MAX_MESSAGES_PER_REQUEST = 8;
const MAX_CONCURRENT_REQUESTS = 2;
const SUBJECT_CHARACTER_LIMIT = 240;
const SENDER_CHARACTER_LIMIT = 160;
const SNIPPET_CHARACTER_LIMIT = 600;

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

function isAllowed(config: typeof openAiConfig, accountEmail: string) {
  return Boolean(
    config.apiKey &&
      config.allowedAccountEmails.has(
        accountEmail.trim().toLocaleLowerCase("en-US"),
      ),
  );
}

/** Creates a token-bounded classifier that accepts only validated structured output. */
export function createGmailLlmClassifier(
  request: Fetch = fetch,
  config = openAiConfig,
) {
  async function classifyBatch(
    messages: Array<Pick<GmailMessageMetadata, "subject" | "sender" | "snippet">>,
    accountEmail: string,
  ): Promise<Array<GmailClassification | null>> {
    if (!messages.length) return [];
    if (!isAllowed(config, accountEmail)) {
      return messages.map(() => null);
    }

    const chunks = chunk(messages, MAX_MESSAGES_PER_REQUEST);
    const chunkResults = await mapWithConcurrency(
      chunks,
      MAX_CONCURRENT_REQUESTS,
      async (messageChunk): Promise<Array<GmailClassification | null>> => {
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
                "Classify job-application lifecycle email metadata. Return one result per input index. APPLIED=application receipt; SCREENING=recruiter or phone screen; ASSESSMENT=test or assignment; INTERVIEW=interview; OFFER=employment offer; REJECTED=decline; WITHDRAWN=candidate withdrawal. Extract the company and job title from the supplied subject, sender, or snippet when clearly present; otherwise return null for that field. Use null status for marketing, job alerts, newsletters, sourcing, unrelated mail, or uncertain events. Use only supplied text.",
              input: JSON.stringify(
                messageChunk.map((message, index) => ({
                  index,
                  subject: message.subject.slice(0, SUBJECT_CHARACTER_LIMIT),
                  sender: message.sender.slice(0, SENDER_CHARACTER_LIMIT),
                  snippet: message.snippet.slice(0, SNIPPET_CHARACTER_LIMIT),
                })),
              ),
              max_output_tokens: Math.max(256, messageChunk.length * 64),
              text: {
                format: {
                  type: "json_schema",
                  name: "gmail_recruitment_update",
                  strict: true,
                  schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["results"],
                    properties: {
                      results: {
                        type: "array",
                        minItems: messageChunk.length,
                        maxItems: messageChunk.length,
                        items: {
                          type: "object",
                          additionalProperties: false,
                          required: ["index", "status", "confidence", "company", "jobTitle"],
                          properties: {
                            index: {
                              type: "integer",
                              minimum: 0,
                              maximum: messageChunk.length - 1,
                            },
                            status: {
                              anyOf: [
                                { type: "string", enum: supportedStatuses },
                                { type: "null" },
                              ],
                            },
                            confidence: {
                              type: "integer",
                              minimum: 0,
                              maximum: 100,
                            },
                            company: { anyOf: [{ type: "string", minLength: 2, maxLength: 120 }, { type: "null" }] },
                            jobTitle: { anyOf: [{ type: "string", minLength: 2, maxLength: 120 }, { type: "null" }] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            }),
          });
          if (!response.ok) return messageChunk.map(() => null);

          const body = (await response.json()) as ResponsesApiResult;
          const text = outputText(body);
          if (!text) return messageChunk.map(() => null);
          const parsed = batchClassificationSchema.safeParse(JSON.parse(text));
          if (
            !parsed.success ||
            parsed.data.results.length !== messageChunk.length
          ) {
            return messageChunk.map(() => null);
          }

          const byIndex = new Map<number, GmailClassification | null>();
          for (const result of parsed.data.results) {
            if (
              result.index >= messageChunk.length ||
              byIndex.has(result.index)
            ) {
              return messageChunk.map(() => null);
            }
            byIndex.set(
              result.index,
              result.status && result.confidence >= config.confidenceThreshold
                ? {
                    status: result.status,
                    confidence: result.confidence,
                    company: result.company,
                    jobTitle: result.jobTitle,
                  }
                : null,
            );
          }
          if (byIndex.size !== messageChunk.length) {
            return messageChunk.map(() => null);
          }
          return messageChunk.map(
            (_message, index) => byIndex.get(index) ?? null,
          );
        } catch {
          return messageChunk.map(() => null);
        } finally {
          clearTimeout(timeout);
        }
      },
    );
    return chunkResults.flat();
  }

  return {
    classifyBatch,
    async classify(
      message: Pick<GmailMessageMetadata, "subject" | "sender" | "snippet">,
      accountEmail: string,
    ) {
      return (await classifyBatch([message], accountEmail))[0] ?? null;
    },
  };
}

function chunk<T>(items: T[], size: number) {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_unused, index) => items.slice(index * size, (index + 1) * size),
  );
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<TResult>,
) {
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Optional production classifier; an absent API key makes it a no-op. */
export const gmailLlmClassifier = createGmailLlmClassifier();
