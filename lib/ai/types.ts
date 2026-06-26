import type { z } from "zod";
import type { TrainingBlueprintAISchema } from "@/lib/zod";

export type BlueprintEvidence = {
    sourceId: string;
    sourceTitle: string;
    sourceType: string;
    chunkId: string;
    chunkIndex: number;
    pageNumber?: number;
    content: string;
};

export type GeneratedBlueprint = z.infer<typeof TrainingBlueprintAISchema>;

export type BlueprintSourceContext = {
    _id: { toString: () => string };
    title: string;
    description?: string;
    sourceType: string;
};

export type BlueprintGenerationProviderInput = {
    sources: BlueprintSourceContext[];
    evidence: BlueprintEvidence[];
    trainerGuidance?: string;
};

export interface BlueprintGenerationProvider {
    generateBlueprint(input: BlueprintGenerationProviderInput): Promise<GeneratedBlueprint>;
}
