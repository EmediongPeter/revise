import { model, models, Schema } from "mongoose";
import { ITrainingPlan } from "@/types";

const TrainingPlanSchema = new Schema<ITrainingPlan>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        sourceIds: [{ type: Schema.Types.ObjectId, ref: "KnowledgeSource", required: true, index: true }],
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        iconKey: { type: String, trim: true, default: "clipboard" },
        iconColor: { type: String, trim: true, default: "#d97757" },
        objective: { type: String, trim: true },
        keyTopics: [{ type: String, trim: true }],
        requiredKnowledge: [{ type: String, trim: true }],
        practiceScenarios: [{ type: String, trim: true }],
        commonMistakes: [{ type: String, trim: true }],
        assessmentQuestions: [{ type: String, trim: true }],
        rolePlayPrompts: [{ type: String, trim: true }],
        assessmentCriteria: [{ type: String, trim: true }],
        recommendedAssignments: [{ type: String, trim: true }],
        missingSections: [{ type: String, trim: true }],
        sourceReferenceNotes: { type: String, trim: true },
        trainerGuidance: { type: String, trim: true },
        goal: {
            type: String,
            enum: [
                "onboarding",
                "sales-readiness",
                "support-readiness",
                "compliance",
                "product-knowledge",
                "operations",
                "custom",
            ],
            required: true,
            default: "custom",
            index: true,
        },
        status: {
            type: String,
            enum: ["draft", "review", "ready", "archived"],
            required: true,
            default: "draft",
            index: true,
        },
        generationStatus: {
            type: String,
            enum: ["queued", "generating", "review", "failed"],
            required: true,
            default: "review",
            index: true,
        },
        generationFailureReason: { type: String, trim: true },
        generatedBy: {
            type: String,
            enum: ["manual", "ai"],
            default: "manual",
        },
        generationPrompt: { type: String, trim: true },
        needsRegeneration: { type: Boolean, default: false, index: true },
        regenerationFeedback: { type: String, trim: true },
        lastRegeneratedAt: { type: Date },
        blueprintVersion: { type: Number, default: 1 },
        createdByClerkId: { type: String, required: true, index: true },
        updatedByClerkId: { type: String, index: true },
        archivedAt: { type: Date },
    },
    { timestamps: true },
);

TrainingPlanSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
TrainingPlanSchema.index({ workspaceId: 1, generationStatus: 1, updatedAt: -1 });
TrainingPlanSchema.index({ workspaceId: 1, sourceIds: 1, status: 1 });
TrainingPlanSchema.index({ workspaceId: 1, teamIds: 1, status: 1 });
TrainingPlanSchema.index({ workspaceId: 1, needsRegeneration: 1, updatedAt: -1 });

const TrainingPlan =
    models.TrainingPlan || model<ITrainingPlan>("TrainingPlan", TrainingPlanSchema);

export default TrainingPlan;
