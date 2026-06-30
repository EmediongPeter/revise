'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { connectToDatabase } from "@/database/mongoose";
import KnowledgeChunk from "@/database/models/knowledge-chunk.model";
import KnowledgeSource from "@/database/models/knowledge-source.model";
import Team from "@/database/models/team.model";
import TrainingPlan from "@/database/models/training-plan.model";
import UserProfile from "@/database/models/user-profile.model";
import Workspace from "@/database/models/workspace.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { generateBlueprintFromContext } from "@/lib/ai/generation/blueprint";
import { upsertKnowledgeChunks } from "@/lib/ai/pinecone";
import { buildBlueprintEvidence } from "@/lib/ai/retrieval/blueprint-context";
import type { BlueprintEvidence } from "@/lib/ai/types";
import { serializeData } from "@/lib/utils";
import type {
    KnowledgeSourceStatus,
    KnowledgeSourceType,
    ITrainingPlan,
    IWorkspace,
    IWorkspaceMember,
    TrainingPlanGenerationStatus,
    TrainingPlanGoal,
    TrainingPlanStatus,
} from "@/types";

type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

type ActiveWorkspaceAccess =
    | { error: string }
    | { userId: string; workspace: IWorkspace; membership: IWorkspaceMember };

type TrainingPlanLike = Pick<
    ITrainingPlan,
    | "title"
    | "description"
    | "iconKey"
    | "iconColor"
    | "objective"
    | "keyTopics"
    | "requiredKnowledge"
    | "practiceScenarios"
    | "commonMistakes"
    | "assessmentQuestions"
    | "rolePlayPrompts"
    | "assessmentCriteria"
    | "recommendedAssignments"
    | "missingSections"
    | "sourceReferenceNotes"
    | "trainerGuidance"
    | "goal"
    | "status"
    | "generationStatus"
    | "generationFailureReason"
    | "generatedBy"
    | "generationPrompt"
    | "needsRegeneration"
    | "regenerationFeedback"
    | "lastRegeneratedAt"
    | "blueprintVersion"
    | "createdByClerkId"
    | "updatedByClerkId"
    | "archivedAt"
    | "createdAt"
    | "updatedAt"
> & {
    _id: { toString: () => string };
    workspaceId: { toString: () => string };
    teamIds: Array<{ toString: () => string }>;
    sourceIds: Array<{ toString: () => string }>;
};

export type TrainingPlanSummary = {
    _id: string;
    workspaceId: string;
    teamIds: string[];
    sourceIds: string[];
    title: string;
    description?: string;
    iconKey?: string;
    iconColor?: string;
    objective?: string;
    keyTopics: string[];
    requiredKnowledge: string[];
    practiceScenarios: string[];
    commonMistakes: string[];
    assessmentQuestions: string[];
    rolePlayPrompts: string[];
    assessmentCriteria: string[];
    recommendedAssignments: string[];
    missingSections: string[];
    sourceReferenceNotes?: string;
    trainerGuidance?: string;
    goal: TrainingPlanGoal;
    status: TrainingPlanStatus;
    generationStatus: TrainingPlanGenerationStatus;
    generationFailureReason?: string;
    generatedBy?: "manual" | "ai";
    generationPrompt?: string;
    needsRegeneration: boolean;
    regenerationFeedback?: string;
    lastRegeneratedAt?: string;
    blueprintVersion: number;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type TrainingPlanTeamSummary = {
    _id: string;
    name: string;
    description?: string;
    identifier: string;
};

export type TrainingPlanSourceSummary = {
    _id: string;
    title: string;
    description?: string;
    sourceType: KnowledgeSourceType;
    status: KnowledgeSourceStatus;
    scope?: string;
    teamIds?: string[];
    fileName?: string;
    version: number;
};

export type TrainingPlanMemberSummary = {
    _id: string;
    clerkId?: string;
    email: string;
    displayName?: string;
    role: string;
    status: string;
};

export type TrainingPlanDetail = TrainingPlanSummary & {
    teams: TrainingPlanTeamSummary[];
    availableTeams: TrainingPlanTeamSummary[];
    sources: TrainingPlanSourceSummary[];
    availableSources: TrainingPlanSourceSummary[];
    members: TrainingPlanMemberSummary[];
    navigation: {
        previousPlanId?: string;
        nextPlanId?: string;
        position: number;
        total: number;
    };
};

export type UpdateTrainingPlanPropertiesInput = {
    planId: string;
    title?: string;
    description?: string;
    iconKey?: string;
    iconColor?: string;
    goal?: TrainingPlanGoal;
    teamIds?: string[];
};

export type CreateTrainingPlanDraftInput = {
    title: string;
    description?: string;
    objective?: string;
    goal: TrainingPlanGoal;
    sourceIds: string[];
    teamIds?: string[];
    generationPrompt?: string;
    trainerGuidance?: string;
};

export type PrepareTrainingBlueprintInput = {
    sourceIds: string[];
    teamIds?: string[];
    trainerGuidance?: string;
};

export type UpdateTrainingBlueprintInput = {
    planId: string;
    objective?: string;
    trainerGuidance?: string;
    keyTopics?: string[];
    requiredKnowledge?: string[];
    practiceScenarios?: string[];
    commonMistakes?: string[];
    assessmentQuestions?: string[];
    rolePlayPrompts?: string[];
    assessmentCriteria?: string[];
    recommendedAssignments?: string[];
    missingSections?: string[];
};

export type UpdateTrainingPlanStatusInput = {
    planId: string;
    status: TrainingPlanStatus;
};

export type UpdateTrainingPlanSourcesInput = {
    planId: string;
    sourceIds: string[];
};

export type RegenerateTrainingPlanInput = {
    planId: string;
    feedback?: string;
    sectionField?: TrainingBlueprintRegenerationField;
};

export type TrainingBlueprintRegenerationField = Exclude<
    keyof UpdateTrainingBlueprintInput,
    "planId" | "trainerGuidance"
>;

const editableRoles = new Set(["owner", "admin", "trainer"]);

const getActiveWorkspaceAccess = async (): Promise<ActiveWorkspaceAccess> => {
    const { userId } = await auth();

    if (!userId) {
        return { error: "Please sign in to manage training plans." };
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

    return { userId, workspace, membership };
};

const serializeTrainingPlan = (plan: TrainingPlanLike): TrainingPlanSummary => ({
    _id: plan._id.toString(),
    workspaceId: plan.workspaceId.toString(),
    teamIds: plan.teamIds.map((teamId) => teamId.toString()),
    sourceIds: plan.sourceIds.map((sourceId) => sourceId.toString()),
    title: plan.title,
    description: plan.description,
    iconKey: plan.iconKey || "clipboard",
    iconColor: plan.iconColor || "#d97757",
    objective: plan.objective,
    keyTopics: plan.keyTopics || [],
    requiredKnowledge: plan.requiredKnowledge || [],
    practiceScenarios: plan.practiceScenarios || [],
    commonMistakes: plan.commonMistakes || [],
    assessmentQuestions: plan.assessmentQuestions || [],
    rolePlayPrompts: plan.rolePlayPrompts || [],
    assessmentCriteria: plan.assessmentCriteria || [],
    recommendedAssignments: plan.recommendedAssignments || [],
    missingSections: plan.missingSections || [],
    sourceReferenceNotes: plan.sourceReferenceNotes,
    trainerGuidance: plan.trainerGuidance,
    goal: plan.goal,
    status: plan.status,
    generationStatus: plan.generationStatus,
    generationFailureReason: plan.generationFailureReason,
    generatedBy: plan.generatedBy,
    generationPrompt: plan.generationPrompt,
    needsRegeneration: plan.needsRegeneration || false,
    regenerationFeedback: plan.regenerationFeedback,
    lastRegeneratedAt: plan.lastRegeneratedAt?.toISOString(),
    blueprintVersion: plan.blueprintVersion || 1,
    createdByClerkId: plan.createdByClerkId,
    updatedByClerkId: plan.updatedByClerkId,
    archivedAt: plan.archivedAt?.toISOString(),
    createdAt: plan.createdAt?.toISOString(),
    updatedAt: plan.updatedAt?.toISOString(),
});

const getTeamIdentifier = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const identifier = words.length === 1
        ? words[0].slice(0, 3)
        : words.map((word) => word[0]).join("").slice(0, 3);

    return (identifier || "TM").toUpperCase();
};

const normalizeIds = (ids: string[] = []) => Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));

const validateObjectIds = (ids: string[]) => ids.length > 0 && ids.every((id) => Types.ObjectId.isValid(id));

const compactList = (items: string[], limit: number) =>
    Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);

const cleanList = (items?: string[]) =>
    items?.map((item) => item.trim()).filter(Boolean).slice(0, 24);

const regeneratableBlueprintFields = new Set<TrainingBlueprintRegenerationField>([
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
]);

const getSafeAIErrorMessage = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : "";

    if (
        error instanceof SyntaxError ||
        message.includes("JSON") ||
        message.includes("Zod") ||
        message.includes("Unterminated string") ||
        message.includes("Unexpected token") ||
        message.includes("response_format") ||
        message.includes("responseJsonSchema")
    ) {
        return "The AI response could not be turned into a clean training draft. Please try again with clearer feedback.";
    }

    if (message.includes("timed out") || message.includes("aborted")) {
        return "The AI draft took too long to generate. Please try again.";
    }

    if (message.includes("API key") || message.includes("not configured")) {
        return "AI generation is not configured correctly for this workspace.";
    }

    return fallback;
};

const inferGoalFromSources = (sources: Array<{ sourceType: string }>): TrainingPlanGoal => {
    if (sources.some((source) => source.sourceType === "sales-script")) return "sales-readiness";
    if (sources.some((source) => source.sourceType === "support-policy")) return "support-readiness";
    if (sources.some((source) => source.sourceType === "compliance-policy")) return "compliance";
    if (sources.some((source) => source.sourceType === "onboarding-guide" || source.sourceType === "handbook")) {
        return "onboarding";
    }

    return "operations";
};

const getSourceTypeLabel = (type: string) =>
    ({
        sop: "SOP",
        handbook: "handbook",
        "sales-script": "sales script",
        "support-policy": "support policy",
        "onboarding-guide": "onboarding guide",
        "compliance-policy": "compliance policy",
        "knowledge-base": "knowledge base",
        other: "source",
    })[type] || "source";

const buildBlueprintDraft = ({
    sourceTitles,
    sourceTypes,
    chunkSnippets,
}: {
    sourceTitles: string[];
    sourceTypes: string[];
    chunkSnippets: string[];
}) => {
    const topicSeeds = chunkSnippets.map((snippet) => {
        const cleaned = snippet.replace(/\s+/g, " ").trim();
        return cleaned.length > 86 ? `${cleaned.slice(0, 86).trim()}...` : cleaned;
    });
    const sourceTypeSummary = compactList(sourceTypes.map(getSourceTypeLabel), 4).join(", ");
    const primarySource = sourceTitles[0] || "selected source";

    return {
        title: sourceTitles.length === 1 ? `${primarySource} readiness blueprint` : "Cross-source readiness blueprint",
        description:
            sourceTitles.length === 1
                ? `Draft training blueprint prepared from ${primarySource}.`
                : `Draft training blueprint prepared from ${sourceTitles.length} selected sources.`,
        objective: `Help trainees understand, apply, and explain the required knowledge from the selected ${sourceTypeSummary || "source material"}.`,
        keyTopics: compactList(topicSeeds, 6),
        requiredKnowledge: compactList(
            [
                `Know the purpose and boundaries of ${sourceTitles.join(", ")}.`,
                "Explain the steps, policies, or decisions in plain language.",
                "Apply the source material to realistic team situations.",
                "Know when to escalate, ask for help, or verify a decision.",
            ],
            6,
        ),
        practiceScenarios: compactList(
            [
                `A new teammate asks how to follow ${primarySource} in a real customer or operations situation.`,
                "A trainee must choose the correct next step when the policy is unclear.",
                "A trainee explains the process to another teammate without reading from the source.",
                "A trainee handles a tense situation while staying aligned with the source material.",
            ],
            6,
        ),
        commonMistakes: compactList(
            [
                "Giving a confident answer without referencing the required process.",
                "Skipping escalation or approval steps.",
                "Using generic judgment where the company source gives a specific rule.",
                "Communicating the right answer with poor clarity or empathy.",
            ],
            6,
        ),
        assessmentQuestions: compactList(
            [
                "What is the correct first action in this situation?",
                "Which part of the source supports your answer?",
                "What should you do if this case does not fit the standard path?",
                "How would you explain this decision to a customer or teammate?",
            ],
            6,
        ),
        rolePlayPrompts: compactList(
            [
                "Start warmly, confirm the trainee's role, then present a realistic scenario.",
                "Ask the trainee to explain their reasoning before giving feedback.",
                "Probe for source-backed evidence when the answer is vague.",
                "Close with a readiness summary and one focused coaching point.",
            ],
            6,
        ),
        assessmentCriteria: compactList(
            [
                "Chooses the correct action path.",
                "References the correct policy or source concept.",
                "Communicates with clarity and empathy.",
                "Escalates or asks for support when appropriate.",
            ],
            6,
        ),
        recommendedAssignments: compactList(
            [
                "Assign to teams scoped to the selected sources.",
                "Use as a manager-reviewed draft before trainee rollout.",
            ],
            4,
        ),
        missingSections: compactList(
            [
                "Confirm whether role-specific edge cases need to be added.",
                "Add company examples if the source is mostly policy language.",
                "Add pass/fail thresholds before assigning to trainees.",
            ],
            4,
        ),
        sourceReferenceNotes: `Prepared from ${sourceTitles.join(", ")}. This is a structured draft and should be reviewed before assignment.`,
    };
};

export const createTrainingPlanDraft = async (
    input: CreateTrainingPlanDraftInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can create training plans." };
    }

    const title = input.title.trim();
    const sourceIds = normalizeIds(input.sourceIds);
    const teamIds = normalizeIds(input.teamIds);

    if (title.length < 2) {
        return { success: false, error: "Training plan title must be at least 2 characters." };
    }

    if (!validateObjectIds(sourceIds)) {
        return { success: false, error: "Select at least one valid source." };
    }

    if (teamIds.length > 0 && !teamIds.every((teamId) => Types.ObjectId.isValid(teamId))) {
        return { success: false, error: "One or more selected teams could not be found." };
    }

    const sourceObjectIds = sourceIds.map((sourceId) => new Types.ObjectId(sourceId));
    const teamObjectIds = teamIds.map((teamId) => new Types.ObjectId(teamId));

    const [sourceCount, teamCount] = await Promise.all([
        KnowledgeSource.countDocuments({
            _id: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
            isCurrentVersion: true,
            status: { $ne: "archived" },
        }),
        teamObjectIds.length > 0
            ? Team.countDocuments({ _id: { $in: teamObjectIds }, workspaceId: access.workspace._id })
            : Promise.resolve(0),
    ]);

    if (sourceCount !== sourceObjectIds.length) {
        return { success: false, error: "One or more selected sources are unavailable in this workspace." };
    }

    if (teamObjectIds.length > 0 && teamCount !== teamObjectIds.length) {
        return { success: false, error: "One or more selected teams do not belong to this workspace." };
    }

    const plan = await TrainingPlan.create({
        workspaceId: access.workspace._id,
        teamIds: teamObjectIds,
        sourceIds: sourceObjectIds,
        title,
        description: input.description?.trim() || undefined,
        objective: input.objective?.trim() || undefined,
        keyTopics: [],
        requiredKnowledge: [],
        practiceScenarios: [],
        commonMistakes: [],
        assessmentQuestions: [],
        rolePlayPrompts: [],
        assessmentCriteria: [],
        recommendedAssignments: [],
        missingSections: [],
        trainerGuidance: input.trainerGuidance?.trim() || undefined,
        goal: input.goal,
        status: "draft",
        generationStatus: "review",
        generatedBy: "manual",
        generationPrompt: input.generationPrompt?.trim() || undefined,
        needsRegeneration: false,
        blueprintVersion: 1,
        createdByClerkId: access.userId,
        updatedByClerkId: access.userId,
    });

    revalidatePath(`/${access.workspace.slug}/knowledge`);
    revalidatePath(`/${access.workspace.slug}/modules`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const prepareTrainingBlueprintDraft = async (
    input: PrepareTrainingBlueprintInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    console.info("[AI Blueprint] prepare:start", {
        sourceCount: input.sourceIds.length,
        teamCount: input.teamIds?.length || 0,
        hasTrainerGuidance: Boolean(input.trainerGuidance?.trim()),
    });

    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can prepare training blueprints." };
    }

    const sourceIds = normalizeIds(input.sourceIds);
    const teamIds = normalizeIds(input.teamIds);

    if (!validateObjectIds(sourceIds)) {
        return { success: false, error: "Select at least one valid source." };
    }

    if (teamIds.length > 0 && !teamIds.every((teamId) => Types.ObjectId.isValid(teamId))) {
        return { success: false, error: "One or more selected teams could not be found." };
    }

    const sourceObjectIds = sourceIds.map((sourceId) => new Types.ObjectId(sourceId));
    const teamObjectIds = teamIds.map((teamId) => new Types.ObjectId(teamId));

    const [sources, teamCount, chunks] = await Promise.all([
        KnowledgeSource.find({
            _id: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
            isCurrentVersion: true,
            status: "ready",
        })
            .sort({ updatedAt: -1 })
            .lean(),
        teamObjectIds.length > 0
            ? Team.countDocuments({ _id: { $in: teamObjectIds }, workspaceId: access.workspace._id })
            : Promise.resolve(0),
        KnowledgeChunk.find({
            sourceId: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
        })
            .sort({ sourceId: 1, chunkIndex: 1 })
            .lean(),
    ]);

    if (sources.length !== sourceObjectIds.length) {
        return { success: false, error: "Training blueprints can only be prepared from ready sources in this workspace." };
    }

    if (teamObjectIds.length > 0 && teamCount !== teamObjectIds.length) {
        return { success: false, error: "One or more selected teams do not belong to this workspace." };
    }

    const inheritedTeamIds = teamObjectIds.length > 0
        ? teamObjectIds
        : Array.from(
              new Map(
                  sources
                      .flatMap((source) => source.teamIds || [])
                      .map((teamId) => [teamId.toString(), teamId]),
              ).values(),
          );

    if (chunks.length === 0) {
        return { success: false, error: "No processed chunks were found for the selected sources." };
    }

    const generationPrompt = "Generate a training blueprint from selected source chunks.";
    console.info("[AI Blueprint] prepare:context-loaded", {
        workspaceId: access.workspace._id.toString(),
        sources: sources.length,
        chunks: chunks.length,
        inheritedTeams: inheritedTeamIds.length,
    });

    const chunksNeedingEmbeddings = chunks.filter((chunk) => chunk.embeddingStatus !== "embedded");
    console.info("[AI Blueprint] prepare:embedding-check", {
        chunksNeedingEmbeddings: chunksNeedingEmbeddings.length,
    });

    for (const source of sources) {
        const sourceChunks = chunksNeedingEmbeddings.filter((chunk) => chunk.sourceId.toString() === source._id.toString());

        if (sourceChunks.length > 0) {
            const embeddingResult = await upsertKnowledgeChunks({
                chunks: sourceChunks,
                source: {
                    _id: source._id.toString(),
                    title: source.title,
                    sourceType: source.sourceType,
                    version: source.version,
                },
            });
            if (embeddingResult.failed > 0) {
                console.warn("[AI Blueprint] prepare:embedding-failures", {
                    sourceId: source._id.toString(),
                    embedded: embeddingResult.embedded,
                    failed: embeddingResult.failed,
                });
            }
        }
    }

    let evidence: BlueprintEvidence[];

    try {
        evidence = await buildBlueprintEvidence({
            workspaceId: access.workspace._id.toString(),
            sources,
            chunks,
            teamIds: inheritedTeamIds.map((teamId) => teamId.toString()),
            trainerGuidance: input.trainerGuidance,
            operation: "prepare",
        });
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Could not retrieve source context from Pinecone.",
        };
    }

    let draft;

    try {
        console.info("[AI Blueprint] prepare:generation-start", {
            evidenceCount: evidence.length,
            providerInputSources: sources.length,
        });
        draft = await generateBlueprintFromContext({
            sources,
            evidence,
            trainerGuidance: input.trainerGuidance,
        });
        console.info("[AI Blueprint] prepare:generation-success", {
            title: draft.title,
            topics: draft.keyTopics.length,
            scenarios: draft.practiceScenarios.length,
        });
    } catch (error) {
        console.error("[AI Blueprint] prepare:generation-failed", {
            message: error instanceof Error ? error.message : "Unknown generation error.",
        });
        return {
            success: false,
            error: getSafeAIErrorMessage(error, "AI blueprint generation failed. Please try again."),
        };
    }

    const [plan] = await TrainingPlan.create([
        {
            workspaceId: access.workspace._id,
            teamIds: inheritedTeamIds,
            sourceIds: sourceObjectIds,
            ...draft,
            goal: inferGoalFromSources(sources),
            status: "review",
            generationStatus: "review",
            generatedBy: "ai",
            generationPrompt,
            needsRegeneration: false,
            lastRegeneratedAt: new Date(),
            blueprintVersion: 1,
            trainerGuidance: input.trainerGuidance?.trim() || undefined,
            createdByClerkId: access.userId,
            updatedByClerkId: access.userId,
        },
    ]);

    revalidatePath(`/${access.workspace.slug}/knowledge`);
    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${plan._id.toString()}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const listTrainingPlans = async (): Promise<ActionResult<TrainingPlanSummary[]>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    const plans = await TrainingPlan.find({
        workspaceId: access.workspace._id,
        status: { $ne: "archived" },
    })
        .sort({ updatedAt: -1 })
        .lean();

    return { success: true, data: serializeData(plans.map(serializeTrainingPlan)) };
};

export const getTrainingPlanDetail = async (
    planId: string,
): Promise<ActionResult<TrainingPlanDetail>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!Types.ObjectId.isValid(planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const plan = await TrainingPlan.findOne({
        _id: planId,
        workspaceId: access.workspace._id,
    }).lean();

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const [teams, availableTeams, sources, availableSources, members, siblingPlans] = await Promise.all([
        plan.teamIds.length > 0
            ? Team.find({ _id: { $in: plan.teamIds }, workspaceId: access.workspace._id })
                  .sort({ name: 1 })
                  .select("_id name description")
                  .lean()
            : Promise.resolve([]),
        Team.find({ workspaceId: access.workspace._id })
            .sort({ name: 1 })
            .select("_id name description")
            .lean(),
        KnowledgeSource.find({ _id: { $in: plan.sourceIds }, workspaceId: access.workspace._id })
            .sort({ title: 1 })
            .select("_id title description sourceType status scope teamIds fileName version")
            .lean(),
        KnowledgeSource.find({
            workspaceId: access.workspace._id,
            isCurrentVersion: true,
            status: "ready",
        })
            .sort({ title: 1 })
            .select("_id title description sourceType status scope teamIds fileName version")
            .lean(),
        WorkspaceMember.find({
            workspaceId: access.workspace._id,
            status: { $in: ["active", "invited"] },
        })
            .sort({ displayName: 1, email: 1 })
            .select("_id clerkId email displayName role status")
            .lean(),
        TrainingPlan.find({
            workspaceId: access.workspace._id,
            status: { $ne: "archived" },
        })
            .sort({ updatedAt: -1 })
            .select("_id")
            .lean(),
    ]);

    const siblingIds = siblingPlans.map((sibling) => sibling._id.toString());
    const currentIndex = siblingIds.indexOf(plan._id.toString());

    const detail: TrainingPlanDetail = {
        ...serializeTrainingPlan(plan),
        teams: teams.map((team) => ({
            _id: team._id.toString(),
            name: team.name,
            description: team.description,
            identifier: getTeamIdentifier(team.name),
        })),
        availableTeams: availableTeams.map((team) => ({
            _id: team._id.toString(),
            name: team.name,
            description: team.description,
            identifier: getTeamIdentifier(team.name),
        })),
        sources: sources.map((source) => ({
            _id: source._id.toString(),
            title: source.title,
            description: source.description,
            sourceType: source.sourceType,
            status: source.status,
            scope: source.scope,
            teamIds: (source.teamIds || []).map((teamId: Types.ObjectId) => teamId.toString()),
            fileName: source.fileName,
            version: source.version,
        })),
        availableSources: availableSources.map((source) => ({
            _id: source._id.toString(),
            title: source.title,
            description: source.description,
            sourceType: source.sourceType,
            status: source.status,
            scope: source.scope,
            teamIds: (source.teamIds || []).map((teamId: Types.ObjectId) => teamId.toString()),
            fileName: source.fileName,
            version: source.version,
        })),
        members: members.map((member) => ({
            _id: member._id.toString(),
            clerkId: member.clerkId,
            email: member.email,
            displayName: member.displayName,
            role: member.role,
            status: member.status,
        })),
        navigation: {
            previousPlanId: currentIndex > 0 ? siblingIds[currentIndex - 1] : undefined,
            nextPlanId: currentIndex >= 0 && currentIndex < siblingIds.length - 1 ? siblingIds[currentIndex + 1] : undefined,
            position: currentIndex >= 0 ? currentIndex + 1 : 1,
            total: siblingIds.length,
        },
    };

    return { success: true, data: serializeData(detail) };
};

export const updateTrainingPlanProperties = async (
    input: UpdateTrainingPlanPropertiesInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can edit training blueprints." };
    }

    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const updates: Record<string, unknown> = {
        updatedByClerkId: access.userId,
    };

    if (typeof input.title === "string") {
        const title = input.title.trim();
        if (title.length < 2) return { success: false, error: "Training module title must be at least 2 characters." };
        updates.title = title;
    }

    if (typeof input.description === "string") {
        updates.description = input.description.trim() || undefined;
    }

    if (typeof input.iconKey === "string") {
        updates.iconKey = input.iconKey.trim().slice(0, 40) || "clipboard";
    }

    if (typeof input.iconColor === "string") {
        const iconColor = input.iconColor.trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(iconColor)) {
            return { success: false, error: "Choose a valid six-digit hex icon color." };
        }
        updates.iconColor = iconColor;
    }

    if (input.goal) {
        updates.goal = input.goal;
    }

    if (input.teamIds) {
        const teamIds = normalizeIds(input.teamIds);
        if (teamIds.length > 0 && !teamIds.every((teamId) => Types.ObjectId.isValid(teamId))) {
            return { success: false, error: "One or more selected teams could not be found." };
        }

        const teamObjectIds = teamIds.map((teamId) => new Types.ObjectId(teamId));
        const teamCount = teamObjectIds.length > 0
            ? await Team.countDocuments({ _id: { $in: teamObjectIds }, workspaceId: access.workspace._id })
            : 0;

        if (teamObjectIds.length > 0 && teamCount !== teamObjectIds.length) {
            return { success: false, error: "One or more selected teams do not belong to this workspace." };
        }

        updates.teamIds = teamObjectIds;
    }

    const plan = await TrainingPlan.findOneAndUpdate(
        { _id: input.planId, workspaceId: access.workspace._id },
        updates,
        { new: true },
    );

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${input.planId}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const updateTrainingBlueprint = async (
    input: UpdateTrainingBlueprintInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can edit training blueprints." };
    }

    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const updates: Record<string, unknown> = {
        updatedByClerkId: access.userId,
    };

    if (typeof input.objective === "string") updates.objective = input.objective.trim();
    if (typeof input.trainerGuidance === "string") updates.trainerGuidance = input.trainerGuidance.trim();

    ([
        "keyTopics",
        "requiredKnowledge",
        "practiceScenarios",
        "commonMistakes",
        "assessmentQuestions",
        "rolePlayPrompts",
        "assessmentCriteria",
        "recommendedAssignments",
        "missingSections",
    ] as const).forEach((field) => {
        const value = cleanList(input[field]);
        if (value) updates[field] = value;
    });

    const plan = await TrainingPlan.findOneAndUpdate(
        { _id: input.planId, workspaceId: access.workspace._id },
        updates,
        { new: true },
    );

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${input.planId}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const updateTrainingPlanSources = async (
    input: UpdateTrainingPlanSourcesInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can edit training blueprint sources." };
    }

    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const sourceIds = normalizeIds(input.sourceIds);

    if (!validateObjectIds(sourceIds)) {
        return { success: false, error: "Select at least one ready source." };
    }

    const sourceObjectIds = sourceIds.map((sourceId) => new Types.ObjectId(sourceId));
    const [plan, sourceCount] = await Promise.all([
        TrainingPlan.findOne({ _id: input.planId, workspaceId: access.workspace._id }),
        KnowledgeSource.countDocuments({
            _id: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
            isCurrentVersion: true,
            status: "ready",
        }),
    ]);

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    if (sourceCount !== sourceObjectIds.length) {
        return { success: false, error: "Training modules can only use ready sources in this workspace." };
    }

    const currentSourceIds = plan.sourceIds.map((sourceId: Types.ObjectId) => sourceId.toString()).sort();
    const nextSourceIds = sourceIds.slice().sort();
    const changed =
        currentSourceIds.length !== nextSourceIds.length ||
        currentSourceIds.some((sourceId: string, index: number) => sourceId !== nextSourceIds[index]);

    if (!changed) {
        return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
    }

    plan.sourceIds = sourceObjectIds;
    plan.needsRegeneration = true;
    plan.generationStatus = "review";
    plan.updatedByClerkId = access.userId;

    if (plan.status === "ready") {
        plan.status = "review";
    }

    await plan.save();

    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${input.planId}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const regenerateTrainingPlan = async (
    input: RegenerateTrainingPlanInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    console.info("[AI Blueprint] regenerate:start", {
        planId: input.planId,
        hasFeedback: Boolean(input.feedback?.trim()),
        sectionField: input.sectionField || null,
    });

    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can regenerate training blueprints." };
    }

    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    if (input.sectionField && !regeneratableBlueprintFields.has(input.sectionField)) {
        return { success: false, error: "That section cannot be regenerated yet." };
    }

    const plan = await TrainingPlan.findOne({ _id: input.planId, workspaceId: access.workspace._id });

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    const sourceObjectIds = plan.sourceIds.map((sourceId: Types.ObjectId) => sourceId);

    if (sourceObjectIds.length === 0) {
        return { success: false, error: "Add at least one source before regenerating this module." };
    }

    const [sources, chunks] = await Promise.all([
        KnowledgeSource.find({
            _id: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
            isCurrentVersion: true,
            status: "ready",
        })
            .sort({ updatedAt: -1 })
            .lean(),
        KnowledgeChunk.find({
            sourceId: { $in: sourceObjectIds },
            workspaceId: access.workspace._id,
        })
            .sort({ sourceId: 1, chunkIndex: 1 })
            .lean(),
    ]);

    if (sources.length !== sourceObjectIds.length) {
        return { success: false, error: "Regeneration needs all linked sources to be ready." };
    }

    if (chunks.length === 0) {
        return { success: false, error: "No processed chunks were found for the linked sources." };
    }

    const feedback = input.feedback?.trim();
    const generationPrompt = feedback
        ? `Regenerate this training blueprint with admin feedback: ${feedback}`
        : "Regenerate this training blueprint from linked source chunks.";
    console.info("[AI Blueprint] regenerate:context-loaded", {
        workspaceId: access.workspace._id.toString(),
        planId: input.planId,
        sources: sources.length,
        chunks: chunks.length,
        teams: plan.teamIds.length,
    });

    const chunksNeedingEmbeddings = chunks.filter((chunk) => chunk.embeddingStatus !== "embedded");
    console.info("[AI Blueprint] regenerate:embedding-check", {
        chunksNeedingEmbeddings: chunksNeedingEmbeddings.length,
    });

    for (const source of sources) {
        const sourceChunks = chunksNeedingEmbeddings.filter((chunk) => chunk.sourceId.toString() === source._id.toString());

        if (sourceChunks.length > 0) {
            const embeddingResult = await upsertKnowledgeChunks({
                chunks: sourceChunks,
                source: {
                    _id: source._id.toString(),
                    title: source.title,
                    sourceType: source.sourceType,
                    version: source.version,
                },
            });
            if (embeddingResult.failed > 0) {
                console.warn("[AI Blueprint] regenerate:embedding-failures", {
                    sourceId: source._id.toString(),
                    embedded: embeddingResult.embedded,
                    failed: embeddingResult.failed,
                });
            }
        }
    }

    let evidence: BlueprintEvidence[];

    try {
        evidence = await buildBlueprintEvidence({
            workspaceId: access.workspace._id.toString(),
            sources,
            chunks,
            teamIds: plan.teamIds.map((teamId: Types.ObjectId) => teamId.toString()),
            trainerGuidance: plan.trainerGuidance,
            regenerationFeedback: feedback,
            operation: "regenerate",
        });
    } catch (error) {
        return {
            success: false,
            error: getSafeAIErrorMessage(error, "Could not prepare source context for regeneration."),
        };
    }

    let draft;

    try {
        console.info("[AI Blueprint] regenerate:generation-start", {
            evidenceCount: evidence.length,
            providerInputSources: sources.length,
        });
        draft = await generateBlueprintFromContext({
            sources,
            evidence,
            trainerGuidance: [plan.trainerGuidance, feedback].filter(Boolean).join("\n\n"),
        });
        console.info("[AI Blueprint] regenerate:generation-success", {
            title: draft.title,
            topics: draft.keyTopics.length,
            scenarios: draft.practiceScenarios.length,
        });
    } catch (error) {
        console.error("[AI Blueprint] regenerate:generation-failed", {
            message: error instanceof Error ? error.message : "Unknown generation error.",
        });
        return {
            success: false,
            error: getSafeAIErrorMessage(error, "AI blueprint regeneration failed. Please try again."),
        };
    }

    const nextDraft = input.sectionField
        ? { [input.sectionField]: draft[input.sectionField] }
        : {
            ...draft,
            goal: inferGoalFromSources(sources),
        };

    Object.assign(plan, {
        ...nextDraft,
        status: "review",
        generationStatus: "review",
        generatedBy: "ai",
        generationPrompt,
        needsRegeneration: false,
        regenerationFeedback: feedback,
        lastRegeneratedAt: new Date(),
        blueprintVersion: (plan.blueprintVersion || 1) + 1,
        updatedByClerkId: access.userId,
    });

    await plan.save();

    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${input.planId}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const updateTrainingPlanStatus = async (
    input: UpdateTrainingPlanStatusInput,
): Promise<ActionResult<TrainingPlanSummary>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!editableRoles.has(access.membership.role)) {
        return { success: false, error: "Only owners, admins, and trainers can update training blueprints." };
    }

    if (!Types.ObjectId.isValid(input.planId)) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    if (!["review", "ready", "archived"].includes(input.status)) {
        return { success: false, error: "That blueprint status is not supported." };
    }

    const existingPlan = await TrainingPlan.findOne({
        _id: input.planId,
        workspaceId: access.workspace._id,
    });

    if (!existingPlan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    if (input.status === "ready" && existingPlan.needsRegeneration) {
        return { success: false, error: "Regenerate this module before marking it ready." };
    }

    const plan = await TrainingPlan.findOneAndUpdate(
        { _id: input.planId, workspaceId: access.workspace._id },
        {
            status: input.status,
            updatedByClerkId: access.userId,
            archivedAt: input.status === "archived" ? new Date() : undefined,
        },
        { new: true },
    );

    if (!plan) {
        return { success: false, error: "That training blueprint could not be found." };
    }

    revalidatePath(`/${access.workspace.slug}/modules`);
    revalidatePath(`/${access.workspace.slug}/modules/${input.planId}`);

    return { success: true, data: serializeData(serializeTrainingPlan(plan)) };
};

export const markTrainingPlanReady = async (planId: string) =>
    updateTrainingPlanStatus({ planId, status: "ready" });

export const archiveTrainingPlan = async (planId: string) =>
    updateTrainingPlanStatus({ planId, status: "archived" });

export const listTrainingPlansForSource = async (
    sourceId: string,
): Promise<ActionResult<TrainingPlanSummary[]>> => {
    const access = await getActiveWorkspaceAccess();

    if ("error" in access) {
        return { success: false, error: access.error };
    }

    if (!Types.ObjectId.isValid(sourceId)) {
        return { success: false, error: "That source could not be found." };
    }

    const plans = await TrainingPlan.find({
        workspaceId: access.workspace._id,
        sourceIds: new Types.ObjectId(sourceId),
        status: { $ne: "archived" },
    })
        .sort({ updatedAt: -1 })
        .lean();

    return { success: true, data: serializeData(plans.map(serializeTrainingPlan)) };
};
