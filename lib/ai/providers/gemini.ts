import "server-only";

import { AI_BLUEPRINT_MAX_OUTPUT_TOKENS, AI_PROVIDER_TIMEOUT_MS, requireGeminiConfig } from "@/lib/ai/config";
import {
    blueprintJsonSchema,
    buildBlueprintPrompt,
    extractJson,
    fetchWithTimeout,
    normalizeBlueprintJson,
    shouldRetryStatus,
    sleep,
} from "@/lib/ai/providers/blueprint-shared";
import type { BlueprintGenerationProvider, BlueprintGenerationProviderInput } from "@/lib/ai/types";
import { TrainingBlueprintAISchema } from "@/lib/zod";

type GeminiResponseJson = {
    candidates?: Array<{
        content?: {
            parts?: Array<{ text?: string }>;
        };
    }>;
};

const collectGeminiText = (json: GeminiResponseJson) =>
    json?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim();

const callGemini = async ({
    input,
    structured,
}: {
    input: BlueprintGenerationProviderInput;
    structured: boolean;
}) => {
    const config = requireGeminiConfig();
    console.info("[AI Blueprint] gemini:request-start", {
        model: config.model,
        structured,
        sources: input.sources.length,
        evidence: input.evidence.length,
    });

    const generationConfig: Record<string, unknown> = {
        temperature: 0.2,
        maxOutputTokens: AI_BLUEPRINT_MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
    };

    if (structured) {
        generationConfig.responseJsonSchema = blueprintJsonSchema;
    }

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: buildBlueprintPrompt(input) }],
            },
        ],
        generationConfig,
    };

    let response: Response | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetchWithTimeout(
            `${config.baseUrl}/models/${config.model}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": config.apiKey,
                },
                body: JSON.stringify(body),
            },
            AI_PROVIDER_TIMEOUT_MS,
        );

        if (!shouldRetryStatus(response.status) || attempt === 2) break;
        console.warn("[AI Blueprint] gemini:retry", {
            status: response.status,
            attempt: attempt + 1,
        });
        await sleep(500 * (attempt + 1));
    }

    if (!response) {
        throw new Error("Gemini generation failed before a response was received.");
    }

    const json = await response.json();
    console.info("[AI Blueprint] gemini:response", {
        status: response.status,
        structured,
        hasError: Boolean(json?.error),
        finishReason: json?.candidates?.[0]?.finishReason,
    });

    if (!response.ok || json?.error) {
        const providerMessage = json?.error?.message || JSON.stringify(json).slice(0, 280);
        throw new Error(`Gemini generation failed (${response.status}): ${providerMessage}`);
    }

    const content = collectGeminiText(json);
    console.info("[AI Blueprint] gemini:content", {
        structured,
        contentLength: content?.length || 0,
    });

    if (!content) {
        const finishReason = json?.candidates?.[0]?.finishReason;
        const reason = finishReason ? ` Finish reason: ${finishReason}.` : "";
        throw new Error(`Gemini returned an empty blueprint response.${reason}`);
    }

    return TrainingBlueprintAISchema.parse(normalizeBlueprintJson(extractJson(content)));
};

export const geminiBlueprintProvider: BlueprintGenerationProvider = {
    async generateBlueprint(input) {
        if (input.evidence.length === 0) {
            throw new Error("No source evidence was available for blueprint generation.");
        }

        try {
            return await callGemini({ input, structured: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : "";
            console.error("[AI Blueprint] gemini:structured-failed", { message });

            if (!message.includes("400") && !message.includes("responseJsonSchema")) {
                throw error;
            }

            await sleep(500);
            console.info("[AI Blueprint] gemini:fallback-json-mode");
            return callGemini({ input, structured: false });
        }
    },
};
