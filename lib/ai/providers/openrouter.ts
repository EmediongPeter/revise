import "server-only";

import { AI_BLUEPRINT_MAX_OUTPUT_TOKENS, AI_PROVIDER_TIMEOUT_MS, requireOpenRouterConfig } from "@/lib/ai/config";
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

const buildMessages = ({ sources, evidence, trainerGuidance }: BlueprintGenerationProviderInput) => {
    return [
        {
            role: "system",
            content:
                "You are Revise, an enterprise training architect. Generate practical, source-backed training blueprints from company knowledge. Use only the provided evidence. Be specific, concise, and manager-review friendly. Never invent company policy. If evidence is missing, say so in missingSections.",
        },
        {
            role: "user",
            content: buildBlueprintPrompt({ sources, evidence, trainerGuidance }),
        },
    ];
};

const callOpenRouter = async ({
    input,
    structured,
}: {
    input: BlueprintGenerationProviderInput;
    structured: boolean;
}) => {
    const config = requireOpenRouterConfig();
    console.info("[AI Blueprint] openrouter:request-start", {
        model: config.model,
        structured,
        sources: input.sources.length,
        evidence: input.evidence.length,
    });

    const body: Record<string, unknown> = {
        model: config.model,
        messages: buildMessages(input),
        temperature: 0.2,
        max_tokens: AI_BLUEPRINT_MAX_OUTPUT_TOKENS,
    };

    if (structured) {
        body.response_format = {
            type: "json_schema",
            json_schema: {
                name: "training_blueprint",
                strict: true,
                schema: blueprintJsonSchema,
            },
        };
    } else {
        body.response_format = { type: "json_object" };
    }

    let response: Response | undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "Revise",
            },
            body: JSON.stringify(body),
        }, AI_PROVIDER_TIMEOUT_MS);

        if (!shouldRetryStatus(response.status) || attempt === 2) break;
        console.warn("[AI Blueprint] openrouter:retry", {
            status: response.status,
            attempt: attempt + 1,
        });
        await sleep(500 * (attempt + 1));
    }

    if (!response) {
        throw new Error("OpenRouter generation failed before a response was received.");
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter generation failed (${response.status}): ${text.slice(0, 280)}`);
    }

    const json = await response.json();
    console.info("[AI Blueprint] openrouter:response", {
        status: response.status,
        structured,
        hasError: Boolean(json?.error),
        choices: Array.isArray(json?.choices) ? json.choices.length : 0,
    });

    if (json?.error) {
        const message = json.error.message || "OpenRouter returned an error response.";
        const code = json.error.code ? ` (${json.error.code})` : "";
        throw new Error(`OpenRouter generation failed${code}: ${message}`);
    }

    const content = json?.choices?.[0]?.message?.content;
    console.info("[AI Blueprint] openrouter:content", {
        structured,
        contentLength: typeof content === "string" ? content.length : 0,
    });

    if (!content || typeof content !== "string") {
        throw new Error("OpenRouter returned an empty blueprint response.");
    }

    return TrainingBlueprintAISchema.parse(normalizeBlueprintJson(extractJson(content)));
};

export const openRouterBlueprintProvider: BlueprintGenerationProvider = {
    async generateBlueprint(input) {
        if (input.evidence.length === 0) {
            throw new Error("No source evidence was available for blueprint generation.");
        }

        try {
            return await callOpenRouter({ input, structured: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : "";
            console.error("[AI Blueprint] openrouter:structured-failed", { message });

            if (!message.includes("400") && !message.includes("response_format")) {
                throw error;
            }

            await sleep(500);
            console.info("[AI Blueprint] openrouter:fallback-json-mode");
            return callOpenRouter({ input, structured: false });
        }
    },
};
