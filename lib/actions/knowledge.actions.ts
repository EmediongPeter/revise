'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import KnowledgeSource from "@/database/models/knowledge-source.model";
import Team from "@/database/models/team.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
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

    let version = 1;
    let replacesSourceObjectId: Types.ObjectId | undefined;

    if (input.replacesSourceId) {
        if (!Types.ObjectId.isValid(input.replacesSourceId)) {
            return { success: false, error: "The source version you are replacing could not be found." };
        }

        const previousSource = await KnowledgeSource.findOne({
            _id: input.replacesSourceId,
            workspaceId: access.workspace._id,
        });

        if (!previousSource) {
            return { success: false, error: "The source version you are replacing could not be found." };
        }

        version = previousSource.version + 1;
        replacesSourceObjectId = previousSource._id;
        previousSource.isCurrentVersion = false;
        await previousSource.save();
    }

    const source = await KnowledgeSource.create({
        workspaceId: access.workspace._id,
        teamIds: scopeResult.teamObjectIds,
        scope: scopeResult.scope,
        title,
        description: input.description?.trim() || undefined,
        sourceType: input.sourceType,
        origin: input.origin || "manual-upload",
        status: "uploaded",
        fileName: input.fileName?.trim() || undefined,
        fileUrl: input.fileUrl?.trim() || undefined,
        fileBlobKey: input.fileBlobKey?.trim() || undefined,
        mimeType: input.mimeType?.trim() || undefined,
        fileSize: input.fileSize,
        externalUrl: input.externalUrl?.trim() || undefined,
        externalId: input.externalId?.trim() || undefined,
        version,
        replacesSourceId: replacesSourceObjectId,
        isCurrentVersion: true,
        createdByClerkId: access.userId,
        updatedByClerkId: access.userId,
    });

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

export const archiveKnowledgeSource = async (
    sourceId: string,
): Promise<ActionResult<KnowledgeSourceSummary>> => {
    return updateKnowledgeSourceStatus({ sourceId, status: "archived" });
};
