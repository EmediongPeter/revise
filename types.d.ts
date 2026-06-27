import { Document, Types } from 'mongoose';
import { ReactNode } from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { LucideIcon } from 'lucide-react';
import z from 'zod';
import { UploadSchema } from '@/lib/zod';

// ============================================
// DATABASE MODELS
// ============================================

export interface IBook extends Document {
    _id: string;
    clerkId: string;
    title: string;
    slug: string;
    author: string;
    persona?: string;
    fileURL: string;
    fileBlobKey: string;
    coverURL: string;
    coverBlobKey?: string;
    fileSize: number;
    totalSegments: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IBookSegment extends Document {
    clerkId: string;
    bookId: Types.ObjectId;
    content: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface IVoiceSession extends Document {
    _id: string;
    clerkId: string;
    bookId: Types.ObjectId;
    startedAt: Date;
    endedAt?: Date;
    durationSeconds: number;
    billingPeriodStart: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserProfile extends Document {
    _id: Types.ObjectId;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName: string;
    imageUrl?: string;
    role?: string;
    onboardingCompleted: boolean;
    activeWorkspaceId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IWorkspace extends Document {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    avatarSeed?: string;
    industry: string;
    ownerClerkId: string;
    createdByClerkId: string;
    trainingGoals: string[];
    googleDriveConnected: boolean;
    uploadedSourceName?: string;
    activationWizardCompletedStepIds?: string[];
    activationWizardSkippedAt?: Date;
    activationWizardCompletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export type WorkspaceMemberRole = "owner" | "admin" | "trainer" | "trainee" | "member";
export type WorkspaceMemberStatus = "active" | "invited" | "removed";

export interface IWorkspaceMember extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    clerkId?: string;
    email: string;
    displayName?: string;
    role: WorkspaceMemberRole;
    status: WorkspaceMemberStatus;
    teamIds: Types.ObjectId[];
    invitedByClerkId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITeam extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    name: string;
    description?: string;
    createdByClerkId: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type KnowledgeSourceType =
    | "sop"
    | "handbook"
    | "sales-script"
    | "support-policy"
    | "onboarding-guide"
    | "compliance-policy"
    | "knowledge-base"
    | "other";

export type KnowledgeSourceScope = "workspace" | "teams";
export type KnowledgeSourceStatus = "uploaded" | "processing" | "ready" | "failed" | "archived";
export type KnowledgeSourceOrigin = "manual-upload" | "google-drive" | "notion" | "sharepoint" | "url" | "api";
export type KnowledgeChunkStatus = "pending" | "embedded" | "failed";
export type TrainingModuleStatus = "draft" | "ready" | "archived";
export type TrainingModuleDifficulty = "intro" | "standard" | "advanced";
export type TrainingPlanStatus = "draft" | "review" | "ready" | "archived";
export type TrainingPlanGenerationStatus = "queued" | "generating" | "review" | "failed";
export type TrainingPlanGoal =
    | "onboarding"
    | "sales-readiness"
    | "support-readiness"
    | "compliance"
    | "product-knowledge"
    | "operations"
    | "custom";
export type PracticeScenarioStatus = "draft" | "ready" | "archived";
export type ModuleAssignmentStatus = "invited" | "assigned" | "in_progress" | "completed" | "cancelled";
export type PracticeSessionStatus = "active" | "completed" | "needs_review" | "cancelled";
export type PracticeSessionStage = "opening" | "scenario" | "probe" | "coach" | "complete";
export type PracticeInstructionalAction =
    | "opening"
    | "probe"
    | "challenge"
    | "coach"
    | "remediate"
    | "advance"
    | "complete";
export type PracticeCompletionReason = "scenarios_complete" | "time_expired" | "trainee_ended";

export interface IKnowledgeSource extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    teamIds: Types.ObjectId[];
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
    replacesSourceId?: Types.ObjectId;
    isCurrentVersion: boolean;
    failureReason?: string;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IKnowledgeChunk extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    sourceId: Types.ObjectId;
    teamIds: Types.ObjectId[];
    scope: KnowledgeSourceScope;
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
    tokenCount?: number;
    sourceVersion: number;
    embeddingStatus: KnowledgeChunkStatus;
    embeddingModel?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITrainingPlan extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    teamIds: Types.ObjectId[];
    sourceIds: Types.ObjectId[];
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
    needsRegeneration?: boolean;
    regenerationFeedback?: string;
    lastRegeneratedAt?: Date;
    blueprintVersion?: number;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITrainingModule extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    teamIds: Types.ObjectId[];
    sourceIds: Types.ObjectId[];
    title: string;
    description?: string;
    objective?: string;
    difficulty: TrainingModuleDifficulty;
    status: TrainingModuleStatus;
    estimatedMinutes?: number;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPracticeScenario extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    trainingPlanId: Types.ObjectId;
    moduleId?: Types.ObjectId;
    teamIds: Types.ObjectId[];
    sourceIds: Types.ObjectId[];
    title: string;
    situation: string;
    traineePrompt: string;
    idealOutcome?: string;
    evaluationRubric: string[];
    status: PracticeScenarioStatus;
    sortOrder: number;
    createdByClerkId: string;
    updatedByClerkId?: string;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IModuleAssignment extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    trainingPlanId: Types.ObjectId;
    assignedToMemberId?: Types.ObjectId;
    assignedToTeamId?: Types.ObjectId;
    inviteEmail?: string;
    inviteToken: string;
    status: ModuleAssignmentStatus;
    required: boolean;
    dueDate?: Date;
    guidanceOverride?: string;
    sessionDurationMinutes: number;
    progressPercent: number;
    completedScenarioCount: number;
    totalScenarioCount: number;
    acceptedAt?: Date;
    completedAt?: Date;
    createdByClerkId: string;
    updatedByClerkId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type PracticeSessionMessageRole = "assistant" | "user" | "system";

export interface IPracticeSessionMessage {
    role: PracticeSessionMessageRole;
    content: string;
    createdAt: Date;
    scenarioIndex?: number;
    action?: PracticeInstructionalAction;
}

export interface IPracticeCriterionAssessment {
    criterion: string;
    score: number;
    met: boolean;
    evidence?: string;
}

export interface IPracticeEvidenceReference {
    sourceId: string;
    sourceTitle: string;
    chunkId: string;
    chunkIndex: number;
    pageNumber?: number;
}

export interface IPracticeSessionScenarioCheckpoint {
    scenarioId: Types.ObjectId;
    title: string;
    status: "pending" | "active" | "completed";
    score?: number;
    notes?: string;
    turnCount: number;
    hintCount: number;
    criterionAssessments: IPracticeCriterionAssessment[];
    misconceptions: string[];
    strengths: string[];
    gaps: string[];
    evidenceRefs: IPracticeEvidenceReference[];
    lastAction?: PracticeInstructionalAction;
}

export interface IPracticeSession extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    assignmentId: Types.ObjectId;
    trainingPlanId: Types.ObjectId;
    traineeMemberId: Types.ObjectId;
    status: PracticeSessionStatus;
    stage: PracticeSessionStage;
    currentScenarioIndex: number;
    scenarioCheckpoints: IPracticeSessionScenarioCheckpoint[];
    messages: IPracticeSessionMessage[];
    score?: number;
    strengths: string[];
    gaps: string[];
    managerNotes?: string;
    startedAt: Date;
    expiresAt: Date;
    durationSeconds?: number;
    completedAt?: Date;
    completionReason?: PracticeCompletionReason;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// FORM & INPUT TYPES
// ============================================

export type BookUploadFormValues = z.infer<typeof UploadSchema>;

export interface CreateBook {
    clerkId: string;
    title: string;
    author: string;
    persona?: string;
    fileURL: string;
    fileBlobKey: string;
    coverURL?: string;
    coverBlobKey?: string;
    fileSize: number;
}

export interface TextSegment {
    text: string;
    segmentIndex: number;
    pageNumber?: number;
    wordCount: number;
}

export interface BookCardProps {
    title: string;
    author: string;
    coverURL: string;
    slug: string;
}

export interface Messages {
    role: string;
    content: string;
}

export interface ShadowBoxProps {
    children: ReactNode;
    className?: string;
}

export interface VoiceSelectorProps {
    disabled?: boolean;
    className?: string;
    value?: string;
    onChange: (voiceId: string) => void;
}

export interface InputFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    placeholder?: string;
    disabled?: boolean;
}

export interface FileUploadFieldProps<T extends FieldValues> {
    control: Control<T>;
    name: FieldPath<T>;
    label: string;
    acceptTypes: string[];
    disabled?: boolean;
    multiple?: boolean;
    icon: LucideIcon;
    placeholder: string;
    hint: string;
}
import {PLANS, PlanType} from "@/lib/subscription-constants";

export interface SessionCheckResult {
    allowed: boolean;
    currentCount: number;
    limit: number;
    plan: PlanType;
    maxDurationMinutes: number;
    error?: string;
}

export interface StartSessionResult {
    success: boolean;
    sessionId?: string;
    maxDurationMinutes?: number;
    error?: string;
    isBillingError?: boolean;
}

export interface EndSessionResult {
    success: boolean;
    error?: string;
}
