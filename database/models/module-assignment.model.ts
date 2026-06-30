import { deleteModel, model, models, Schema } from "mongoose";
import { IModuleAssignment } from "@/types";

const ModuleAssignmentSchema = new Schema<IModuleAssignment>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        trainingPlanId: { type: Schema.Types.ObjectId, ref: "TrainingPlan", required: true, index: true },
        assignedToMemberId: { type: Schema.Types.ObjectId, ref: "WorkspaceMember", index: true },
        assignedToTeamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
        inviteEmail: { type: String, lowercase: true, trim: true, index: true },
        inviteToken: { type: String, required: true, unique: true, index: true },
        status: {
            type: String,
            enum: ["invited", "assigned", "in_progress", "completed", "cancelled"],
            required: true,
            default: "invited",
            index: true,
        },
        required: { type: Boolean, required: true, default: true },
        dueDate: { type: Date },
        guidanceOverride: { type: String, trim: true },
        sessionDurationMinutes: { type: Number, required: true, default: 15, min: 5, max: 60 },
        progressPercent: { type: Number, required: true, default: 0 },
        completedScenarioCount: { type: Number, required: true, default: 0 },
        totalScenarioCount: { type: Number, required: true, default: 0 },
        acceptedAt: { type: Date },
        completedAt: { type: Date },
        createdByClerkId: { type: String, required: true, index: true },
        updatedByClerkId: { type: String, index: true },
    },
    { timestamps: true },
);

ModuleAssignmentSchema.index({ workspaceId: 1, trainingPlanId: 1, status: 1 });
ModuleAssignmentSchema.index({ workspaceId: 1, assignedToMemberId: 1, status: 1 });
ModuleAssignmentSchema.index({ workspaceId: 1, assignedToTeamId: 1, status: 1 });

const cachedModuleAssignment = models.ModuleAssignment;

if (cachedModuleAssignment && !cachedModuleAssignment.schema.path("sessionDurationMinutes")) {
    deleteModel("ModuleAssignment");
}

const ModuleAssignment =
    models.ModuleAssignment || model<IModuleAssignment>("ModuleAssignment", ModuleAssignmentSchema);

export default ModuleAssignment;
