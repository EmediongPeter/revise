'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { connectToDatabase } from "@/database/mongoose";
import Book from "@/database/models/book.model";
import Team from "@/database/models/team.model";
import UserProfile from "@/database/models/user-profile.model";
import VoiceSession from "@/database/models/voice-session.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { serializeData } from "@/lib/utils";
import type { IUserProfile, IWorkspace, IWorkspaceMember } from "@/types";

export type WizardStepId =
    | "source"
    | "module"
    | "practice"
    | "trainer"
    | "reports"
    | "invite"
    | "integrations"
    | "teams";

export type WizardStep = {
    id: WizardStepId;
    title: string;
    description: string;
    href: string;
    actionLabel: string;
    completed: boolean;
    autoCompleted: boolean;
};

export type WizardSection = {
    id: "quick-start" | "tune" | "measure" | "optional";
    title: string;
    required: boolean;
    steps: WizardStep[];
};

export type ActivationWizardState = {
    workspaceSlug: string;
    workspaceName: string;
    percent: number;
    completedRequiredCount: number;
    totalRequiredCount: number;
    completedOptionalCount: number;
    totalOptionalCount: number;
    completed: boolean;
    skipped: boolean;
    nextStep?: WizardStep;
    sections: WizardSection[];
};

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

type ActiveWorkspaceContext =
    | { error: string }
    | { userId: string; profile: IUserProfile; workspace: IWorkspace; membership: IWorkspaceMember };

const manualStepIds: WizardStepId[] = ["trainer", "reports", "invite", "integrations", "teams"];

const getActiveWorkspaceContext = async (): Promise<ActiveWorkspaceContext> => {
    const { userId } = await auth();

    if (!userId) {
        return { error: "Please sign in to continue." };
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({ clerkId: userId });

    if (!profile?.activeWorkspaceId) {
        return { error: "No active workspace was found." };
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

    return { userId, profile, workspace, membership };
};

const createStep = ({
    id,
    title,
    description,
    href,
    actionLabel,
    completed,
    autoCompleted = false,
}: WizardStep): WizardStep => ({
    id,
    title,
    description,
    href,
    actionLabel,
    completed,
    autoCompleted,
});

export const getActivationWizardState = async (): Promise<ActionResult<ActivationWizardState>> => {
    const context = await getActiveWorkspaceContext();

    if ("error" in context) {
        return { success: false, error: context.error };
    }

    const { userId, workspace } = context;
    const [bookCount, sessionCount, teamCount] = await Promise.all([
        Book.countDocuments({ clerkId: userId }),
        VoiceSession.countDocuments({ clerkId: userId }),
        Team.countDocuments({ workspaceId: workspace._id }),
    ]);
    const manualCompleted = new Set<WizardStepId>(
        (workspace.activationWizardCompletedStepIds || []).filter((stepId: string): stepId is WizardStepId =>
            manualStepIds.includes(stepId as WizardStepId),
        ),
    );
    const sourceCompleted = Boolean(workspace.uploadedSourceName) || bookCount > 0;
    const moduleCompleted = bookCount > 0;
    const practiceCompleted = sessionCount > 0;

    const sections: WizardSection[] = [
        {
            id: "quick-start",
            title: "Quick Start",
            required: true,
            steps: [
                createStep({
                    id: "source",
                    title: sourceCompleted ? "First source is ready" : "Add your first source",
                    description: sourceCompleted
                        ? "Your workspace has source material Revise can use for training."
                        : "Upload one SOP, handbook, policy, or onboarding guide so Revise has business context.",
                    href: "/books/new",
                    actionLabel: sourceCompleted ? "View sources" : "Upload source",
                    completed: sourceCompleted,
                    autoCompleted: sourceCompleted,
                }),
                createStep({
                    id: "module",
                    title: "Prepare a training module",
                    description: "Turn source material into a voice-practice module your team can rehearse.",
                    href: "/modules",
                    actionLabel: "Open modules",
                    completed: moduleCompleted,
                    autoCompleted: moduleCompleted,
                }),
                createStep({
                    id: "practice",
                    title: "Run a practice session",
                    description: "Try a role-play conversation and see how Revise coaches against company knowledge.",
                    href: "/sessions",
                    actionLabel: "Open practice",
                    completed: practiceCompleted,
                    autoCompleted: practiceCompleted,
                }),
            ],
        },
        {
            id: "tune",
            title: "Tune Revise For Your Business",
            required: true,
            steps: [
                createStep({
                    id: "trainer",
                    title: "Personalize trainer behavior",
                    description: "Review tone, strictness, source rules, and the goals Revise should coach toward.",
                    href: "/settings",
                    actionLabel: "Open settings",
                    completed: manualCompleted.has("trainer"),
                    autoCompleted: false,
                }),
                createStep({
                    id: "reports",
                    title: "Explore readiness reporting",
                    description: "Understand the manager view for confidence, gaps, risky answers, and proof of training.",
                    href: "/reports",
                    actionLabel: "View reports",
                    completed: manualCompleted.has("reports"),
                    autoCompleted: false,
                }),
            ],
        },
        {
            id: "optional",
            title: "Optional",
            required: false,
            steps: [
                createStep({
                    id: "invite",
                    title: "Invite your first trainee",
                    description: "Bring in a teammate when you are ready to test training with another person.",
                    href: "/trainees",
                    actionLabel: "Invite trainee",
                    completed: manualCompleted.has("invite"),
                    autoCompleted: false,
                }),
                createStep({
                    id: "integrations",
                    title: "Connect knowledge integrations",
                    description: "Keep workspace sources close to where your team already stores SOPs and policies.",
                    href: "/settings",
                    actionLabel: "View integrations",
                    completed: manualCompleted.has("integrations") || Boolean(workspace.googleDriveConnected),
                    autoCompleted: Boolean(workspace.googleDriveConnected),
                }),
                createStep({
                    id: "teams",
                    title: "Organize workspace teams",
                    description: "Use teams when separate groups need different modules or practice queues.",
                    href: "/settings",
                    actionLabel: "Manage teams",
                    completed: manualCompleted.has("teams") || teamCount > 1,
                    autoCompleted: teamCount > 1,
                }),
            ],
        },
    ];

    const requiredSteps = sections.filter((section) => section.required).flatMap((section) => section.steps);
    const optionalSteps = sections.filter((section) => !section.required).flatMap((section) => section.steps);
    const completedRequiredCount = requiredSteps.filter((step) => step.completed).length;
    const completedOptionalCount = optionalSteps.filter((step) => step.completed).length;
    const completed = completedRequiredCount === requiredSteps.length;
    const nextStep = requiredSteps.find((step) => !step.completed) || optionalSteps.find((step) => !step.completed);
    const percent = Math.round((completedRequiredCount / requiredSteps.length) * 100);

    if (completed && !workspace.activationWizardCompletedAt) {
        workspace.activationWizardCompletedAt = new Date();
        await workspace.save();
    }

    return {
        success: true,
        data: serializeData({
            workspaceSlug: workspace.slug,
            workspaceName: workspace.name,
            percent,
            completedRequiredCount,
            totalRequiredCount: requiredSteps.length,
            completedOptionalCount,
            totalOptionalCount: optionalSteps.length,
            completed,
            skipped: Boolean(workspace.activationWizardSkippedAt),
            nextStep,
            sections,
        }),
    };
};

export const completeWizardStep = async (stepId: WizardStepId): Promise<ActionResult<ActivationWizardState>> => {
    if (!manualStepIds.includes(stepId)) {
        return getActivationWizardState();
    }

    const context = await getActiveWorkspaceContext();

    if ("error" in context) {
        return { success: false, error: context.error };
    }

    await Workspace.findByIdAndUpdate(context.workspace._id, {
        $addToSet: { activationWizardCompletedStepIds: stepId },
    });

    revalidatePath("/wizard");
    revalidatePath(`/${context.workspace.slug}`);

    return getActivationWizardState();
};

export const skipActivationWizard = async (): Promise<ActionResult<ActivationWizardState>> => {
    const context = await getActiveWorkspaceContext();

    if ("error" in context) {
        return { success: false, error: context.error };
    }

    await Workspace.findByIdAndUpdate(context.workspace._id, {
        activationWizardSkippedAt: new Date(),
    });

    revalidatePath("/wizard");
    revalidatePath(`/${context.workspace.slug}`);

    return getActivationWizardState();
};
