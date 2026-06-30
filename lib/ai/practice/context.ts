import "server-only";

import { Types } from "mongoose";
import KnowledgeChunk from "@/database/models/knowledge-chunk.model";
import KnowledgeSource from "@/database/models/knowledge-source.model";
import { retrieveKnowledgeContext } from "@/lib/ai/pinecone";
import type { BlueprintEvidence } from "@/lib/ai/types";

const MAX_EVIDENCE_ITEMS = 4;
const MAX_EVIDENCE_CHARS = 1200;

const compactEvidence = (items: BlueprintEvidence[]) => {
    const seen = new Set<string>();

    return items
        .filter((item) => {
            if (seen.has(item.chunkId)) return false;
            seen.add(item.chunkId);
            return true;
        })
        .slice(0, MAX_EVIDENCE_ITEMS)
        .map((item) => ({
            ...item,
            content: item.content.replace(/\s+/g, " ").trim().slice(0, MAX_EVIDENCE_CHARS),
        }));
};

const queryTerms = (query: string) =>
    Array.from(
        new Set(
            query
                .toLowerCase()
                .match(/[a-z0-9]{4,}/g)
                ?.filter((term) => !["that", "this", "with", "from", "what", "when", "where"].includes(term)) || [],
        ),
    ).slice(0, 10);

const localFallback = async ({
    workspaceId,
    sourceIds,
    sourceMap,
    query,
}: {
    workspaceId: string;
    sourceIds: Types.ObjectId[];
    sourceMap: Map<string, { title: string; sourceType: string }>;
    query: string;
}) => {
    const terms = queryTerms(query);
    const contentFilter = terms.length > 0
        ? { $or: terms.map((term) => ({ content: { $regex: term, $options: "i" } })) }
        : {};
    const chunks = await KnowledgeChunk.find({
        workspaceId: new Types.ObjectId(workspaceId),
        sourceId: { $in: sourceIds },
        ...contentFilter,
    })
        .sort({ chunkIndex: 1 })
        .limit(MAX_EVIDENCE_ITEMS);

    return chunks.map((chunk) => {
        const source = sourceMap.get(chunk.sourceId.toString());

        return {
            sourceId: chunk.sourceId.toString(),
            sourceTitle: source?.title || "Training source",
            sourceType: source?.sourceType || "other",
            chunkId: chunk._id.toString(),
            chunkIndex: chunk.chunkIndex,
            pageNumber: chunk.pageNumber,
            content: chunk.content,
        };
    });
};

export const retrievePracticeContext = async ({
    workspaceId,
    sourceIds,
    memberTeamIds,
    scenarioTitle,
    scenarioSituation,
    traineeReply,
    knownGaps = [],
}: {
    workspaceId: string;
    sourceIds: Types.ObjectId[];
    memberTeamIds: Types.ObjectId[];
    scenarioTitle: string;
    scenarioSituation: string;
    traineeReply?: string;
    knownGaps?: string[];
}): Promise<BlueprintEvidence[]> => {
    if (sourceIds.length === 0) return [];

    const teamIds = memberTeamIds.map((teamId) => teamId.toString());
    const sources = await KnowledgeSource.find({
        _id: { $in: sourceIds },
        workspaceId: new Types.ObjectId(workspaceId),
        status: "ready",
        isCurrentVersion: true,
        $or: [
            { scope: "workspace" },
            ...(teamIds.length > 0 ? [{ scope: "teams", teamIds: { $in: memberTeamIds } }] : []),
        ],
    }).select("_id title sourceType version");

    if (sources.length === 0) return [];

    const query = [
        scenarioTitle,
        scenarioSituation,
        traineeReply ? `Trainee response: ${traineeReply}` : "",
        knownGaps.length > 0 ? `Knowledge gaps: ${knownGaps.join("; ")}` : "",
    ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 2400);
    const sourceMap = new Map(
        sources.map((source) => [
            source._id.toString(),
            { title: source.title, sourceType: source.sourceType },
        ]),
    );

    try {
        const evidence = await retrieveKnowledgeContext({
            workspaceId,
            sources,
            query,
            teamIds,
            topK: MAX_EVIDENCE_ITEMS,
        });

        if (evidence.length > 0) return compactEvidence(evidence);
    } catch (error) {
        console.warn("[Practice Trainer] pinecone-context-fallback", {
            message: error instanceof Error ? error.message : "Unknown retrieval error.",
        });
    }

    try {
        return compactEvidence(
            await localFallback({
                workspaceId,
                sourceIds: sources.map((source) => source._id),
                sourceMap,
                query,
            }),
        );
    } catch (error) {
        console.warn("[Practice Trainer] local-context-failed", {
            message: error instanceof Error ? error.message : "Unknown local retrieval error.",
        });
        return [];
    }
};
