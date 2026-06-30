import { model, models, Schema } from "mongoose";
import { IPracticeScenario } from "@/types";

const PracticeScenarioSchema = new Schema<IPracticeScenario>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        trainingPlanId: { type: Schema.Types.ObjectId, ref: "TrainingPlan", required: true, index: true },
        moduleId: { type: Schema.Types.ObjectId, ref: "TrainingModule", index: true },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        sourceIds: [{ type: Schema.Types.ObjectId, ref: "KnowledgeSource", index: true }],
        title: { type: String, required: true, trim: true },
        situation: { type: String, required: true, trim: true },
        traineePrompt: { type: String, required: true, trim: true },
        idealOutcome: { type: String, trim: true },
        evaluationRubric: [{ type: String, trim: true }],
        status: {
            type: String,
            enum: ["draft", "ready", "archived"],
            required: true,
            default: "draft",
            index: true,
        },
        sortOrder: { type: Number, required: true, default: 0 },
        createdByClerkId: { type: String, required: true, index: true },
        updatedByClerkId: { type: String, index: true },
        archivedAt: { type: Date },
    },
    { timestamps: true },
);

PracticeScenarioSchema.index({ trainingPlanId: 1, sortOrder: 1 });
PracticeScenarioSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
PracticeScenarioSchema.index({ workspaceId: 1, teamIds: 1, status: 1 });

const PracticeScenario =
    models.PracticeScenario || model<IPracticeScenario>("PracticeScenario", PracticeScenarioSchema);

export default PracticeScenario;
