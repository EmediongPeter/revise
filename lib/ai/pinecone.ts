import "server-only";

import { Pinecone } from "@pinecone-database/pinecone";
import { Types } from "mongoose";
import KnowledgeChunk from "@/database/models/knowledge-chunk.model";
import { getPineconeNamespace, PINECONE_EMBEDDING_MODEL, requirePineconeConfig } from "@/lib/ai/config";
import type { BlueprintEvidence } from "@/lib/ai/types";
import type { KnowledgeSourceScope } from "@/types";

type ChunkForVector = {
    _id: { toString: () => string };
    workspaceId: { toString: () => string };
    sourceId: { toString: () => string };
    teamIds: Array<{ toString: () => string }>;
    scope: KnowledgeSourceScope;
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
    sourceVersion: number;
    metadata?: Record<string, unknown>;
};

type SourceForVector = {
    _id: string;
    title: string;
    sourceType: string;
    version: number;
};

type RetrievalSource = {
    _id: { toString: () => string };
    title: string;
    sourceType: string;
    version: number;
};

let pineconeClient: Pinecone | null = null;

const getPineconeIndex = () => {
    const config = requirePineconeConfig();

    if (!pineconeClient) {
        pineconeClient = new Pinecone({ apiKey: config.apiKey });
    }

    if (config.indexHost) {
        return pineconeClient.index({ host: config.indexHost } as never);
    }

    return pineconeClient.index(config.indexName);
};

const batch = <T,>(items: T[], size: number) => {
    const batches: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size));
    }

    return batches;
};

const vectorIdForChunk = (chunk: ChunkForVector) => chunk._id.toString();

export const upsertKnowledgeChunks = async ({
    chunks,
    source,
}: {
    chunks: ChunkForVector[];
    source: SourceForVector;
}) => {
    if (chunks.length === 0) return { embedded: 0, failed: 0 };

    const workspaceId = chunks[0].workspaceId.toString();
    const namespace = getPineconeNamespace(workspaceId);
    let embedded = 0;
    let failed = 0;

    for (const chunkBatch of batch(chunks, 40)) {
        try {
            const records = chunkBatch.map((chunk) => ({
                id: vectorIdForChunk(chunk),
                text: chunk.content,
                workspaceId,
                sourceId: source._id,
                sourceTitle: source.title,
                sourceType: source.sourceType,
                sourceVersion: source.version,
                chunkId: chunk._id.toString(),
                chunkIndex: chunk.chunkIndex,
                pageNumber: chunk.pageNumber || 0,
                sectionTitle: chunk.sectionTitle || "",
                scope: chunk.scope,
                teamIds: chunk.teamIds.map((teamId) => teamId.toString()),
                wordCount: chunk.wordCount,
            }));

            await (getPineconeIndex().namespace(namespace).upsertRecords as unknown as (
                options: unknown,
            ) => Promise<void>)({ records });

            await KnowledgeChunk.updateMany(
                { _id: { $in: chunkBatch.map((chunk) => chunk._id) } },
                {
                    embeddingStatus: "embedded",
                    embeddingModel: PINECONE_EMBEDDING_MODEL,
                    $set: {
                        "metadata.pineconeNamespace": namespace,
                        "metadata.embeddedAt": new Date().toISOString(),
                    },
                    $unset: {
                        "metadata.embeddingError": "",
                    },
                },
            );
            embedded += chunkBatch.length;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Embedding failed.";
            failed += chunkBatch.length;

            await KnowledgeChunk.updateMany(
                { _id: { $in: chunkBatch.map((chunk) => chunk._id) } },
                {
                    embeddingStatus: "failed",
                    embeddingModel: PINECONE_EMBEDDING_MODEL,
                    $set: {
                        "metadata.embeddingError": message,
                    },
                },
            );
        }
    }

    return { embedded, failed };
};

export const retrieveKnowledgeContext = async ({
    workspaceId,
    sources,
    query,
    teamIds = [],
    topK = 28,
}: {
    workspaceId: string;
    sources: RetrievalSource[];
    query: string;
    teamIds?: string[];
    topK?: number;
}): Promise<BlueprintEvidence[]> => {
    const sourceIds = sources.map((source) => source._id.toString());
    const sourceVersions = sources.map((source) => source.version);

    const filter: Record<string, unknown> = {
        workspaceId: { $eq: workspaceId },
        sourceId: { $in: sourceIds },
        sourceVersion: { $in: sourceVersions },
    };

    if (teamIds.length > 0) {
        filter.$or = [
            { scope: { $eq: "workspace" } },
            { teamIds: { $in: teamIds } },
        ];
    }

    const response = await (getPineconeIndex().namespace(getPineconeNamespace(workspaceId)).searchRecords as unknown as (
        input: unknown,
    ) => Promise<{ result?: { hits?: Array<{ fields?: Record<string, unknown> }> } }>)({
        query: {
            inputs: { text: query },
            topK,
            filter,
        },
        fields: [
            "text",
            "workspaceId",
            "sourceId",
            "sourceTitle",
            "sourceType",
            "sourceVersion",
            "chunkId",
            "chunkIndex",
            "pageNumber",
            "scope",
            "teamIds",
        ],
    });

    const sourceMap = new Map(sources.map((source) => [source._id.toString(), source]));

    const evidence: BlueprintEvidence[] = [];

    for (const hit of response.result?.hits || []) {
        const fields = hit.fields || {};
        const sourceId = String(fields.sourceId || "");
        const source = sourceMap.get(sourceId);
        const chunkId = String(fields.chunkId || "");

        if (!source || !chunkId || !fields.text) continue;

        evidence.push({
            sourceId,
            sourceTitle: String(fields.sourceTitle || source.title),
            sourceType: String(fields.sourceType || source.sourceType),
            chunkId,
            chunkIndex: Number(fields.chunkIndex || 0),
            pageNumber: Number(fields.pageNumber || 0) || undefined,
            content: String(fields.text),
        });
    }

    return evidence;
};

export const deleteSourceVectors = async ({
    workspaceId,
    sourceId,
}: {
    workspaceId: string | Types.ObjectId;
    sourceId: string | Types.ObjectId;
}) => {
    await (getPineconeIndex().namespace(getPineconeNamespace(workspaceId.toString())).deleteMany as unknown as (
        filter: unknown,
    ) => Promise<void>)({
        sourceId: { $eq: sourceId.toString() },
    });
};
