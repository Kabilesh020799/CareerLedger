import { describe, expect, it, vi } from "vitest";
import { createGmailLlmClassifier } from "./gmail-llm-classifier.service";

const message = {
  subject: "An update about your candidacy",
  sender: "Acme Talent <talent@acme.example>",
  snippet: "We enjoyed meeting you and would like to discuss next steps.",
};

const config = {
  apiKey: "test-key",
  allowedAccountEmails: new Set(["user@example.com"]),
  model: "test-model",
  confidenceThreshold: 80,
  timeoutMs: 1_000,
};

function response(output: unknown, ok = true) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(output),
  } as unknown as Response;
}

describe("gmailLlmClassifier", () => {
  it("does not call OpenAI when the optional API key is absent", async () => {
    const request = vi.fn<typeof fetch>();
    const classifier = createGmailLlmClassifier(request, {
      ...config,
      apiKey: "",
    });

    await expect(classifier.classify(message, "user@example.com")).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("accepts only a high-confidence validated recruitment status", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        output_text: JSON.stringify({ results: [{
          index: 0,
          status: "INTERVIEW",
          confidence: 91,
        }] }),
      }),
    );

    await expect(
      createGmailLlmClassifier(request, config).classify(message, "USER@example.com"),
    ).resolves.toEqual({
      status: "INTERVIEW",
      confidence: 91,
    });

    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      model: "test-model",
      store: false,
      max_output_tokens: 256,
    });
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(JSON.parse(body.input)).toEqual([{
      index: 0,
      subject: message.subject,
      sender: message.sender,
      snippet: message.snippet,
    }]);
  });

  it.each([
    ["low confidence", { index: 0, status: "OFFER", confidence: 79 }],
    ["unrelated", { index: 0, status: null, confidence: 99 }],
    ["unsupported status", { index: 0, status: "HIRED", confidence: 99 }],
    ["invalid index", { index: 1, status: "REJECTED", confidence: 99 }],
  ])("rejects %s structured output", async (_name, result) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({
        output_text: JSON.stringify({ results: [result] }),
      }));

    await expect(
      createGmailLlmClassifier(request, config).classify(message, "user@example.com"),
    ).resolves.toBeNull();
  });

  it("keeps synchronization available when OpenAI fails or returns invalid JSON", async () => {
    const unavailable = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("provider unavailable"));
    const invalid = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ output_text: "not json" }));

    await expect(
      createGmailLlmClassifier(unavailable, config).classify(message, "user@example.com"),
    ).resolves.toBeNull();
    await expect(
      createGmailLlmClassifier(invalid, config).classify(message, "user@example.com"),
    ).resolves.toBeNull();
  });

  it("does not call OpenAI for an account outside the allowlist", async () => {
    const request = vi.fn<typeof fetch>();

    await expect(
      createGmailLlmClassifier(request, config).classify(message, "other@example.com"),
    ).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("classifies several ambiguous messages in one token-bounded request", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        output_text: JSON.stringify({
          results: [
            { index: 0, status: "ASSESSMENT", confidence: 92 },
            { index: 1, status: null, confidence: 88 },
            { index: 2, status: "REJECTED", confidence: 96 },
          ],
        }),
      }),
    );
    const messages = Array.from({ length: 3 }, (_unused, index) => ({
      ...message,
      subject: `Message ${index}`,
      snippet: "x".repeat(1_000),
    }));

    await expect(
      createGmailLlmClassifier(request, config).classifyBatch(
        messages,
        "user@example.com",
      ),
    ).resolves.toEqual([
      { status: "ASSESSMENT", confidence: 92 },
      null,
      { status: "REJECTED", confidence: 96 },
    ]);
    expect(request).toHaveBeenCalledOnce();
    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(JSON.parse(body.input)).toHaveLength(3);
    expect(JSON.parse(body.input)[0].snippet).toHaveLength(600);
    expect(body.text.format.schema.properties.results).toMatchObject({
      minItems: 3,
      maxItems: 3,
    });
  });

  it("splits large sets into batches of at most eight messages", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const inputs = JSON.parse(body.input) as Array<{ index: number }>;
      return response({
        output_text: JSON.stringify({
          results: inputs.map(({ index }) => ({
            index,
            status: "APPLIED",
            confidence: 90,
          })),
        }),
      });
    });
    const messages = Array.from({ length: 9 }, (_unused, index) => ({
      ...message,
      subject: `Ambiguous ${index}`,
    }));

    const results = await createGmailLlmClassifier(request, config).classifyBatch(
      messages,
      "user@example.com",
    );

    expect(results).toHaveLength(9);
    expect(results.every((result) => result?.status === "APPLIED")).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(
      request.mock.calls.map((call) =>
        JSON.parse(JSON.parse(String(call[1]?.body)).input).length,
      ),
    ).toEqual([8, 1]);
  });
});
