import "server-only";

import type { BlueprintEvidence, BlueprintGenerationProviderInput } from "@/lib/ai/types";

export const blueprintJsonSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "title",
        "description",
        "objective",
        "keyTopics",
        "requiredKnowledge",
        "practiceScenarios",
        "commonMistakes",
        "assessmentQuestions",
        "rolePlayPrompts",
        "assessmentCriteria",
        "recommendedAssignments",
        "missingSections",
        "sourceReferenceNotes",
    ],
    properties: {
        title: { type: "string" },
        description: { type: "string" },
        objective: { type: "string" },
        keyTopics: { type: "array", items: { type: "string" } },
        requiredKnowledge: { type: "array", items: { type: "string" } },
        practiceScenarios: { type: "array", items: { type: "string" } },
        commonMistakes: { type: "array", items: { type: "string" } },
        assessmentQuestions: { type: "array", items: { type: "string" } },
        rolePlayPrompts: { type: "array", items: { type: "string" } },
        assessmentCriteria: { type: "array", items: { type: "string" } },
        recommendedAssignments: { type: "array", items: { type: "string" } },
        missingSections: { type: "array", items: { type: "string" } },
        sourceReferenceNotes: { type: "string" },
    },
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const shouldRetryStatus = (status: number) => status === 429 || status >= 500;

export const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

export const buildEvidenceText = (evidence: BlueprintEvidence[]) =>
    evidence
        .map((item, index) => {
            const page = item.pageNumber ? ` page ${item.pageNumber}` : "";
            return `[${index + 1}] Source: ${item.sourceTitle} (${item.sourceType}${page}, chunk ${item.chunkIndex})\n${item.content}`;
        })
        .join("\n\n");

export const extractJson = (content: string) => {
    const trimmed = content.trim();

    if (trimmed.startsWith("{")) return JSON.parse(trimmed);

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("The AI response did not include valid blueprint JSON.");
};

const truncate = (value: unknown, max: number) => {
    if (typeof value !== "string") return value;
    const normalized = value.replace(/\s+/g, " ").trim();

    if (normalized.length <= max) return normalized;

    return `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`;
};

const normalizeList = (value: unknown) => {
    if (!Array.isArray(value)) return [];

    return value
        .map((item) => truncate(item, 500))
        .filter((item): item is string => typeof item === "string" && item.length > 0)
        .slice(0, 12);
};

export const normalizeBlueprintJson = (value: Record<string, unknown>) => ({
    ...value,
    title: truncate(value.title, 140),
    description: truncate(value.description, 500),
    objective: truncate(value.objective, 800),
    keyTopics: normalizeList(value.keyTopics),
    requiredKnowledge: normalizeList(value.requiredKnowledge),
    practiceScenarios: normalizeList(value.practiceScenarios),
    commonMistakes: normalizeList(value.commonMistakes),
    assessmentQuestions: normalizeList(value.assessmentQuestions),
    rolePlayPrompts: normalizeList(value.rolePlayPrompts),
    assessmentCriteria: normalizeList(value.assessmentCriteria),
    recommendedAssignments: normalizeList(value.recommendedAssignments),
    missingSections: normalizeList(value.missingSections),
    sourceReferenceNotes: truncate(value.sourceReferenceNotes, 1200),
});

export const buildBlueprintPrompt = ({ sources, evidence, trainerGuidance }: BlueprintGenerationProviderInput) => {
    const sourceSummary = sources
        .map((source) => `- ${source.title} (${source.sourceType})${source.description ? `: ${source.description}` : ""}`)
        .join("\n");
    const guidance = trainerGuidance?.trim()
        ? trainerGuidance.trim()
        : "No additional conversation guidance was provided by the admin.";

    return `You are Revise, an enterprise training architect.

Generate a practical, source-backed training blueprint from company knowledge. Use only the provided evidence. Be specific, concise, and manager-review friendly. Never invent company policy. If evidence is missing, say so in missingSections.

Selected sources:
${sourceSummary}

Admin trainer guidance for the future AI trainer conversation:
${guidance}

Evidence chunks:
${buildEvidenceText(evidence)}

Return only JSON matching this shape: title, description, objective, keyTopics, requiredKnowledge, practiceScenarios, commonMistakes, assessmentQuestions, rolePlayPrompts, assessmentCriteria, recommendedAssignments, missingSections, sourceReferenceNotes.`;
};
