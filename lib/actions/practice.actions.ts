'use server';

import crypto from "crypto";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import ModuleAssignment from "@/database/models/module-assignment.model";
import PracticeScenario from "@/database/models/practice-scenario.model";
import PracticeSession from "@/database/models/practice-session.model";
import Team from "@/database/models/team.model";
import TrainingPlan from "@/database/models/training-plan.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { connectToDatabase } from "@/database/mongoose";
import { retrievePracticeContext } from "@/lib/ai/practice/context";
import { chooseInstructionalAction, averageCriterionScore, stageForAction } from "@/lib/ai/practice/policy";
import {
    assessPracticeTurn,
    generatePracticeTrainerMessage,
    type PracticeTrainerScenario,
} from "@/lib/ai/practice/trainer";
import { serializeData } from "@/lib/utils";
import type {
    IModuleAssignment,
    IPracticeScenario,
    IPracticeSession,
    ITrainingPlan,
    IWorkspace,
    IWorkspaceMember,
    PracticeCompletionReason,
    PracticeInstructionalAction,
    PracticeSessionStage,
} from "@/types";

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

type ActiveAccess =
    | { error: string }
    | { userId: string; email: string; displayName: string; workspace: IWorkspace; membership: IWorkspaceMember };

export type AssignmentLinkSummary = {
    assignmentId: string;
    email?: string;
    memberName?: string;
    inviteUrl: string;
    status: string;
};

export type AssignTrainingModuleInput = {
    planId: string;
    mode: "team" | "selected" | "future";
    teamIds?: string[];
    memberIds?: string[];
    inviteEmails?: string[] | string;
    inviteTeamId?: string;
    dueDate?: string;
    required?: boolean;
    guidanceOverride?: string;
    sessionDurationMinutes?: number;
};

export type PracticeRoomMessage = {
    role: "assistant" | "user" | "system";
    content: string;
    createdAt: string;
    scenarioIndex?: number;
    action?: PracticeInstructionalAction;
};

export type PracticeRoomData = {
    workspaceSlug: string;
    assignment: {
        _id: string;
        status: string;
        required: boolean;
        progressPercent: number;
        completedScenarioCount: number;
        totalScenarioCount: number;
        dueDate?: string;
        sessionDurationMinutes: number;
    };
    module: {
        _id: string;
        title: string;
        description?: string;
        objective?: string;
    };
    scenarios: Array<{
        _id: string;
        title: string;
        situation: string;
        traineePrompt: string;
        status: string;
        sortOrder: number;
    }>;
    session?: {
        _id: string;
        status: string;
        stage: PracticeSessionStage;
        currentScenarioIndex: number;
        messages: PracticeRoomMessage[];
        startedAt: string;
        expiresAt: string;
        durationSeconds?: number;
        completedAt?: string;
        completionReason?: PracticeCompletionReason;
    };
};

export type AssignedModuleSummary = {
    assignmentId: string;
    workspaceSlug: string;
    moduleTitle: string;
    moduleDescription?: string;
    status: string;
    required: boolean;
    progressPercent: number;
    completedScenarioCount: number;
    totalScenarioCount: number;
    dueDate?: string;
};

export type PracticeSessionSummary = {
    assignmentId: string;
    sessionId?: string;
    moduleTitle: string;
    traineeLabel: string;
    status: string;
    progressPercent: number;
    score?: number;
    updatedAt: string;
    reviewable: boolean;
};

export type PracticeSessionReview = {
    workspaceSlug: string;
    assignmentId: string;
    moduleTitle: string;
    traineeLabel: string;
    status: string;
    progressPercent: number;
    score?: number;
    startedAt?: string;
    completedAt?: string;
    durationSeconds?: number;
    completionReason?: PracticeCompletionReason;
    strengths: string[];
    gaps: string[];
    managerNotes?: string;
    messages: PracticeRoomMessage[];
    checkpoints: Array<{
        title: string;
        status: string;
        score?: number;
        turnCount: number;
        hintCount: number;
        notes?: string;
        misconceptions: string[];
        strengths: string[];
        gaps: string[];
        criteria: Array<{
            criterion: string;
            score: number;
            met: boolean;
            evidence?: string;
        }>;
        evidenceRefs: Array<{
            sourceTitle: string;
            chunkIndex: number;
            pageNumber?: number;
        }>;
    }>;
};
const editableRoles = new Set(["owner", "admin", "trainer"]);

const parseEmails = (value: string[] | string | undefined) =>
    Array.from(
        new Set(
            (Array.isArray(value) ? value : value?.split(/[,\n]/) || [])
                .map((email) => email.trim().toLowerCase())
                .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
        ),
    );

const normalizeIds = (ids: string[] = []) => Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const getCurrentUserIdentity = async () => {
    const { userId } = await auth();

    if (!userId) return { userId: null, email: null, displayName: null };

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress;
    const email = primaryEmail || user.emailAddresses[0]?.emailAddress || null;

    return {
        userId,
        email: email?.toLowerCase() || null,
        displayName: user.fullName || user.firstName || email?.split("@")[0] || "Trainee",
    };
};

const getActiveAccess = async (): Promise<ActiveAccess> => {
    const identity = await getCurrentUserIdentity();

    if (!identity.userId || !identity.email) {
        return { error: "Please sign in to continue." };
    }

    await connectToDatabase();

    const profile = await UserProfile.findOne({ clerkId: identity.userId });

    if (!profile?.activeWorkspaceId) {
        return { error: "No active workspace was found for your account." };
    }

    const [workspace, membership] = await Promise.all([
        Workspace.findById(profile.activeWorkspaceId),
        WorkspaceMember.findOne({
            workspaceId: profile.activeWorkspaceId,
            clerkId: identity.userId,
            status: "active",
        }),
    ]);

    if (!workspace || !membership) {
        return { error: "You do not have access to this workspace." };
    }

    return {
        userId: identity.userId,
        email: identity.email,
        displayName: identity.displayName,
        workspace,
        membership,
    };
};

const token = () => crypto.randomBytes(24).toString("hex");

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const serializeMessages = (messages: IPracticeSession["messages"] = []): PracticeRoomMessage[] =>
    messages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        scenarioIndex: message.scenarioIndex,
        action: message.action,
    }));

const ensureScenariosForPlan = async ({
    plan,
    userId,
}: {
    plan: ITrainingPlan;
    userId: string;
}) => {
    const existing = await PracticeScenario.find({
        workspaceId: plan.workspaceId,
        trainingPlanId: plan._id,
        status: { $ne: "archived" },
    }).sort({ sortOrder: 1 });

    if (existing.length > 0) return existing;

    const scenarioSeeds = plan.practiceScenarios.length > 0
        ? plan.practiceScenarios
        : ["Practice applying this module to a realistic workplace situation."];

    const created = await PracticeScenario.create(
        scenarioSeeds.slice(0, 8).map((scenario, index) => ({
            workspaceId: plan.workspaceId,
            trainingPlanId: plan._id,
            teamIds: plan.teamIds,
            sourceIds: plan.sourceIds,
            title: scenario.length > 82 ? `${scenario.slice(0, 82).trim()}...` : scenario,
            situation: scenario,
            traineePrompt: plan.rolePlayPrompts[index] || "Tell the AI trainer how you would respond in this situation.",
            idealOutcome: plan.requiredKnowledge[index] || plan.objective,
            evaluationRubric: plan.assessmentCriteria.length > 0
                ? plan.assessmentCriteria.slice(0, 6)
                : ["Chooses an appropriate action.", "Explains reasoning clearly.", "Escalates when needed."],
            status: "ready",
            sortOrder: index,
            createdByClerkId: userId,
            updatedByClerkId: userId,
        })),
    );

    return created;
};

const assignmentInviteUrl = (inviteToken: string) => `${appUrl()}/invite/module/${inviteToken}`;

export const assignTrainingModule = async (
    input: AssignTrainingModuleInput,
): Promise<ActionResult<{ links: AssignmentLinkSummary[] }>> => {
    const access = await getActiveAccess();

    if ("error" in access) return { success: false, error: access.error };
    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can assign modules." };
    }
    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training module could not be found." };
    }

    const plan = await TrainingPlan.findOne({
        _id: input.planId,
        workspaceId: access.workspace._id,
        status: "ready",
    });

    if (!plan) {
        return { success: false, error: "Mark this training module ready before assigning it." };
    }

    const scenarios = await ensureScenariosForPlan({ plan, userId: access.userId });
    const dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
    const required = input.required !== false;
    const guidanceOverride = input.guidanceOverride?.trim() || undefined;
    const sessionDurationMinutes = Math.max(5, Math.min(60, Math.round(input.sessionDurationMinutes || 15)));
    const targetMemberIds = new Set<string>();

    if (input.mode === "selected") {
        for (const memberId of normalizeIds(input.memberIds)) {
            if (Types.ObjectId.isValid(memberId)) targetMemberIds.add(memberId);
        }
    }

    if (input.mode === "team") {
        const teamIds = normalizeIds(input.teamIds).filter((id) => Types.ObjectId.isValid(id));
        const teamObjectIds = teamIds.map((id) => new Types.ObjectId(id));
        const [teamCount, members] = await Promise.all([
            teamObjectIds.length > 0
                ? Team.countDocuments({ _id: { $in: teamObjectIds }, workspaceId: access.workspace._id })
                : Promise.resolve(0),
            teamObjectIds.length > 0
                ? WorkspaceMember.find({
                      workspaceId: access.workspace._id,
                      teamIds: { $in: teamObjectIds },
                      status: { $in: ["active", "invited"] },
                  }).select("_id")
                : Promise.resolve([]),
        ]);

        if (teamObjectIds.length === 0 || teamCount !== teamObjectIds.length) {
            return { success: false, error: "Select at least one valid team." };
        }

        for (const member of members) targetMemberIds.add(member._id.toString());
    }

    const links: AssignmentLinkSummary[] = [];
    const targetMembers = targetMemberIds.size > 0
        ? await WorkspaceMember.find({
              _id: { $in: Array.from(targetMemberIds).map((id) => new Types.ObjectId(id)) },
              workspaceId: access.workspace._id,
              status: { $in: ["active", "invited"] },
          })
        : [];

    for (const member of targetMembers) {
        const existing = await ModuleAssignment.findOne({
            workspaceId: access.workspace._id,
            trainingPlanId: plan._id,
            assignedToMemberId: member._id,
            status: { $ne: "cancelled" },
        });
        const inviteToken = existing?.inviteToken || token();
        const assignment = existing || await ModuleAssignment.create({
            workspaceId: access.workspace._id,
            trainingPlanId: plan._id,
            assignedToMemberId: member._id,
            inviteEmail: member.email,
            inviteToken,
            status: member.status === "active" ? "assigned" : "invited",
            required,
            dueDate,
            guidanceOverride,
            sessionDurationMinutes,
            totalScenarioCount: scenarios.length,
            createdByClerkId: access.userId,
            updatedByClerkId: access.userId,
        });

        if (existing) {
            existing.required = required;
            existing.dueDate = dueDate;
            existing.guidanceOverride = guidanceOverride;
            existing.sessionDurationMinutes = sessionDurationMinutes;
            existing.totalScenarioCount = scenarios.length;
            existing.updatedByClerkId = access.userId;
            await existing.save();
        }

        links.push({
            assignmentId: assignment._id.toString(),
            email: member.email,
            memberName: member.displayName,
            inviteUrl: assignmentInviteUrl(inviteToken),
            status: assignment.status,
        });
    }

    for (const email of parseEmails(input.inviteEmails)) {
        const teamIds = input.inviteTeamId && Types.ObjectId.isValid(input.inviteTeamId)
            ? [new Types.ObjectId(input.inviteTeamId)]
            : [];
        const memberUpdate: Record<string, unknown> = {
            $setOnInsert: {
                workspaceId: access.workspace._id,
                email,
                role: "trainee",
                status: "invited",
                invitedByClerkId: access.userId,
                teamIds,
            },
        };

        if (teamIds.length > 0) {
            memberUpdate.$addToSet = { teamIds: { $each: teamIds } };
        }

        const member = await WorkspaceMember.findOneAndUpdate(
            { workspaceId: access.workspace._id, email },
            memberUpdate,
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        const existing = await ModuleAssignment.findOne({
            workspaceId: access.workspace._id,
            trainingPlanId: plan._id,
            inviteEmail: email,
            status: { $ne: "cancelled" },
        });
        const inviteToken = existing?.inviteToken || token();
        const assignment = existing || await ModuleAssignment.create({
            workspaceId: access.workspace._id,
            trainingPlanId: plan._id,
            assignedToMemberId: member._id,
            inviteEmail: email,
            inviteToken,
            status: "invited",
            required,
            dueDate,
            guidanceOverride,
            sessionDurationMinutes,
            totalScenarioCount: scenarios.length,
            createdByClerkId: access.userId,
            updatedByClerkId: access.userId,
        });

        if (existing) {
            existing.required = required;
            existing.dueDate = dueDate;
            existing.guidanceOverride = guidanceOverride;
            existing.sessionDurationMinutes = sessionDurationMinutes;
            existing.totalScenarioCount = scenarios.length;
            existing.updatedByClerkId = access.userId;
            await existing.save();
        }

        links.push({
            assignmentId: assignment._id.toString(),
            email,
            memberName: member.displayName,
            inviteUrl: assignmentInviteUrl(inviteToken),
            status: assignment.status,
        });
    }

    if (links.length === 0) {
        return { success: false, error: "No trainees were found for this assignment. Select trainees or add invite emails." };
    }

    revalidatePath(`/${access.workspace.slug}/modules/${plan._id.toString()}`);
    revalidatePath(`/${access.workspace.slug}/sessions`);
    revalidatePath(`/${access.workspace.slug}/trainees`);

    return { success: true, data: serializeData({ links }) };
};

export const acceptModuleInvite = async (inviteToken: string): Promise<ActionResult<{ practiceHref: string }>> => {
    const identity = await getCurrentUserIdentity();

    if (!identity.userId || !identity.email) {
        return { success: false, error: "Please sign in to accept this practice invite." };
    }

    await connectToDatabase();

    const assignment = await ModuleAssignment.findOne({ inviteToken, status: { $ne: "cancelled" } });

    if (!assignment) {
        return { success: false, error: "That invite link is invalid or expired." };
    }

    const workspace = await Workspace.findById(assignment.workspaceId);

    if (!workspace) {
        return { success: false, error: "That workspace no longer exists." };
    }

    let member = assignment.assignedToMemberId
        ? await WorkspaceMember.findOne({ _id: assignment.assignedToMemberId, workspaceId: workspace._id })
        : null;

    if (!member) {
        member = await WorkspaceMember.findOne({ workspaceId: workspace._id, email: identity.email });
    }

    if (!member) {
        member = await WorkspaceMember.create({
            workspaceId: workspace._id,
            email: identity.email,
            displayName: identity.displayName,
            clerkId: identity.userId,
            role: "trainee",
            status: "active",
            invitedByClerkId: assignment.createdByClerkId,
        });
    }

    if (assignment.inviteEmail && assignment.inviteEmail !== identity.email) {
        return { success: false, error: `This invite was sent to ${assignment.inviteEmail}. Sign in with that email to accept it.` };
    }

    const activatedMember = await WorkspaceMember.findByIdAndUpdate(
        member._id,
        {
            clerkId: identity.userId,
            displayName: member.displayName || identity.displayName,
            status: "active",
            role: member.role === "member" ? "trainee" : member.role,
        },
        { new: true, runValidators: false },
    );

    if (!activatedMember) {
        return { success: false, error: "The invited workspace membership could not be activated." };
    }

    member = activatedMember;

    assignment.assignedToMemberId = member._id;
    assignment.inviteEmail = member.email;
    if (assignment.status === "invited") assignment.status = "assigned";
    assignment.acceptedAt = assignment.acceptedAt || new Date();
    assignment.updatedByClerkId = identity.userId;
    await assignment.save();

    await UserProfile.findOneAndUpdate(
        { clerkId: identity.userId },
        {
            clerkId: identity.userId,
            email: identity.email,
            displayName: identity.displayName,
            onboardingCompleted: true,
            activeWorkspaceId: workspace._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
        success: true,
        data: {
            practiceHref: `/${workspace.slug}/practice/${assignment._id.toString()}`,
        },
    };
};

export const acceptModuleInviteAndRedirect = async (inviteToken: string) => {
    const result = await acceptModuleInvite(inviteToken);
    if (!result.success) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/invite/module/${inviteToken}`)}`);
    redirect(result.data.practiceHref);
};

const canAccessAssignment = (assignment: IModuleAssignment, membership: IWorkspaceMember) =>
    assignment.assignedToMemberId?.toString() === membership._id.toString();

const getRoomEntities = async (assignmentId: string) => {
    const access = await getActiveAccess();

    if ("error" in access) return { error: access.error };
    if (!Types.ObjectId.isValid(assignmentId)) return { error: "That practice assignment could not be found." };

    const assignment = await ModuleAssignment.findOne({
        _id: assignmentId,
        workspaceId: access.workspace._id,
        status: { $ne: "cancelled" },
    });

    if (!assignment) return { error: "That practice assignment could not be found." };
    if (!canAccessAssignment(assignment, access.membership) && !editableRoles.has(access.membership.role)) {
        return { error: "You do not have access to this practice assignment." };
    }

    const plan = await TrainingPlan.findOne({ _id: assignment.trainingPlanId, workspaceId: access.workspace._id });
    if (!plan) return { error: "The assigned training module could not be found." };

    const scenarios = await ensureScenariosForPlan({ plan, userId: access.userId });
    const session = await PracticeSession.findOne({
        assignmentId: assignment._id,
        traineeMemberId: assignment.assignedToMemberId || access.membership._id,
        status: { $ne: "cancelled" },
    }).sort({ updatedAt: -1 });

    return { access, assignment, plan, scenarios, session };
};

const serializeRoom = ({
    workspaceSlug,
    assignment,
    plan,
    scenarios,
    session,
}: {
    workspaceSlug: string;
    assignment: IModuleAssignment;
    plan: ITrainingPlan;
    scenarios: IPracticeScenario[];
    session?: IPracticeSession | null;
}): PracticeRoomData => ({
    workspaceSlug,
    assignment: {
        _id: assignment._id.toString(),
        status: assignment.status,
        required: assignment.required,
        progressPercent: assignment.progressPercent,
        completedScenarioCount: assignment.completedScenarioCount,
        totalScenarioCount: assignment.totalScenarioCount || scenarios.length,
        dueDate: assignment.dueDate?.toISOString(),
        sessionDurationMinutes: assignment.sessionDurationMinutes || 15,
    },
    module: {
        _id: plan._id.toString(),
        title: plan.title,
        description: plan.description,
        objective: plan.objective,
    },
    scenarios: scenarios.map((scenario) => ({
        _id: scenario._id.toString(),
        title: scenario.title,
        situation: scenario.situation,
        traineePrompt: scenario.traineePrompt,
        status: scenario.status,
        sortOrder: scenario.sortOrder,
    })),
    session: session
        ? {
              _id: session._id.toString(),
              status: session.status,
              stage: session.stage,
              currentScenarioIndex: session.currentScenarioIndex,
              messages: serializeMessages(session.messages),
              startedAt: session.startedAt.toISOString(),
              expiresAt: sessionExpiry(session, assignment).toISOString(),
              durationSeconds: session.durationSeconds,
              completedAt: session.completedAt?.toISOString(),
              completionReason: session.completionReason,
          }
        : undefined,
});

export const getPracticeRoom = async (assignmentId: string): Promise<ActionResult<PracticeRoomData>> => {
    const entities = await getRoomEntities(assignmentId);
    if ("error" in entities) return { success: false, error: entities.error || "Could not load practice room." };

    return {
        success: true,
        data: serializeData(serializeRoom({
            workspaceSlug: entities.access.workspace.slug,
            assignment: entities.assignment,
            plan: entities.plan,
            scenarios: entities.scenarios,
            session: entities.session,
        })),
    };
};

const toTrainerScenario = (scenario: IPracticeScenario): PracticeTrainerScenario => ({
    title: scenario.title,
    situation: scenario.situation,
    traineePrompt: scenario.traineePrompt,
    idealOutcome: scenario.idealOutcome,
    evaluationRubric: scenario.evaluationRubric || [],
});

const sessionExpiry = (session: IPracticeSession, assignment: IModuleAssignment) =>
    session.expiresAt ||
    new Date(session.startedAt.getTime() + (assignment.sessionDurationMinutes || 15) * 60 * 1000);

const remainingSessionSeconds = (session: IPracticeSession, assignment: IModuleAssignment) =>
    Math.max(0, Math.floor((sessionExpiry(session, assignment).getTime() - Date.now()) / 1000));

const finishIncompleteSession = async ({
    session,
    assignment,
    scenarios,
    reason,
}: {
    session: IPracticeSession;
    assignment: IModuleAssignment;
    scenarios: IPracticeScenario[];
    reason: "time_expired" | "trainee_ended";
}) => {
    const now = new Date();
    session.expiresAt = sessionExpiry(session, assignment);
    session.status = "needs_review";
    session.stage = "complete";
    session.completedAt = now;
    session.completionReason = reason;
    session.durationSeconds = Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000));
    session.managerNotes = reason === "time_expired"
        ? "The configured practice time expired before every scenario was completed."
        : "The trainee ended the practice session before every scenario was completed.";
    assignment.status = "in_progress";
    assignment.progressPercent = Math.round(
        (assignment.completedScenarioCount / Math.max(scenarios.length, 1)) * 100,
    );
    await Promise.all([session.save(), assignment.save()]);
};

export const startPracticeSession = async (assignmentId: string): Promise<ActionResult<PracticeRoomData>> => {
    const entities = await getRoomEntities(assignmentId);
    if ("error" in entities) return { success: false, error: entities.error || "Could not start practice session." };
    if (!canAccessAssignment(entities.assignment, entities.access.membership)) {
        return { success: false, error: "Only the assigned trainee can start this practice." };
    }

    const traineeMemberId = entities.assignment.assignedToMemberId || entities.access.membership._id;
    let session = entities.session;

    if (session?.status === "active" && remainingSessionSeconds(session, entities.assignment) <= 0) {
        await finishIncompleteSession({
            session,
            assignment: entities.assignment,
            scenarios: entities.scenarios,
            reason: "time_expired",
        });
    }
    if (session?.status === "active" && !session.expiresAt) {
        session.expiresAt = sessionExpiry(session, entities.assignment);
    }

    if (!session) {
        const firstScenario = entities.scenarios[0];
        if (!firstScenario) return { success: false, error: "No practice scenarios were found for this module." };

        const checkpoints = entities.scenarios.map((scenario: IPracticeScenario, index: number) => ({
            scenarioId: scenario._id,
            title: scenario.title,
            status: index === 0 ? "active" as const : "pending" as const,
            turnCount: 0,
            hintCount: 0,
            criterionAssessments: [],
            misconceptions: [],
            strengths: [],
            gaps: [],
            evidenceRefs: [],
        }));
        const durationMinutes = entities.assignment.sessionDurationMinutes || 15;
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
        const evidence = await retrievePracticeContext({
            workspaceId: entities.access.workspace._id.toString(),
            sourceIds: firstScenario.sourceIds?.length ? firstScenario.sourceIds : entities.plan.sourceIds,
            memberTeamIds: entities.access.membership.teamIds || [],
            scenarioTitle: firstScenario.title,
            scenarioSituation: firstScenario.situation,
        });
        const openingMessage = await generatePracticeTrainerMessage({
            moduleTitle: entities.plan.title,
            moduleObjective: entities.plan.objective,
            trainerGuidance: [entities.plan.trainerGuidance, entities.assignment.guidanceOverride].filter(Boolean).join("\n\n"),
            scenario: toTrainerScenario(firstScenario),
            scenarioIndex: 0,
            totalScenarios: entities.scenarios.length,
            messages: [],
            evidence,
            action: "opening",
            remainingSeconds: durationMinutes * 60,
        });

        session = await PracticeSession.create({
            workspaceId: entities.access.workspace._id,
            assignmentId: entities.assignment._id,
            trainingPlanId: entities.plan._id,
            traineeMemberId,
            status: "active",
            stage: "opening",
            currentScenarioIndex: 0,
            scenarioCheckpoints: checkpoints,
            messages: [{
                role: "assistant",
                content: openingMessage,
                createdAt: startedAt,
                scenarioIndex: 0,
                action: "opening",
            }],
            strengths: [],
            gaps: [],
            startedAt,
            expiresAt,
        });

        entities.assignment.status = "in_progress";
        entities.assignment.totalScenarioCount = entities.scenarios.length;
        await entities.assignment.save();
    }

    revalidatePath(`/${entities.access.workspace.slug}/practice/${assignmentId}`);

    return {
        success: true,
        data: serializeData(serializeRoom({
            workspaceSlug: entities.access.workspace.slug,
            assignment: entities.assignment,
            plan: entities.plan,
            scenarios: entities.scenarios,
            session,
        })),
    };
};

export const sendPracticeMessage = async ({
    assignmentId,
    message,
}: {
    assignmentId: string;
    message: string;
}): Promise<ActionResult<PracticeRoomData>> => {
    const turnStartedAt = Date.now();
    const entities = await getRoomEntities(assignmentId);
    if ("error" in entities) return { success: false, error: entities.error || "Could not send practice message." };
    if (!canAccessAssignment(entities.assignment, entities.access.membership)) {
        return { success: false, error: "Only the assigned trainee can respond in this practice." };
    }

    let session = entities.session;
    if (!session) {
        const started = await startPracticeSession(assignmentId);
        if (!started.success) return started;
        const refreshed = await getRoomEntities(assignmentId);
        if ("error" in refreshed || !refreshed.session) return { success: false, error: "Could not start practice session." };
        session = refreshed.session;
        entities.assignment = refreshed.assignment;
    }
    if (session.status !== "active") {
        return { success: false, error: "This practice session has already ended." };
    }
    if (!session.expiresAt) session.expiresAt = sessionExpiry(session, entities.assignment);
    if (remainingSessionSeconds(session, entities.assignment) <= 0) {
        await finishIncompleteSession({
            session,
            assignment: entities.assignment,
            scenarios: entities.scenarios,
            reason: "time_expired",
        });
        return getPracticeRoom(assignmentId);
    }

    const traineeReply = message.trim();
    if (traineeReply.length < 2) return { success: false, error: "Type a response before sending." };

    const now = new Date();
    session.messages.push({
        role: "user",
        content: traineeReply.slice(0, 2000),
        createdAt: now,
        scenarioIndex: session.currentScenarioIndex,
    });

    const currentScenario = entities.scenarios[Math.min(session.currentScenarioIndex, entities.scenarios.length - 1)];
    if (!currentScenario) return { success: false, error: "No active practice scenario was found." };

    const checkpoint = session.scenarioCheckpoints[session.currentScenarioIndex];
    if (!checkpoint) return { success: false, error: "The scenario checkpoint could not be found." };
    const evidence = await retrievePracticeContext({
        workspaceId: entities.access.workspace._id.toString(),
        sourceIds: currentScenario.sourceIds?.length ? currentScenario.sourceIds : entities.plan.sourceIds,
        memberTeamIds: entities.access.membership.teamIds || [],
        scenarioTitle: currentScenario.title,
        scenarioSituation: currentScenario.situation,
        traineeReply,
        knownGaps: checkpoint.gaps || [],
    });
    const trainerInput = {
        moduleTitle: entities.plan.title,
        moduleObjective: entities.plan.objective,
        trainerGuidance: [entities.plan.trainerGuidance, entities.assignment.guidanceOverride].filter(Boolean).join("\n\n"),
        scenario: toTrainerScenario(currentScenario),
        scenarioIndex: session.currentScenarioIndex,
        totalScenarios: entities.scenarios.length,
        messages: session.messages.map((item: IPracticeSession["messages"][number]) => ({ role: item.role, content: item.content })),
        evidence,
    };
    const assessment = await assessPracticeTurn({
        ...trainerInput,
        traineeReply,
    });
    checkpoint.turnCount = (checkpoint.turnCount || 0) + 1;
    checkpoint.criterionAssessments = assessment.criteria;
    checkpoint.misconceptions = assessment.misconceptions;
    checkpoint.strengths = Array.from(new Set([...(checkpoint.strengths || []), ...assessment.strengths])).slice(0, 8);
    checkpoint.gaps = Array.from(new Set([...(checkpoint.gaps || []), ...assessment.gaps])).slice(0, 8);
    checkpoint.evidenceRefs = evidence.map((item) => ({
        sourceId: item.sourceId,
        sourceTitle: item.sourceTitle,
        chunkId: item.chunkId,
        chunkIndex: item.chunkIndex,
        pageNumber: item.pageNumber,
    }));
    checkpoint.score = averageCriterionScore(assessment);
    checkpoint.notes = assessment.managerSummary;

    const policyAction = chooseInstructionalAction({
        assessment,
        turnCount: checkpoint.turnCount,
        hintCount: checkpoint.hintCount || 0,
        remainingSeconds: remainingSessionSeconds(session, entities.assignment),
    });
    const shouldAdvance = policyAction === "advance";
    const timedOut = policyAction === "complete";
    const currentScenarioIndex = session.currentScenarioIndex;
    const nextScenarioIndex = shouldAdvance ? currentScenarioIndex + 1 : currentScenarioIndex;
    const isComplete = shouldAdvance && nextScenarioIndex >= entities.scenarios.length;
    const action: PracticeInstructionalAction = isComplete ? "complete" : policyAction;

    if (action === "coach" || action === "remediate") {
        checkpoint.hintCount = (checkpoint.hintCount || 0) + 1;
    }
    checkpoint.lastAction = action;

    const nextScenario = shouldAdvance && !isComplete ? entities.scenarios[nextScenarioIndex] : undefined;
    const assistantMessage = await generatePracticeTrainerMessage({
        ...trainerInput,
        action,
        assessment,
        nextScenario: nextScenario ? toTrainerScenario(nextScenario) : undefined,
        remainingSeconds: remainingSessionSeconds(session, entities.assignment),
    });

    if (shouldAdvance) {
        checkpoint.status = "completed";
        entities.assignment.completedScenarioCount = Math.max(
            entities.assignment.completedScenarioCount,
            nextScenarioIndex,
        );

        if (nextScenario) {
            session.scenarioCheckpoints[nextScenarioIndex].status = "active";
        }
    }

    session.currentScenarioIndex = isComplete ? currentScenarioIndex : nextScenarioIndex;
    session.stage = stageForAction(action);
    session.strengths = Array.from(new Set([...(session.strengths || []), ...assessment.strengths])).slice(0, 12);
    session.gaps = Array.from(new Set([...(session.gaps || []), ...assessment.gaps])).slice(0, 12);
    session.managerNotes = assessment.managerSummary || session.managerNotes;
    session.messages.push({
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date(),
        scenarioIndex: isComplete ? currentScenarioIndex : nextScenarioIndex,
        action,
    });

    if (isComplete) {
        const completedAt = new Date();
        session.status = "completed";
        session.completedAt = completedAt;
        session.completionReason = "scenarios_complete";
        session.durationSeconds = Math.max(0, Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000));
        const scoredCheckpoints = session.scenarioCheckpoints.filter(
            (item: IPracticeSession["scenarioCheckpoints"][number]) => typeof item.score === "number",
        );
        session.score = scoredCheckpoints.length > 0
            ? Math.round(
                  scoredCheckpoints.reduce(
                      (sum: number, item: IPracticeSession["scenarioCheckpoints"][number]) =>
                          sum + (item.score as number),
                      0,
                  ) / scoredCheckpoints.length,
              )
            : undefined;
        entities.assignment.status = "completed";
        entities.assignment.completedAt = completedAt;
        entities.assignment.progressPercent = 100;
    } else if (timedOut) {
        const completedAt = new Date();
        session.status = "needs_review";
        session.completedAt = completedAt;
        session.completionReason = "time_expired";
        session.durationSeconds = Math.max(
            0,
            Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000),
        );
        session.managerNotes = "The configured practice time expired before every scenario was completed.";
        entities.assignment.status = "in_progress";
        entities.assignment.progressPercent = Math.round(
            (entities.assignment.completedScenarioCount / entities.scenarios.length) * 100,
        );
    } else {
        entities.assignment.status = "in_progress";
        entities.assignment.progressPercent = Math.round((entities.assignment.completedScenarioCount / entities.scenarios.length) * 100);
    }

    await Promise.all([session.save(), entities.assignment.save()]);

    console.info("[Practice Trainer] turn-completed", {
        workspaceId: entities.access.workspace._id.toString(),
        assignmentId,
        sessionId: session._id.toString(),
        scenarioIndex: currentScenarioIndex,
        action,
        score: checkpoint.score,
        assessmentConfidence: assessment.confidence,
        evidenceCount: evidence.length,
        remainingSeconds: remainingSessionSeconds(session, entities.assignment),
        latencyMs: Date.now() - turnStartedAt,
    });

    return getPracticeRoom(assignmentId);
};

export const completePracticeSession = async (assignmentId: string): Promise<ActionResult<PracticeRoomData>> => {
    const entities = await getRoomEntities(assignmentId);
    if ("error" in entities) return { success: false, error: entities.error || "Could not complete practice session." };
    if (!entities.session) return { success: false, error: "No active practice session was found." };
    if (!canAccessAssignment(entities.assignment, entities.access.membership)) {
        return { success: false, error: "Only the assigned trainee can end this practice." };
    }
    if (entities.session.status === "active") {
        await finishIncompleteSession({
            session: entities.session,
            assignment: entities.assignment,
            scenarios: entities.scenarios,
            reason: "trainee_ended",
        });
    }

    return getPracticeRoom(assignmentId);
};

export const expirePracticeSession = async (assignmentId: string): Promise<ActionResult<PracticeRoomData>> => {
    const entities = await getRoomEntities(assignmentId);
    if ("error" in entities) return { success: false, error: entities.error || "Could not expire practice session." };
    if (!entities.session) return { success: false, error: "No active practice session was found." };
    if (!canAccessAssignment(entities.assignment, entities.access.membership)) {
        return { success: false, error: "Only the assigned trainee can update this practice." };
    }
    if (entities.session.status === "active" && remainingSessionSeconds(entities.session, entities.assignment) <= 0) {
        await finishIncompleteSession({
            session: entities.session,
            assignment: entities.assignment,
            scenarios: entities.scenarios,
            reason: "time_expired",
        });
    }

    return getPracticeRoom(assignmentId);
};

export const listMyAssignedModules = async (): Promise<ActionResult<AssignedModuleSummary[]>> => {
    const access = await getActiveAccess();
    if ("error" in access) return { success: false, error: access.error };

    const assignments = await ModuleAssignment.find({
        workspaceId: access.workspace._id,
        assignedToMemberId: access.membership._id,
        status: { $ne: "cancelled" },
    }).sort({ updatedAt: -1 });
    const planIds = assignments.map((assignment) => assignment.trainingPlanId);
    const plans = await TrainingPlan.find({ _id: { $in: planIds }, workspaceId: access.workspace._id }).lean();
    const planById = new Map(plans.map((plan) => [plan._id.toString(), plan]));

    return {
        success: true,
        data: serializeData(assignments.map((assignment) => {
            const plan = planById.get(assignment.trainingPlanId.toString());

            return {
                assignmentId: assignment._id.toString(),
                workspaceSlug: access.workspace.slug,
                moduleTitle: plan?.title || "Assigned training module",
                moduleDescription: plan?.description,
                status: assignment.status,
                required: assignment.required,
                progressPercent: assignment.progressPercent,
                completedScenarioCount: assignment.completedScenarioCount,
                totalScenarioCount: assignment.totalScenarioCount,
                dueDate: assignment.dueDate?.toISOString(),
            };
        })),
    };
};

export const listPracticeSessions = async (): Promise<ActionResult<PracticeSessionSummary[]>> => {
    const access = await getActiveAccess();
    if ("error" in access) return { success: false, error: access.error };

    const assignmentFilter: Record<string, unknown> = {
        workspaceId: access.workspace._id,
        status: { $ne: "cancelled" },
    };

    if (!editableRoles.has(access.membership.role)) {
        assignmentFilter.assignedToMemberId = access.membership._id;
    }

    const assignments = await ModuleAssignment.find(assignmentFilter).sort({ updatedAt: -1 }).limit(80);
    const [plans, members, sessions] = await Promise.all([
        TrainingPlan.find({ _id: { $in: assignments.map((assignment) => assignment.trainingPlanId) }, workspaceId: access.workspace._id })
            .select("_id title")
            .lean(),
        WorkspaceMember.find({ _id: { $in: assignments.map((assignment) => assignment.assignedToMemberId).filter(Boolean) } })
            .select("_id email displayName")
            .lean(),
        PracticeSession.find({ assignmentId: { $in: assignments.map((assignment) => assignment._id) } })
            .sort({ updatedAt: -1 })
            .lean(),
    ]);
    const planById = new Map(plans.map((plan) => [plan._id.toString(), plan.title]));
    const memberById = new Map(members.map((member) => [member._id.toString(), member]));
    const sessionByAssignmentId = new Map<string, (typeof sessions)[number]>();
    for (const session of sessions) {
        const assignmentId = session.assignmentId.toString();
        if (!sessionByAssignmentId.has(assignmentId)) sessionByAssignmentId.set(assignmentId, session);
    }

    return {
        success: true,
        data: serializeData(assignments.map((assignment) => {
            const member = assignment.assignedToMemberId ? memberById.get(assignment.assignedToMemberId.toString()) : undefined;
            const session = sessionByAssignmentId.get(assignment._id.toString());

            return {
                assignmentId: assignment._id.toString(),
                sessionId: session?._id.toString(),
                moduleTitle: planById.get(assignment.trainingPlanId.toString()) || "Training module",
                traineeLabel: member?.displayName || member?.email || assignment.inviteEmail || "Assigned trainee",
                status: session?.status || assignment.status,
                progressPercent: assignment.progressPercent,
                score: session?.score,
                updatedAt: (session?.updatedAt || assignment.updatedAt).toISOString(),
                reviewable: editableRoles.has(access.membership.role),
            };
        })),
    };
};

export const getPracticeSessionReview = async (
    assignmentId: string,
): Promise<ActionResult<PracticeSessionReview>> => {
    const access = await getActiveAccess();
    if ("error" in access) return { success: false, error: access.error };
    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can review practice sessions." };
    }
    if (!Types.ObjectId.isValid(assignmentId)) {
        return { success: false, error: "That practice assignment could not be found." };
    }

    const assignment = await ModuleAssignment.findOne({
        _id: assignmentId,
        workspaceId: access.workspace._id,
        status: { $ne: "cancelled" },
    });
    if (!assignment) return { success: false, error: "That practice assignment could not be found." };

    const [plan, member, session] = await Promise.all([
        TrainingPlan.findOne({ _id: assignment.trainingPlanId, workspaceId: access.workspace._id }).select("title"),
        assignment.assignedToMemberId
            ? WorkspaceMember.findById(assignment.assignedToMemberId).select("displayName email")
            : Promise.resolve(null),
        PracticeSession.findOne({ assignmentId: assignment._id, status: { $ne: "cancelled" } })
            .sort({ updatedAt: -1 }),
    ]);

    return {
        success: true,
        data: serializeData({
            workspaceSlug: access.workspace.slug,
            assignmentId: assignment._id.toString(),
            moduleTitle: plan?.title || "Training module",
            traineeLabel: member?.displayName || member?.email || assignment.inviteEmail || "Assigned trainee",
            status: session?.status || assignment.status,
            progressPercent: assignment.progressPercent,
            score: session?.score,
            startedAt: session?.startedAt?.toISOString(),
            completedAt: session?.completedAt?.toISOString(),
            durationSeconds: session?.durationSeconds,
            completionReason: session?.completionReason,
            strengths: session?.strengths || [],
            gaps: session?.gaps || [],
            managerNotes: session?.managerNotes,
            messages: session ? serializeMessages(session.messages) : [],
            checkpoints: (session?.scenarioCheckpoints || []).map(
                (checkpoint: IPracticeSession["scenarioCheckpoints"][number]) => ({
                title: checkpoint.title,
                status: checkpoint.status,
                score: checkpoint.score,
                turnCount: checkpoint.turnCount || 0,
                hintCount: checkpoint.hintCount || 0,
                notes: checkpoint.notes,
                misconceptions: checkpoint.misconceptions || [],
                strengths: checkpoint.strengths || [],
                gaps: checkpoint.gaps || [],
                criteria: checkpoint.criterionAssessments || [],
                evidenceRefs: (checkpoint.evidenceRefs || []).map(
                    (reference: IPracticeSession["scenarioCheckpoints"][number]["evidenceRefs"][number]) => ({
                    sourceTitle: reference.sourceTitle,
                    chunkIndex: reference.chunkIndex,
                    pageNumber: reference.pageNumber,
                })),
            })),
        }),
    };
};
