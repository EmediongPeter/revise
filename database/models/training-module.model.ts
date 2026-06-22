import { model, models, Schema } from "mongoose";
import { ITrainingModule } from "@/types";

const TrainingModuleSchema = new Schema<ITrainingModule>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        sourceIds: [{ type: Schema.Types.ObjectId, ref: "KnowledgeSource", index: true }],
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        objective: { type: String, trim: true },
        difficulty: {
            type: String,
            enum: ["intro", "standard", "advanced"],
            required: true,
            default: "standard",
            index: true,
        },
        status: {
            type: String,
            enum: ["draft", "ready", "archived"],
            required: true,
            default: "draft",
            index: true,
        },
        estimatedMinutes: { type: Number },
        createdByClerkId: { type: String, required: true, index: true },
        updatedByClerkId: { type: String, index: true },
        archivedAt: { type: Date },
    },
    { timestamps: true },
);

TrainingModuleSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
TrainingModuleSchema.index({ workspaceId: 1, teamIds: 1, status: 1 });
TrainingModuleSchema.index({ workspaceId: 1, title: 1 });

const TrainingModule =
    models.TrainingModule || model<ITrainingModule>("TrainingModule", TrainingModuleSchema);

export default TrainingModule;
