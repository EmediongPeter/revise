'use server';

import { auth } from "@clerk/nextjs/server";
import { get as getBlob } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import KnowledgeChunk from "@/database/models/knowledge-chunk.model";
import KnowledgeSource from "@/database/models/knowledge-source.model";
import Team from "@/database/models/team.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import {
    ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS,
    ACCEPTED_KNOWLEDGE_SOURCE_TYPES,
    MAX_KNOWLEDGE_SOURCE_SIZE,
} from "@/lib/constants";
import { upsertKnowledgeChunks } from "@/lib/ai/pinecone";
import { parseKnowledgeFile } from "@/lib/knowledge/parse";
import { serializeData } from "@/lib/utils";
import type {
    IKnowledgeSource,
    IWorkspace,
    IWorkspaceMember,
    IUserProfile,
    KnowledgeSourceOrigin,
    KnowledgeSourceScope,
    KnowledgeSourceStatus,
    KnowledgeSourceType,
} from "@/types";

export type KnowledgeSourceSummary = {
    _id: string;
    workspaceId: string;
    teamIds: string[];
    scope: KnowledgeSourceScope;
    title: string;
    description?: string;
    sourceType: KnowledgeSourceType;
    origin: KnowledgeSourceOrigin;
    status: KnowledgeSourceStatus;
    fileName?: string;
    fileUrl?: string;
    fileBlobKey?: string;
    mimeType?: string;
    fileSize?: number;
    externalUrl?: string;
    externalId?: string;
    version: number;
    replacesSourceId?: string;
    isCurrentVersion: boolean;
    failureReason?: string;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type KnowledgeChunkPreview = {
    _id: string;
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
    embeddingStatus: string;
};

export type KnowledgeSourceDetail = KnowledgeSourceSummary & {
    chunks: KnowledgeChunkPreview[];
    chunkCount: number;
    totalChunkWords: number;
    pageCount: number;
    teamNames: string[];
};

export type CreateKnowledgeSourceInput = {
    title: string;
    description?: string;
    sourceType: KnowledgeSourceType;
    scope: KnowledgeSourceScope;
    teamIds?: string[];
    origin?: KnowledgeSourceOrigin;
    fileName?: string;
    fileUrl?: string;
    fileBlobKey?: string;
    mimeType?: string;
    fileSize?: number;
    externalUrl?: string;
    externalId?: string;
    replacesSourceId?: string;
};

export type UploadKnowledgeSourceInput = Omit<
    CreateKnowledgeSourceInput,
    "fileName" | "fileUrl" | "fileBlobKey" | "mimeType" | "fileSize" | "origin"
> & {
    fileName: string;
    mimeType: string;
    fileSize: number;
    fileUrl: string;
    fileBlobKey: string;
};

export type KnowledgeSourceDownloadRecord = {
    fileName: string;
    fileUrl: string;
    fileBlobKey: string;
    isPrivate: boolean;
};

export type ListKnowledgeSourcesInput = {
    teamId?: string;
    includeArchived?: boolean;
};

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

type ActiveWorkspaceAccess =
    | { error: string }
    | { userId: string; profile: IUserProfile; workspace: IWorkspace; membership: IWorkspaceMember };

type TeamValidationResult =
    | { valid: true; ids: Types.ObjectId[] }
    | { valid: false; error: string };

type ScopeResult =
    | { scope: KnowledgeSourceScope; teamObjectIds: Types.ObjectId[] }
    | { error: string };

type SourceLike = Pick<
    IKnowledgeSource,
    | "scope"
    | "title"
    | "description"
    | "sourceType"
    | "origin"
    | "status"
    | "fileName"
    | "fileUrl"
    | "fileBlobKey"
    | "mimeType"
    | "fileSize"
    | "externalUrl"
    | "externalId"
    | "version"
    | "isCurrentVersion"
    | "failureReason"
    | "createdByClerkId"
    | "updatedByClerkId"
    | "archivedAt"
    | "createdAt"
    | "updatedAt"
> & {
    _id: { toString: () => string };
    workspaceId: { toString: () => string };
    teamIds: Array<{ toString: () => string }>;
    replacesSourceId?: { toString: () => string };
};

const editableRoles = new Set(["owner", "admin", "trainer"]);

const hasAcceptedKnowledgeSourceType = (file: File) => {
    if (ACCEPTED_KNOWLEDGE_SOURCE_TYPES.includes(file.type)) return true;

    const fileName = file.name.toLowerCase();
    return ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
};

const getActiveWorkspaceAccess = async (): Promise<ActiveWorkspaceAccess> => {
    const { userId } = await auth();

    if (!userId) {
        return { error: "Please sign in to manage knowledge sources." };
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({ clerkId: userId });

    if (!profile?.activeWorkspaceId) {
        return { error: "No active workspace was found for your account." };
    }

    const [workspace, membership] = await Promise.all([
        Workspace.findById(profile.activeWorkspaceId),
        WorkspaceMember.findOne({
            workspaceId: profile.activeWorkspaceId,
            clerkId: userId,
            status: "active",
        }),
    ]);

    if (!workspace || !membership) {
        return { error: "You do not have access to this workspace." };
    }

    return { userId, profile, workspace, membership };
};

const ensureEditor = (membership: IWorkspaceMember) =>
    editableRoles.has(membership.role) ? null : "Only owners, admins, and trainers can manage knowledge sources.";

const normalizeObjectIds = (ids: string[] = []) =>
    Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const validateTeamIds = async (workspaceId: Types.ObjectId, teamIds: string[]): Promise<TeamValidationResult> => {
    if (teamIds.length === 0) return { valid: true, ids: [] as Types.ObjectId[] };

    if (teamIds.some((teamId) => !Types.ObjectId.isValid(teamId))) {
        return { valid: false, error: "One or more selected teams could not be found." };
    }

    const objectIds = teamIds.map((teamId) => new Types.ObjectId(teamId));
    const teamCount = await Team.countDocuments({ _id: { $in: objectIds }, workspaceId });

    if (teamCount !== objectIds.length) {
        return { valid: false, error: "One or more selected teams do not belong to this workspace." };
    }

    return { valid: true, ids: objectIds };
};

const normalizeScope = async (
    workspaceId: Types.ObjectId,
    scope: KnowledgeSourceScope,
    teamIds: string[] = [],
): Promise<ScopeResult> => {
    if (scope === "workspace") {
        return { scope, teamObjectIds: [] as Types.ObjectId[] };
    }

    const normalizedIds = normalizeObjectIds(teamIds);

    if (normalizedIds.length === 0) {
        return { error: "Select at least one team or choose entire workspace scope." };
    }

    const validation = await validateTeamIds(workspaceId, normalizedIds);

    if (!validation.valid) {
        return { error: validation.error || "Selected teams are invalid." };
    }

    return { scope, teamObjectIds: validation.ids };
};

const serializeSource = (source: SourceLike): KnowledgeSourceSummary => ({
    _id: source._id.toString(),
    workspaceId: source.workspaceId.toString(),
    teamIds: source.teamIds.map((teamId) => teamId.toString()),
    scope: source.scope,
    title: source.title,
    description: source.description,
    sourceType: source.sourceType,
    origin: source.origin,
    status: source.status,
    fileName: source.fileName,
    fileUrl: source.fileUrl,
    fileBlobKey: source.fileBlobKey,
    mimeType: source.mimeType,
    fileSize: source.fileSize,
    externalUrl: source.externalUrl,
    externalId: source.externalId,
    version: source.version,
    replacesSourceId: source.replacesSourceId?.toString(),
    isCurrentVersion: source.isCurrentVersion,
    failureReason: source.failureReason,
    createdByClerkId: source.createdByClerkId,
    updatedByClerkId: source.updatedByClerkId,
    archivedAt: source.archivedAt?.toISOString(),
    createdAt: source.createdAt?.toISOString(),
    updatedAt: source.updatedAt?.toISOString(),
});

const serializeChunkPreview = (chunk: {
    _id: { toString: () => string };
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
    embeddingStatus: string;
}): KnowledgeChunkPreview => ({
    _id: chunk._id.toString(),
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.sectionTitle,
    wordCount: chunk.wordCount,
    embeddingStatus: chunk.embeddingStatus,
});

export const createKnowledgeSourceMetadata = async (
    input: CreateKnowledgeSourceInput,
): Promise<ActionResult<KnowledgeSourceSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const permissionError = ensureEditor(access.membership);

    if (permissionError) {
        return { success: false, error: permissionError };
    }

    const title = input.title.trim();

    if (title.length < 2) {
        return { success: false, error: "Source title must be at least 2 characters." };
    }

    const scopeResult = await normalizeScope(access.workspace._id, input.scope, input.teamIds);

    if ("error" in scopeResult) {
        return { success: false, error: scopeResult.error };
    }

    const sourceData = {
        workspaceId: access.workspace._id,
        teamIds: scopeResult.teamObjectIds,
        scope: scopeResult.scope,
        title,
        description: input.description?.trim() || undefined,
        sourceType: input.sourceType,
        origin: input.origin || "manual-upload",
        status: "uploaded" as const,
        fileName: input.fileName?.trim() || undefined,
        fileUrl: input.fileUrl?.trim() || undefined,
        fileBlobKey: input.fileBlobKey?.trim() || undefined,
        mimeType: input.mimeType?.trim() || undefined,
        fileSize: input.fileSize,
        externalUrl: input.externalUrl?.trim() || undefined,
        externalId: input.externalId?.trim() || undefined,
        version: 1,
        replacesSourceId: undefined as Types.ObjectId | undefined,
        isCurrentVersion: true,
        createdByClerkId: access.userId,
        updatedByClerkId: access.userId,
    };

    let source!: IKnowledgeSource;

    if (input.replacesSourceId) {
        if (!Types.ObjectId.isValid(input.replacesSourceId)) {
            return { success: false, error: "The source version you are replacing could not be found." };
        }

        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                const previousSource = await KnowledgeSource.findOne({
                    _id: input.replacesSourceId,
                    workspaceId: access.workspace._id,
                }).session(session);

                if (!previousSource) {
                    throw new Error("The source version you are replacing could not be found.");
                }

                if (!previousSource.isCurrentVersion) {
                    throw new Error("Only the current source version can be replaced.");
                }

                sourceData.version = previousSource.version + 1;
                sourceData.replacesSourceId = previousSource._id;
                previousSource.isCurrentVersion = false;
                previousSource.updatedByClerkId = access.userId;
                await previousSource.save({ session });

                const [createdSource] = await KnowledgeSource.create([sourceData], { session });
                source = createdSource;
            });
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create source version.",
            };
        } finally {
            await session.endSession();
        }
    } else {
        source = await KnowledgeSource.create(sourceData);
    }

    revalidatePath("/knowledge");
    revalidatePath(`/${access.workspace.slug}`);

    return { success: true, data: serializeData(serializeSource(source)) };
};

export const listKnowledgeSources = async (
    input: ListKnowledgeSourcesInput = {},
): Promise<ActionResult<KnowledgeSourceSummary[]>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (input.teamId && !Types.ObjectId.isValid(input.teamId)) {
        return { success: false, error: "That team could not be found." };
    }

    const query: Record<string, unknown> = {
        workspaceId: access.workspace._id,
        isCurrentVersion: true,
    };

    if (!input.includeArchived) {
        query.status = { $ne: "archived" };
    }

    if (input.teamId) {
        const teamValidation = await validateTeamIds(access.workspace._id, [input.teamId]);

        if (!teamValidation.valid) {
            return { success: false, error: teamValidation.error || "That team does not belong to this workspace." };
        }

        query.$or = [
            { scope: "workspace" },
            { scope: "teams", teamIds: teamValidation.ids[0] },
        ];
    }

    const sources = await KnowledgeSource.find(query).sort({ updatedAt: -1 }).lean();

    return { success: true, data: serializeData(sources.map(serializeSource)) };
};

export const getKnowledgeSourceDetail = async (
    sourceId: string,
): Promise<ActionResult<KnowledgeSourceDetail>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!Types.ObjectId.isValid(sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const source = await KnowledgeSource.findOne({
        _id: sourceId,
        workspaceId: access.workspace._id,
    }).lean();

    if (!source) {
        return { success: false, error: "That source could not be found." };
    }

    const [chunks, chunkStats, scopedTeams] = await Promise.all([
        KnowledgeChunk.find({ sourceId: source._id, workspaceId: access.workspace._id })
            .sort({ chunkIndex: 1 })
            .limit(8)
            .lean(),
        KnowledgeChunk.aggregate([
            { $match: { sourceId: source._id, workspaceId: access.workspace._id } },
            {
                $group: {
                    _id: null,
                    chunkCount: { $sum: 1 },
                    totalChunkWords: { $sum: "$wordCount" },
                    pages: { $addToSet: "$pageNumber" },
                },
            },
        ]),
        Team.find({ _id: { $in: source.teamIds }, workspaceId: access.workspace._id }).sort({ name: 1 }).lean(),
    ]);

    const stats = chunkStats[0] as
        | { chunkCount?: number; totalChunkWords?: number; pages?: Array<number | null | undefined> }
        | undefined;

    return {
        success: true,
        data: serializeData({
            ...serializeSource(source),
            chunks: chunks.map(serializeChunkPreview),
            chunkCount: stats?.chunkCount || 0,
            totalChunkWords: stats?.totalChunkWords || 0,
            pageCount: (stats?.pages || []).filter((page) => typeof page === "number").length,
            teamNames: scopedTeams.map((team) => team.name),
        }),
    };
};

export const updateKnowledgeSourceStatus = async (input: {
    sourceId: string;
    status: KnowledgeSourceStatus;
    failureReason?: string;
}): Promise<ActionResult<KnowledgeSourceSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const permissionError = ensureEditor(access.membership);

    if (permissionError) {
        return { success: false, error: permissionError };
    }

    if (!Types.ObjectId.isValid(input.sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const source = await KnowledgeSource.findOneAndUpdate(
        { _id: input.sourceId, workspaceId: access.workspace._id },
        {
            status: input.status,
            failureReason: input.status === "failed" ? input.failureReason?.trim() || "Processing failed." : undefined,
            updatedByClerkId: access.userId,
            archivedAt: input.status === "archived" ? new Date() : undefined,
        },
        { new: true },
    );

    if (!source) {
        return { success: false, error: "That source could not be found." };
    }

    revalidatePath("/knowledge");
    revalidatePath(`/${access.workspace.slug}`);
    revalidatePath(`/${access.workspace.slug}/knowledge/${input.sourceId}`);

    return { success: true, data: serializeData(serializeSource(source)) };
};

export const updateKnowledgeSourceScope = async (input: {
    sourceId: string;
    scope: KnowledgeSourceScope;
    teamIds?: string[];
}): Promise<ActionResult<KnowledgeSourceSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const permissionError = ensureEditor(access.membership);

    if (permissionError) {
        return { success: false, error: permissionError };
    }

    if (!Types.ObjectId.isValid(input.sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const scopeResult = await normalizeScope(access.workspace._id, input.scope, input.teamIds);

    if ("error" in scopeResult) {
        return { success: false, error: scopeResult.error };
    }

    const source = await KnowledgeSource.findOneAndUpdate(
        { _id: input.sourceId, workspaceId: access.workspace._id },
        {
            scope: scopeResult.scope,
            teamIds: scopeResult.teamObjectIds,
            updatedByClerkId: access.userId,
        },
        { new: true },
    );

    if (!source) {
        return { success: false, error: "That source could not be found." };
    }

    revalidatePath("/knowledge");
    revalidatePath(`/${access.workspace.slug}`);

    return { success: true, data: serializeData(serializeSource(source)) };
};

export const updateKnowledgeSourceType = async (input: {
    sourceId: string;
    sourceType: KnowledgeSourceType;
}): Promise<ActionResult<KnowledgeSourceSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const permissionError = ensureEditor(access.membership);

    if (permissionError) {
        return { success: false, error: permissionError };
    }

    if (!Types.ObjectId.isValid(input.sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const source = await KnowledgeSource.findOneAndUpdate(
        { _id: input.sourceId, workspaceId: access.workspace._id },
        {
            sourceType: input.sourceType,
            updatedByClerkId: access.userId,
        },
        { new: true },
    );

    if (!source) {
        return { success: false, error: "That source could not be found." };
    }

    revalidatePath("/knowledge");
    revalidatePath(`/${access.workspace.slug}`);
    revalidatePath(`/${access.workspace.slug}/knowledge/${input.sourceId}`);

    return { success: true, data: serializeData(serializeSource(source)) };
};

export const archiveKnowledgeSource = async (
    sourceId: string,
): Promise<ActionResult<KnowledgeSourceSummary>> => {
    return updateKnowledgeSourceStatus({ sourceId, status: "archived" });
};

export const processUploadedKnowledgeSource = async (
    input: UploadKnowledgeSourceInput,
): Promise<ActionResult<KnowledgeSourceSummary>> => {
    const fileDescriptor = { name: input.fileName, type: input.mimeType } as File;

    if (!hasAcceptedKnowledgeSourceType(fileDescriptor)) {
        return { success: false, error: "Upload a PDF, TXT, or Markdown source file." };
    }

    if (input.fileSize > MAX_KNOWLEDGE_SOURCE_SIZE) {
        return { success: false, error: "Knowledge source must be 25MB or smaller." };
    }
    if (!input.fileBlobKey.startsWith("knowledge/") || !input.fileUrl.includes(".private.blob.")) {
        return { success: false, error: "The uploaded source location is invalid." };
    }

    const access = await getActiveWorkspaceAccess();
    if ("error" in access) return { success: false, error: access.error };

    const blobResult = await getBlob(input.fileBlobKey, { access: "private", useCache: false });

    if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
        return { success: false, error: "The uploaded source file could not be read." };
    }

    if (blobResult.blob.size > MAX_KNOWLEDGE_SOURCE_SIZE) {
        return { success: false, error: "Knowledge source must be 25MB or smaller." };
    }

    const fileBuffer = await new Response(blobResult.stream).arrayBuffer();
    const file = new File([fileBuffer], input.fileName, {
        type: blobResult.blob.contentType || input.mimeType,
    });

    const sourceResult = await createKnowledgeSourceMetadata({
        ...input,
        origin: "manual-upload",
        fileName: input.fileName,
        fileUrl: blobResult.blob.url,
        fileBlobKey: blobResult.blob.pathname,
        mimeType: file.type,
        fileSize: blobResult.blob.size,
    });

    if (!sourceResult.success) {
        return sourceResult;
    }

    await updateKnowledgeSourceStatus({ sourceId: sourceResult.data._id, status: "processing" });

    try {
        const parsed = await parseKnowledgeFile(file);

        if (parsed.chunks.length === 0) {
            throw new Error("No readable text was found in this source.");
        }

        await KnowledgeChunk.deleteMany({ sourceId: sourceResult.data._id });
        const createdChunks = await KnowledgeChunk.insertMany(
            parsed.chunks.map((chunk) => ({
                workspaceId: access.workspace._id,
                sourceId: sourceResult.data._id,
                teamIds: sourceResult.data.teamIds.map((teamId) => new Types.ObjectId(teamId)),
                scope: sourceResult.data.scope,
                content: chunk.content,
                chunkIndex: chunk.chunkIndex,
                pageNumber: chunk.pageNumber,
                sectionTitle: chunk.sectionTitle,
                wordCount: chunk.wordCount,
                sourceVersion: sourceResult.data.version,
                embeddingStatus: "pending",
                metadata: {
                    parser: "phase-2-upload",
                    characterCount: parsed.characterCount,
                    totalSourceWordCount: parsed.wordCount,
                },
            })),
        );

        const embeddingResult = await upsertKnowledgeChunks({
            chunks: createdChunks,
            source: {
                _id: sourceResult.data._id,
                title: sourceResult.data.title,
                sourceType: sourceResult.data.sourceType,
                version: sourceResult.data.version,
            },
        });

        if (embeddingResult.embedded === 0) {
            throw new Error(
                `Vector indexing failed for all ${embeddingResult.failed || createdChunks.length} source chunks.`,
            );
        }

        if (embeddingResult.failed > 0) {
            console.warn("[Knowledge Source] embedding-partial-failure", {
                sourceId: sourceResult.data._id,
                embedded: embeddingResult.embedded,
                failed: embeddingResult.failed,
            });
        }

        const readyResult = await updateKnowledgeSourceStatus({ sourceId: sourceResult.data._id, status: "ready" });
        return readyResult;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process source.";
        await updateKnowledgeSourceStatus({
            sourceId: sourceResult.data._id,
            status: "failed",
            failureReason: message,
        });

        return { success: false, error: message };
    }
};

export const getKnowledgeSourceDownloadRecord = async (
    sourceId: string,
): Promise<ActionResult<KnowledgeSourceDownloadRecord>> => {
    const access = await getActiveWorkspaceAccess();
    if ("error" in access) return { success: false, error: access.error };
    if (!Types.ObjectId.isValid(sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const source = await KnowledgeSource.findOne({
        _id: sourceId,
        workspaceId: access.workspace._id,
        status: { $ne: "archived" },
    }).select("scope teamIds fileName fileUrl fileBlobKey");

    if (!source?.fileUrl || !source.fileBlobKey) {
        return { success: false, error: "The original source file is unavailable." };
    }

    const memberTeamIds = new Set(
        (access.membership.teamIds || []).map((teamId: Types.ObjectId) => teamId.toString()),
    );
    const canRead =
        editableRoles.has(access.membership.role) ||
        source.scope === "workspace" ||
        source.teamIds.some((teamId: Types.ObjectId) => memberTeamIds.has(teamId.toString()));

    if (!canRead) return { success: false, error: "You do not have access to this source." };

    return {
        success: true,
        data: {
            fileName: source.fileName || "knowledge-source",
            fileUrl: source.fileUrl,
            fileBlobKey: source.fileBlobKey,
            isPrivate: source.fileUrl.includes(".private.blob."),
        },
    };
};
