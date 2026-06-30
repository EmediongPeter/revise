import { deleteModel, model, models, Schema } from "mongoose";
import { IPracticeSession } from "@/types";

const PracticeSessionMessageSchema = new Schema(
    {
        role: { type: String, enum: ["assistant", "user", "system"], required: true },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, required: true, default: Date.now },
        scenarioIndex: { type: Number },
        action: {
            type: String,
            enum: ["opening", "probe", "challenge", "coach", "remediate", "advance", "complete"],
        },
    },
    { _id: false },
);

const PracticeSessionScenarioCheckpointSchema = new Schema(
    {
        scenarioId: { type: Schema.Types.ObjectId, ref: "PracticeScenario", required: true },
        title: { type: String, required: true, trim: true },
        status: { type: String, enum: ["pending", "active", "completed"], required: true, default: "pending" },
        score: { type: Number },
        notes: { type: String, trim: true },
        turnCount: { type: Number, required: true, default: 0 },
        hintCount: { type: Number, required: true, default: 0 },
        criterionAssessments: [{
            _id: false,
            criterion: { type: String, required: true, trim: true },
            score: { type: Number, required: true, min: 0, max: 100 },
            met: { type: Boolean, required: true },
            evidence: { type: String, trim: true },
        }],
        misconceptions: [{ type: String, trim: true }],
        strengths: [{ type: String, trim: true }],
        gaps: [{ type: String, trim: true }],
        evidenceRefs: [{
            _id: false,
            sourceId: { type: String, required: true },
            sourceTitle: { type: String, required: true },
            chunkId: { type: String, required: true },
            chunkIndex: { type: Number, required: true },
            pageNumber: { type: Number },
        }],
        lastAction: {
            type: String,
            enum: ["opening", "probe", "challenge", "coach", "remediate", "advance", "complete"],
        },
    },
    { _id: false },
);

const PracticeSessionSchema = new Schema<IPracticeSession>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        assignmentId: { type: Schema.Types.ObjectId, ref: "ModuleAssignment", required: true, index: true },
        trainingPlanId: { type: Schema.Types.ObjectId, ref: "TrainingPlan", required: true, index: true },
        traineeMemberId: { type: Schema.Types.ObjectId, ref: "WorkspaceMember", required: true, index: true },
        status: {
            type: String,
            enum: ["active", "completed", "needs_review", "cancelled"],
            required: true,
            default: "active",
            index: true,
        },
        stage: {
            type: String,
            enum: ["opening", "scenario", "probe", "coach", "complete"],
            required: true,
            default: "opening",
        },
        currentScenarioIndex: { type: Number, required: true, default: 0 },
        scenarioCheckpoints: [PracticeSessionScenarioCheckpointSchema],
        messages: [PracticeSessionMessageSchema],
        score: { type: Number },
        strengths: [{ type: String, trim: true }],
        gaps: [{ type: String, trim: true }],
        managerNotes: { type: String, trim: true },
        startedAt: { type: Date, required: true, default: Date.now },
        expiresAt: { type: Date, required: true },
        durationSeconds: { type: Number, min: 0 },
        completedAt: { type: Date },
        completionReason: {
            type: String,
            enum: ["scenarios_complete", "time_expired", "trainee_ended"],
        },
    },
    { timestamps: true },
);

PracticeSessionSchema.index({ workspaceId: 1, assignmentId: 1, updatedAt: -1 });
PracticeSessionSchema.index({ workspaceId: 1, traineeMemberId: 1, status: 1 });

const cachedPracticeSession = models.PracticeSession;

if (cachedPracticeSession && !cachedPracticeSession.schema.path("expiresAt")) {
    deleteModel("PracticeSession");
}

const PracticeSession =
    models.PracticeSession || model<IPracticeSession>("PracticeSession", PracticeSessionSchema);

export default PracticeSession;
