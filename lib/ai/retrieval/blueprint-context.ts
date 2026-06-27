import "server-only";

import { AI_BLUEPRINT_CONTEXT_LIMIT, AI_BLUEPRINT_RETRIEVAL_MODE, AI_PROVIDER_TIMEOUT_MS, requireGeminiConfig } from "@/lib/ai/config";
import { extractJson, fetchWithTimeout, shouldRetryStatus, sleep } from "@/lib/ai/providers/blueprint-shared";
import { retrieveKnowledgeContext } from "@/lib/ai/pinecone";
import type { BlueprintEvidence } from "@/lib/ai/types";

type RetrievalMode = "legacy" | "planned" | "shadow";

type SourceForRetrieval = {
    _id: { toString: () => string };
    title: string;
    description?: string;
    sourceType: string;
    version: number;
};

type ChunkForFallback = {
    _id: { toString: () => string };
    sourceId: { toString: () => string };
    chunkIndex: number;
    pageNumber?: number;
    content: string;
};

type BuildBlueprintEvidenceInput = {
    workspaceId: string;
    sources: SourceForRetrieval[];
    chunks: ChunkForFallback[];
    teamIds: string[];
    trainerGuidance?: string;
    regenerationFeedback?: string;
    operation: "prepare" | "regenerate";
};

const PLANNED_QUERY_COUNT_MIN = 3;
const PLANNED_QUERY_COUNT_MAX = 6;
const PLANNED_TOP_K_PER_QUERY = 8;
const PLANNED_FINAL_EVIDENCE_LIMIT = 12;
const PLANNED_MAX_CONTENT_CHARS = 1400;

const isRetrievalMode = (value: string): value is RetrievalMode =>
    value === "legacy" || value === "planned" || value === "shadow";

const getRetrievalMode = (): RetrievalMode => {
    if (isRetrievalMode(AI_BLUEPRINT_RETRIEVAL_MODE)) return AI_BLUEPRINT_RETRIEVAL_MODE;

    console.warn("[AI Blueprint] retrieval:invalid-mode", {
        configuredMode: AI_BLUEPRINT_RETRIEVAL_MODE,
        fallbackMode: "legacy",
    });
    return "legacy";
};

const evidenceContentLength = (evidence: BlueprintEvidence[]) =>
    evidence.reduce((total, item) => total + item.content.length, 0);

const trimEvidence = (evidence: BlueprintEvidence[], maxChars = PLANNED_MAX_CONTENT_CHARS): BlueprintEvidence[] =>
    evidence.map((item) => {
        const content = item.content.replace(/\s+/g, " ").trim();

        return {
            ...item,
            content: content.length > maxChars ? `${content.slice(0, maxChars - 1).trim()}...` : content,
        };
    });

const dedupeEvidence = (evidence: BlueprintEvidence[]) => {
    const seen = new Set<string>();
    const deduped: BlueprintEvidence[] = [];

    for (const item of evidence) {
        if (seen.has(item.chunkId)) continue;

        seen.add(item.chunkId);
        deduped.push(item);
    }

    return deduped;
};

const buildLocalFallbackEvidence = ({
    sources,
    chunks,
    limit,
    maxContentChars,
}: {
    sources: SourceForRetrieval[];
    chunks: ChunkForFallback[];
    limit: number;
    maxContentChars?: number;
}): BlueprintEvidence[] => {
    const sourceById = new Map(sources.map((source) => [source._id.toString(), source]));

    const evidence = chunks.slice(0, limit).map((chunk) => {
        const source = sourceById.get(chunk.sourceId.toString());

        return {
            sourceId: chunk.sourceId.toString(),
            sourceTitle: source?.title || "Selected source",
            sourceType: source?.sourceType || "source",
            chunkId: chunk._id.toString(),
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            content: chunk.content,
        };
    });

    return maxContentChars ? trimEvidence(evidence, maxContentChars) : evidence;
};

const buildLegacyQuery = ({
    sources,
    trainerGuidance,
    regenerationFeedback,
    operation,
}: Pick<BuildBlueprintEvidenceInput, "sources" | "trainerGuidance" | "regenerationFeedback" | "operation">) =>
    [
        operation === "regenerate"
            ? "Regenerate a role-based training blueprint with objectives, key topics, required knowledge, practical scenarios, common mistakes, assessment questions, roleplay prompts, assessment criteria, recommended assignments, and missing source sections."
            : "Generate a role-based training blueprint with objectives, key topics, required knowledge, practical scenarios, common mistakes, assessment questions, roleplay prompts, assessment criteria, recommended assignments, and missing source sections.",
        trainerGuidance?.trim(),
        regenerationFeedback?.trim(),
        sources.map((source) => `${source.title} ${source.description || ""} ${source.sourceType}`).join(" "),
    ]
        .filter(Boolean)
        .join("\n");

const buildFallbackQueries = ({
    sources,
    trainerGuidance,
    regenerationFeedback,
}: Pick<BuildBlueprintEvidenceInput, "sources" | "trainerGuidance" | "regenerationFeedback">) => {
    const sourceSummary = sources.map((source) => `${source.title} ${source.sourceType}`).join(" ");
    const guidance = trainerGuidance?.trim();
    const feedback = regenerationFeedback?.trim();

    return [
        `training objectives required knowledge ${sourceSummary}`,
        `practical scenarios common mistakes assessment criteria ${sourceSummary}`,
        guidance ? `admin guidance ${guidance}` : `policy rules procedures escalation ${sourceSummary}`,
        feedback ? `regeneration feedback ${feedback}` : `roleplay prompts readiness coaching ${sourceSummary}`,
    ].slice(0, PLANNED_QUERY_COUNT_MAX);
};

const normalizePlannedQueries = (value: unknown) => {
    const rawQueries = Array.isArray(value)
        ? value
        : Array.isArray((value as { queries?: unknown })?.queries)
            ? (value as { queries: unknown[] }).queries
            : [];

    return Array.from(
        new Set(
            rawQueries
                .map((query) => (typeof query === "string" ? query.replace(/\s+/g, " ").trim() : ""))
                .filter((query) => query.length >= 8)
                .map((query) => query.slice(0, 180)),
        ),
    ).slice(0, PLANNED_QUERY_COUNT_MAX);
};

const buildPlannerPrompt = ({
    sources,
    trainerGuidance,
    regenerationFeedback,
    operation,
}: Pick<BuildBlueprintEvidenceInput, "sources" | "trainerGuidance" | "regenerationFeedback" | "operation">) => {
    const sourceSummary = sources
        .map((source) => `- ${source.title} (${source.sourceType})${source.description ? `: ${source.description}` : ""}`)
        .join("\n");

    return `Create focused retrieval queries for a training blueprint evidence search.

Return only JSON in this shape: {"queries":["short search query"]}.
Create ${PLANNED_QUERY_COUNT_MIN}-${PLANNED_QUERY_COUNT_MAX} queries. Each query must be concise and targeted at source evidence needed to ${operation === "regenerate" ? "regenerate" : "generate"} the blueprint.

Selected sources:
${sourceSummary}

Admin trainer guidance:
${trainerGuidance?.trim() || "None"}

Regeneration feedback:
${regenerationFeedback?.trim() || "None"}`;
};

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

const planRetrievalQueriesWithGemini = async (input: BuildBlueprintEvidenceInput) => {
    const config = requireGeminiConfig();
    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: buildPlannerPrompt(input) }],
            },
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
        },
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
        await sleep(300 * (attempt + 1));
    }

    if (!response) throw new Error("Gemini query planning failed before a response was received.");

    const json = await response.json();

    if (!response.ok || json?.error) {
        const providerMessage = json?.error?.message || JSON.stringify(json).slice(0, 240);
        throw new Error(`Gemini query planning failed (${response.status}): ${providerMessage}`);
    }

    const content = collectGeminiText(json);
    if (!content) throw new Error("Gemini returned an empty query planning response.");

    const queries = normalizePlannedQueries(extractJson(content));

    if (queries.length < PLANNED_QUERY_COUNT_MIN) {
        throw new Error("Gemini returned too few usable retrieval queries.");
    }

    return queries;
};

const getPlannedQueries = async (input: BuildBlueprintEvidenceInput) => {
    try {
        const queries = await planRetrievalQueriesWithGemini(input);
        console.info("[AI Blueprint] retrieval:planner-success", {
            operation: input.operation,
            plannedQueryCount: queries.length,
        });
        return queries;
    } catch (error) {
        const fallbackQueries = buildFallbackQueries(input);
        console.warn("[AI Blueprint] retrieval:planner-fallback", {
            operation: input.operation,
            fallbackReason: error instanceof Error ? error.message : "Unknown query planning error.",
            plannedQueryCount: fallbackQueries.length,
        });
        return fallbackQueries;
    }
};

const retrieveLegacyEvidence = async (input: BuildBlueprintEvidenceInput) => {
    return retrieveKnowledgeContext({
        workspaceId: input.workspaceId,
        sources: input.sources,
        teamIds: input.teamIds,
        query: buildLegacyQuery(input),
        topK: AI_BLUEPRINT_CONTEXT_LIMIT,
    });
};

const retrievePlannedEvidence = async (input: BuildBlueprintEvidenceInput) => {
    const queries = await getPlannedQueries(input);
    const retrievals = await Promise.all(
        queries.map((query) =>
            retrieveKnowledgeContext({
                workspaceId: input.workspaceId,
                sources: input.sources,
                teamIds: input.teamIds,
                query,
                topK: PLANNED_TOP_K_PER_QUERY,
            }),
        ),
    );
    const rawEvidence = retrievals.flat();
    const dedupedEvidence = dedupeEvidence(rawEvidence);
    const finalEvidence = trimEvidence(dedupedEvidence.slice(0, PLANNED_FINAL_EVIDENCE_LIMIT), PLANNED_MAX_CONTENT_CHARS);

    console.info("[AI Blueprint] retrieval:planned", {
        operation: input.operation,
        retrievalMode: "planned",
        plannedQueryCount: queries.length,
        pineconeQueryCount: queries.length,
        rawHitCount: rawEvidence.length,
        dedupedEvidenceCount: dedupedEvidence.length,
        finalEvidenceCount: finalEvidence.length,
        finalEvidenceCharCount: evidenceContentLength(finalEvidence),
    });

    return finalEvidence;
};

const withLocalFallback = (input: BuildBlueprintEvidenceInput, evidence: BlueprintEvidence[], mode: RetrievalMode) => {
    if (evidence.length > 0) return evidence;

    const fallback = buildLocalFallbackEvidence({
        sources: input.sources,
        chunks: input.chunks,
        limit: mode === "planned" ? PLANNED_FINAL_EVIDENCE_LIMIT : AI_BLUEPRINT_CONTEXT_LIMIT,
        maxContentChars: mode === "planned" ? PLANNED_MAX_CONTENT_CHARS : undefined,
    });

    console.info("[AI Blueprint] retrieval:empty-fallback", {
        operation: input.operation,
        retrievalMode: mode,
        fallbackReason: "pinecone-empty",
        fallbackChunks: fallback.length,
        finalEvidenceCharCount: evidenceContentLength(fallback),
    });

    return fallback;
};

export const buildBlueprintEvidence = async (input: BuildBlueprintEvidenceInput): Promise<BlueprintEvidence[]> => {
    const mode = getRetrievalMode();

    console.info("[AI Blueprint] retrieval:start", {
        operation: input.operation,
        retrievalMode: mode,
        sourceCount: input.sources.length,
        chunkCount: input.chunks.length,
        teamCount: input.teamIds.length,
    });

    if (mode === "planned") {
        try {
            return withLocalFallback(input, await retrievePlannedEvidence(input), mode);
        } catch (error) {
            console.warn("[AI Blueprint] retrieval:planned-fallback", {
                operation: input.operation,
                retrievalMode: mode,
                fallbackMode: "legacy",
                fallbackReason: error instanceof Error ? error.message : "Unknown planned retrieval error.",
            });
            return withLocalFallback(input, await retrieveLegacyEvidence(input), "legacy");
        }
    }

    const legacyEvidence = withLocalFallback(input, await retrieveLegacyEvidence(input), "legacy");

    console.info("[AI Blueprint] retrieval:legacy", {
        operation: input.operation,
        retrievalMode: mode,
        pineconeQueryCount: 1,
        rawHitCount: legacyEvidence.length,
        dedupedEvidenceCount: legacyEvidence.length,
        finalEvidenceCount: legacyEvidence.length,
        finalEvidenceCharCount: evidenceContentLength(legacyEvidence),
    });

    if (mode === "shadow") {
        retrievePlannedEvidence(input)
            .then((evidence) => {
                console.info("[AI Blueprint] retrieval:shadow", {
                    operation: input.operation,
                    retrievalMode: mode,
                    finalEvidenceCount: evidence.length,
                    finalEvidenceCharCount: evidenceContentLength(evidence),
                });
            })
            .catch((error) => {
                console.warn("[AI Blueprint] retrieval:shadow-failed", {
                    operation: input.operation,
                    fallbackReason: error instanceof Error ? error.message : "Unknown shadow retrieval error.",
                });
            });
    }

    return legacyEvidence;
};
