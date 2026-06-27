import "server-only";

import { AI_BLUEPRINT_FALLBACK_PROVIDER, AI_BLUEPRINT_PROVIDER } from "@/lib/ai/config";
import { geminiBlueprintProvider } from "@/lib/ai/providers/gemini";
import { openRouterBlueprintProvider } from "@/lib/ai/providers/openrouter";
import type { BlueprintGenerationProvider, BlueprintGenerationProviderInput } from "@/lib/ai/types";

const providers: Record<string, BlueprintGenerationProvider> = {
    gemini: geminiBlueprintProvider,
    openrouter: openRouterBlueprintProvider,
};

const getProvider = (provider: string) => {
    const match = providers[provider];

    if (!match) {
        throw new Error(`Unsupported blueprint provider "${provider}". Use "gemini" or "openrouter".`);
    }

    return match;
};

export const generateBlueprintFromContext = async (input: BlueprintGenerationProviderInput) => {
    const primary = getProvider(AI_BLUEPRINT_PROVIDER);
    console.info("[AI Blueprint] provider:primary-start", {
        provider: AI_BLUEPRINT_PROVIDER,
        fallbackProvider: AI_BLUEPRINT_FALLBACK_PROVIDER || null,
        sourceCount: input.sources.length,
        evidenceCount: input.evidence.length,
    });

    try {
        const result = await primary.generateBlueprint(input);
        console.info("[AI Blueprint] provider:primary-success", {
            provider: AI_BLUEPRINT_PROVIDER,
            title: result.title,
        });
        return result;
    } catch (error) {
        console.error("[AI Blueprint] provider:primary-failed", {
            provider: AI_BLUEPRINT_PROVIDER,
            message: error instanceof Error ? error.message : "Unknown provider error.",
        });

        if (!AI_BLUEPRINT_FALLBACK_PROVIDER || AI_BLUEPRINT_FALLBACK_PROVIDER === AI_BLUEPRINT_PROVIDER) {
            throw error;
        }

        try {
            console.info("[AI Blueprint] provider:fallback-start", {
                provider: AI_BLUEPRINT_FALLBACK_PROVIDER,
            });
            const result = await getProvider(AI_BLUEPRINT_FALLBACK_PROVIDER).generateBlueprint(input);
            console.info("[AI Blueprint] provider:fallback-success", {
                provider: AI_BLUEPRINT_FALLBACK_PROVIDER,
                title: result.title,
            });
            return result;
        } catch (fallbackError) {
            console.error("[AI Blueprint] provider:fallback-failed", {
                provider: AI_BLUEPRINT_FALLBACK_PROVIDER,
                message: fallbackError instanceof Error ? fallbackError.message : "Unknown fallback provider error.",
            });
            throw error;
        }
    }
};
