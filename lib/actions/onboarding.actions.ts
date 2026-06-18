'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import Team from "@/database/models/team.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { serializeData } from "@/lib/utils";
import { slugifyWorkspace } from "@/lib/onboarding";

export type CompleteOnboardingInput = {
    displayName: string;
    workspaceName: string;
    workspaceSlug: string;
    industry: string;
    role: string;
    trainingGoals: string[];
    inviteEmails: string;
    googleDriveConnected: boolean;
    uploadedSourceName?: string;
};

const GOOGLE_PROVIDER = "oauth_google";

const parseInviteEmails = (value: string) =>
    Array.from(
        new Set(
            value
                .split(/[,\n]/)
                .map((email) => email.trim().toLowerCase())
                .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
        ),
    );

const slugSuffixWords = [
    "bright",
    "calm",
    "clear",
    "elegant",
    "fresh",
    "golden",
    "steady",
    "swift",
    "vivid",
    "wise",
];

const slugSuffixNouns = [
    "atlas",
    "bridge",
    "field",
    "harbor",
    "lane",
    "signal",
    "studio",
    "team",
    "works",
    "yard",
];

const generateWorkspaceSlugVariant = (baseSlug: string) => {
    const adjective = slugSuffixWords[Math.floor(Math.random() * slugSuffixWords.length)];
    const noun = slugSuffixNouns[Math.floor(Math.random() * slugSuffixNouns.length)];
    return `${baseSlug}-${adjective}-${noun}`;
};

const getAvailableWorkspaceSlug = async (baseValue: string) => {
    const baseSlug = slugifyWorkspace(baseValue);
    let slug = baseSlug;

    while (await Workspace.exists({ slug })) {
        slug = generateWorkspaceSlugVariant(baseSlug);
    }

    return slug;
};

export const getOnboardingStatus = async () => {
    const { userId } = await auth();

    if (!userId) {
        return { authenticated: false, completed: false };
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({ clerkId: userId }).lean();

    if (!profile?.onboardingCompleted || !profile.activeWorkspaceId) {
        return { authenticated: true, completed: false };
    }

    const workspace = await Workspace.findById(profile.activeWorkspaceId).lean();

    if (!workspace) {
        return { authenticated: true, completed: false };
    }

    const membership = await WorkspaceMember.findOne({
        workspaceId: profile.activeWorkspaceId,
        clerkId: userId,
        status: "active",
    }).lean();

    return {
        authenticated: true,
        completed: Boolean(membership),
        profile: serializeData(profile),
        workspace: serializeData(workspace),
        workspaceId: profile.activeWorkspaceId.toString(),
        workspaceSlug: workspace.slug,
    };
};

export const completeOnboarding = async (input: CompleteOnboardingInput) => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "You need to sign in before creating a workspace." };
    }

    let user;

    try {
        const client = await clerkClient();
        user = await client.users.getUser(userId);
    } catch (error) {
        console.error("Failed to load auth user for onboarding", error);
        return { success: false, error: "We could not load your account details. Please refresh and try again." };
    }

    await connectToDatabase();

    const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress;
    const email = primaryEmail || user.emailAddresses[0]?.emailAddress;

    if (!email) {
        return { success: false, error: "Your account needs an email address before onboarding can continue." };
    }

    const existingProfile = await UserProfile.findOne({ clerkId: userId }).lean();

    if (existingProfile?.onboardingCompleted && existingProfile.activeWorkspaceId) {
        const existingWorkspace = await Workspace.findById(existingProfile.activeWorkspaceId).lean();

        return {
            success: true,
            data: {
                alreadyCompleted: true,
                workspaceId: existingProfile.activeWorkspaceId.toString(),
                workspaceSlug: existingWorkspace?.slug,
            },
        };
    }

    const workspaceName = input.workspaceName.trim();
    const workspaceSlug = await getAvailableWorkspaceSlug(input.workspaceSlug || workspaceName);
    const displayName =
        input.displayName.trim() ||
        user.fullName ||
        user.firstName ||
        email.split("@")[0] ||
        "Workspace owner";

    const workspace = await Workspace.create({
        name: workspaceName,
        slug: workspaceSlug,
        avatarSeed: workspaceSlug,
        industry: input.industry,
        ownerClerkId: userId,
        createdByClerkId: userId,
        trainingGoals: input.trainingGoals,
        googleDriveConnected: input.googleDriveConnected,
        uploadedSourceName: input.uploadedSourceName,
    });

    const workspaceId = workspace._id as Types.ObjectId;

    await UserProfile.findOneAndUpdate(
        { clerkId: userId },
        {
            clerkId: userId,
            email: email.toLowerCase(),
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            displayName,
            imageUrl: user.imageUrl || undefined,
            role: input.role,
            onboardingCompleted: true,
            activeWorkspaceId: workspaceId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await WorkspaceMember.findOneAndUpdate(
        { workspaceId, email: email.toLowerCase() },
        {
            workspaceId,
            clerkId: userId,
            email: email.toLowerCase(),
            displayName,
            role: "owner",
            status: "active",
            invitedByClerkId: userId,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await Team.findOneAndUpdate(
        { workspaceId, name: "General" },
        {
            workspaceId,
            name: "General",
            description: "Default team for workspace onboarding and shared training modules.",
            createdByClerkId: userId,
            isDefault: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const invitedEmails = parseInviteEmails(input.inviteEmails).filter((inviteEmail) => inviteEmail !== email.toLowerCase());

    if (invitedEmails.length > 0) {
        await WorkspaceMember.bulkWrite(
            invitedEmails.map((inviteEmail) => ({
                updateOne: {
                    filter: { workspaceId, email: inviteEmail },
                    update: {
                        $setOnInsert: {
                            workspaceId,
                            email: inviteEmail,
                            role: "member",
                            status: "invited",
                            invitedByClerkId: userId,
                        },
                    },
                    upsert: true,
                },
            })),
        );
    }

    return {
        success: true,
        data: {
            workspaceId: workspaceId.toString(),
            workspaceSlug,
            workspace: serializeData(workspace),
        },
    };
};

export const connectGoogleDrive = async () => {
    const { userId } = await auth();

    if (!userId) {
        return { success: false, error: "Please sign in before connecting Google Drive." };
    }

    try {
        const client = await clerkClient();
        const response = await client.users.getUserOauthAccessToken(userId, GOOGLE_PROVIDER);
        const token = response.data[0]?.token;

        if (!token) {
            return {
                success: false,
                needsGoogleConnection: true,
                error: "Sign in with Google first, then return here to connect Drive.",
            };
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to connect Google Drive", error);
        return {
            success: false,
            needsGoogleConnection: true,
            error: "Google Drive access is not available yet. Enable Google OAuth Drive scopes, then try again.",
        };
    }
};
