import { describe, expect, it, vi } from "vitest";
import { createGmailLlmClassifier } from "./gmail-llm-classifier.service";

const message = {
  subject: "An update about your candidacy",
  sender: "Acme Talent <talent@acme.example>",
  snippet: "We enjoyed meeting you and would like to discuss next steps.",
};

const config = {
  apiKey: "test-key",
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

    await expect(classifier.classify(message)).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it("accepts only a high-confidence validated recruitment status", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        output_text: JSON.stringify({
          isRecruitmentUpdate: true,
          status: "INTERVIEW",
          confidence: 91,
        }),
      }),
    );

    await expect(
      createGmailLlmClassifier(request, config).classify(message),
    ).resolves.toEqual({
      status: "INTERVIEW",
      confidence: 91,
    });

    const body = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ model: "test-model", store: false });
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
  });

  it.each([
    ["low confidence", { isRecruitmentUpdate: true, status: "OFFER", confidence: 79 }],
    ["unrelated", { isRecruitmentUpdate: false, status: null, confidence: 99 }],
    ["unsupported status", { isRecruitmentUpdate: true, status: "HIRED", confidence: 99 }],
    ["inconsistent result", { isRecruitmentUpdate: false, status: "REJECTED", confidence: 99 }],
  ])("rejects %s structured output", async (_name, result) => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ output_text: JSON.stringify(result) }));

    await expect(
      createGmailLlmClassifier(request, config).classify(message),
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
      createGmailLlmClassifier(unavailable, config).classify(message),
    ).resolves.toBeNull();
    await expect(
      createGmailLlmClassifier(invalid, config).classify(message),
    ).resolves.toBeNull();
  });
});
