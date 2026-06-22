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

export type WorkspaceMemberRole = "owner" | "admin" | "trainer" | "member";
export type WorkspaceMemberStatus = "active" | "invited" | "removed";

export interface IWorkspaceMember extends Document {
    _id: Types.ObjectId;
    workspaceId: Types.ObjectId;
    clerkId?: string;
    email: string;
    displayName?: string;
    role: WorkspaceMemberRole;
    status: WorkspaceMemberStatus;
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
export type PracticeScenarioStatus = "draft" | "ready" | "archived";

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
    moduleId: Types.ObjectId;
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
