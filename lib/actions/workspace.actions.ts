'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import Team from "@/database/models/team.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { slugifyWorkspace } from "@/lib/onboarding";
import { serializeData } from "@/lib/utils";
import { getKnowledgeUploadPrefix } from "@/lib/knowledge/upload-path";
import type { ITeam, IWorkspace, IWorkspaceMember, IUserProfile } from "@/types";

export type WorkspaceSummary = {
    _id: string;
    name: string;
    slug: string;
    avatarSeed?: string;
    industry: string;
    ownerClerkId: string;
    trainingGoals: string[];
    googleDriveConnected: boolean;
    uploadedSourceName?: string;
    memberRole: string;
};

export type TeamSummary = {
    _id: string;
    workspaceId: string;
    name: string;
    description?: string;
    isDefault: boolean;
};

export type WorkspaceTeamData = {
    activeWorkspace: WorkspaceSummary;
    workspaces: WorkspaceSummary[];
    teams: TeamSummary[];
    knowledgeUploadPrefix: string;
};

type ActionResult<T = undefined> =
    | { success: true; data: T }
    | { success: false; error: string };

type DocumentId = { toString: () => string };

type WorkspaceLike = Pick<
    IWorkspace,
    "name" | "slug" | "avatarSeed" | "industry" | "ownerClerkId" | "trainingGoals" | "googleDriveConnected" | "uploadedSourceName"
> & {
    _id: DocumentId;
};

type TeamLike = Pick<ITeam, "name" | "description" | "isDefault"> & {
    _id: DocumentId;
    workspaceId: DocumentId;
};

type ActiveWorkspaceAccess =
    | { error: string }
    | { profile: IUserProfile; membership: IWorkspaceMember; workspace: IWorkspace };

const normalizeTrainingGoals = (value: string[] | string) => {
    const goals = Array.isArray(value) ? value : value.split(/[,\n]/);

    return Array.from(new Set(goals.map((goal) => goal.trim()).filter(Boolean))).slice(0, 8);
};

const getCurrentUserEmail = async () => {
    const { userId } = await auth();

    if (!userId) return { userId: null, email: null, displayName: null };

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress;
    const email = primaryEmail || user.emailAddresses[0]?.emailAddress || null;

    return {
        userId,
        email: email?.toLowerCase() || null,
        displayName: user.fullName || user.firstName || email?.split("@")[0] || "Workspace owner",
    };
};

const serializeWorkspace = (workspace: WorkspaceLike, memberRole: string): WorkspaceSummary => ({
    _id: workspace._id.toString(),
    name: workspace.name,
    slug: workspace.slug,
    avatarSeed: workspace.avatarSeed,
    industry: workspace.industry,
    ownerClerkId: workspace.ownerClerkId,
    trainingGoals: workspace.trainingGoals || [],
    googleDriveConnected: Boolean(workspace.googleDriveConnected),
    uploadedSourceName: workspace.uploadedSourceName,
    memberRole,
});

const serializeTeam = (team: TeamLike): TeamSummary => ({
    _id: team._id.toString(),
    workspaceId: team.workspaceId.toString(),
    name: team.name,
    description: team.description,
    isDefault: Boolean(team.isDefault),
});

const ensureActiveWorkspaceAccess = async (userId: string): Promise<ActiveWorkspaceAccess> => {
    const profile = await UserProfile.findOne({ clerkId: userId });

    if (!profile?.activeWorkspaceId) {
        return { error: "No active workspace was found for your account." };
    }

    const membership = await WorkspaceMember.findOne({
        workspaceId: profile.activeWorkspaceId,
        clerkId: userId,
        status: "active",
    });

    if (!membership) {
        return { error: "You do not have access to this workspace." };
    }

    const workspace = await Workspace.findById(profile.activeWorkspaceId);

    if (!workspace) {
        return { error: "The active workspace no longer exists." };
    }

    return { profile, membership, workspace };
};

const isDuplicateKeyError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000;

export const getWorkspaceTeamData = async (): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in to manage workspaces." };
    }

    await connectToDatabase();

    const memberships = await WorkspaceMember.find({ clerkId: userId, status: "active" }).lean();
    const workspaceIds = memberships.map((membership) => membership.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).sort({ updatedAt: -1 }).lean();
    const profile = await UserProfile.findOne({ clerkId: userId }).lean();

    if (workspaces.length === 0) {
        return { success: false, error: "No workspaces were found for your account." };
    }

    const activeWorkspace =
        workspaces.find((workspace) => workspace._id.toString() === profile?.activeWorkspaceId?.toString()) || workspaces[0];

    if (profile?.activeWorkspaceId?.toString() !== activeWorkspace._id.toString()) {
        await UserProfile.findOneAndUpdate({ clerkId: userId }, { activeWorkspaceId: activeWorkspace._id });
    }

    const roleByWorkspaceId = new Map(
        memberships.map((membership) => [membership.workspaceId.toString(), membership.role]),
    );
    const teams = await Team.find({ workspaceId: activeWorkspace._id }).sort({ isDefault: -1, name: 1 }).lean();

    return {
        success: true,
        data: serializeData({
            activeWorkspace: serializeWorkspace(activeWorkspace, roleByWorkspaceId.get(activeWorkspace._id.toString()) || "member"),
            workspaces: workspaces.map((workspace) =>
                serializeWorkspace(workspace, roleByWorkspaceId.get(workspace._id.toString()) || "member"),
            ),
            teams: teams.map(serializeTeam),
            knowledgeUploadPrefix: getKnowledgeUploadPrefix(activeWorkspace._id.toString(), userId),
        }),
    };
};

export const switchWorkspace = async (workspaceId: string): Promise<ActionResult<{ workspaceSlug: string }>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before switching workspaces." };
    }

    if (!Types.ObjectId.isValid(workspaceId)) {
        return { success: false, error: "That workspace could not be found." };
    }

    await connectToDatabase();

    const membership = await WorkspaceMember.findOne({
        workspaceId,
        clerkId: userId,
        status: "active",
    }).lean();

    if (!membership) {
        return { success: false, error: "You do not have access to that workspace." };
    }

    const workspace = await Workspace.findById(workspaceId).lean();

    if (!workspace) {
        return { success: false, error: "That workspace no longer exists." };
    }

    await UserProfile.findOneAndUpdate({ clerkId: userId }, { activeWorkspaceId: workspace._id });
    revalidatePath("/");
    revalidatePath("/settings");

    return { success: true, data: { workspaceSlug: workspace.slug } };
};

export const createWorkspace = async (input: {
    name: string;
    slug?: string;
    industry?: string;
}): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId, email, displayName } = await getCurrentUserEmail();

    if (!userId || !email) {
        return { success: false, error: "Please sign in with an email address before creating a workspace." };
    }

    const name = input.name.trim();
    const slug = slugifyWorkspace(input.slug || name);

    if (name.length < 2) {
        return { success: false, error: "Workspace name must be at least 2 characters." };
    }

    if (slug.length < 2) {
        return { success: false, error: "Workspace URL must be at least 2 characters." };
    }

    await connectToDatabase();

    if (await Workspace.exists({ slug })) {
        return { success: false, error: "That workspace URL is already taken." };
    }

    const workspaceId = new Types.ObjectId();
    const session = await mongoose.startSession();
    let workspace!: IWorkspace;

    try {
        await session.withTransaction(async () => {
            const [createdWorkspace] = await Workspace.create(
                [{
                    _id: workspaceId,
                    name,
                    slug,
                    avatarSeed: slug,
                    industry: input.industry?.trim() || "Other",
                    ownerClerkId: userId,
                    createdByClerkId: userId,
                    trainingGoals: [],
                    googleDriveConnected: false,
                }],
                { session },
            );
            workspace = createdWorkspace;

            await UserProfile.findOneAndUpdate(
                { clerkId: userId },
                {
                    clerkId: userId,
                    email,
                    displayName,
                    onboardingCompleted: true,
                    activeWorkspaceId: workspaceId,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true, session },
            );

            await WorkspaceMember.create(
                [{
                    workspaceId,
                    clerkId: userId,
                    email,
                    displayName,
                    role: "owner",
                    status: "active",
                    invitedByClerkId: userId,
                }],
                { session },
            );

            await Team.create(
                [{
                    workspaceId,
                    name: "General",
                    description: "Default team for shared training modules.",
                    createdByClerkId: userId,
                    isDefault: true,
                }],
                { session },
            );
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return { success: false, error: "That workspace URL is already taken." };
        }

        throw error;
    } finally {
        await session.endSession();
    }

    revalidatePath("/");
    revalidatePath("/settings");

    const result = await getWorkspaceTeamData();
    return result.success ? result : {
        success: true,
        data: serializeData({
            activeWorkspace: serializeWorkspace(workspace, "owner"),
            workspaces: [serializeWorkspace(workspace, "owner")],
            teams: [],
            knowledgeUploadPrefix: getKnowledgeUploadPrefix(workspace._id.toString(), userId),
        }),
    };
};

export const updateActiveWorkspace = async (input: {
    name: string;
    slug: string;
    industry: string;
    trainingGoals: string[] | string;
    googleDriveConnected?: boolean;
    uploadedSourceName?: string;
}): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before editing workspace settings." };
    }

    const name = input.name.trim();
    const slug = slugifyWorkspace(input.slug);

    if (name.length < 2) {
        return { success: false, error: "Workspace name must be at least 2 characters." };
    }

    if (slug.length < 2) {
        return { success: false, error: "Workspace URL must be at least 2 characters." };
    }

    await connectToDatabase();

    const access = await ensureActiveWorkspaceAccess(userId);

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!["owner", "admin"].includes(access.membership.role)) {
        return { success: false, error: "Only owners and admins can update workspace settings." };
    }

    const slugOwner = await Workspace.findOne({ slug, _id: { $ne: access.workspace._id } }).lean();

    if (slugOwner) {
        return { success: false, error: "That workspace URL is already taken." };
    }

    await Workspace.findByIdAndUpdate(access.workspace._id, {
        name,
        slug,
        avatarSeed: slug,
        industry: input.industry.trim() || "Other",
        trainingGoals: normalizeTrainingGoals(input.trainingGoals),
        googleDriveConnected: Boolean(input.googleDriveConnected),
        uploadedSourceName: input.uploadedSourceName?.trim() || undefined,
    });

    revalidatePath("/");
    revalidatePath("/settings");
    revalidatePath(`/${access.workspace.slug}`);
    revalidatePath(`/${slug}`);

    const result = await getWorkspaceTeamData();
    return result.success ? result : { success: false, error: result.error };
};

export const createTeam = async (input: {
    name: string;
    description?: string;
}): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before adding a team." };
    }

    const name = input.name.trim();

    if (name.length < 2) {
        return { success: false, error: "Team name must be at least 2 characters." };
    }

    await connectToDatabase();

    const access = await ensureActiveWorkspaceAccess(userId);

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!["owner", "admin", "trainer"].includes(access.membership.role)) {
        return { success: false, error: "You do not have permission to add teams." };
    }

    try {
        await Team.create({
            workspaceId: access.workspace._id,
            name,
            description: input.description?.trim() || undefined,
            createdByClerkId: userId,
            isDefault: false,
        });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return { success: false, error: "A team with that name already exists in this workspace." };
        }

        throw error;
    }

    revalidatePath("/settings");
    const result = await getWorkspaceTeamData();
    return result.success ? result : { success: false, error: result.error };
};

export const updateTeam = async (input: {
    teamId: string;
    name: string;
    description?: string;
}): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before editing a team." };
    }

    if (!Types.ObjectId.isValid(input.teamId)) {
        return { success: false, error: "That team could not be found." };
    }

    const name = input.name.trim();

    if (name.length < 2) {
        return { success: false, error: "Team name must be at least 2 characters." };
    }

    await connectToDatabase();

    const access = await ensureActiveWorkspaceAccess(userId);

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!["owner", "admin", "trainer"].includes(access.membership.role)) {
        return { success: false, error: "You do not have permission to edit teams." };
    }

    try {
        const updatedTeam = await Team.findOneAndUpdate(
            { _id: input.teamId, workspaceId: access.workspace._id },
            { name, description: input.description?.trim() || undefined },
        );

        if (!updatedTeam) {
            return { success: false, error: "That team could not be found." };
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return { success: false, error: "A team with that name already exists in this workspace." };
        }

        throw error;
    }

    revalidatePath("/settings");
    const result = await getWorkspaceTeamData();
    return result.success ? result : { success: false, error: result.error };
};

export const deleteTeam = async (teamId: string): Promise<ActionResult<WorkspaceTeamData>> => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before deleting a team." };
    }

    if (!Types.ObjectId.isValid(teamId)) {
        return { success: false, error: "That team could not be found." };
    }

    await connectToDatabase();

    const access = await ensureActiveWorkspaceAccess(userId);

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!["owner", "admin"].includes(access.membership.role)) {
        return { success: false, error: "Only owners and admins can delete teams." };
    }

    const team = await Team.findOne({ _id: teamId, workspaceId: access.workspace._id });

    if (!team) {
        return { success: false, error: "That team could not be found." };
    }

    if (team.isDefault) {
        return { success: false, error: "The default team cannot be deleted." };
    }

    await team.deleteOne();

    revalidatePath("/settings");
    const result = await getWorkspaceTeamData();
    return result.success ? result : { success: false, error: result.error };
};
