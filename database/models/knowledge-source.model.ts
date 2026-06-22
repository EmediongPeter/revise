import { model, models, Schema } from "mongoose";
import { IKnowledgeSource } from "@/types";

const KnowledgeSourceSchema = new Schema<IKnowledgeSource>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        scope: {
            type: String,
            enum: ["workspace", "teams"],
            required: true,
            default: "workspace",
            index: true,
        },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        sourceType: {
            type: String,
            enum: [
                "sop",
                "handbook",
                "sales-script",
                "support-policy",
                "onboarding-guide",
                "compliance-policy",
                "knowledge-base",
                "other",
            ],
            required: true,
            default: "other",
            index: true,
        },
        origin: {
            type: String,
            enum: ["manual-upload", "google-drive", "notion", "sharepoint", "url", "api"],
            required: true,
            default: "manual-upload",
            index: true,
        },
        status: {
            type: String,
            enum: ["uploaded", "processing", "ready", "failed", "archived"],
            required: true,
            default: "uploaded",
            index: true,
        },
        fileName: { type: String, trim: true },
        fileUrl: { type: String, trim: true },
        fileBlobKey: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        fileSize: { type: Number },
        externalUrl: { type: String, trim: true },
        externalId: { type: String, trim: true },
        version: { type: Number, required: true, default: 1 },
        replacesSourceId: { type: Schema.Types.ObjectId, ref: "KnowledgeSource" },
        isCurrentVersion: { type: Boolean, required: true, default: true, index: true },
        failureReason: { type: String, trim: true },
        createdByClerkId: { type: String, required: true, index: true },
        updatedByClerkId: { type: String, index: true },
        archivedAt: { type: Date },
    },
    { timestamps: true },
);

KnowledgeSourceSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
KnowledgeSourceSchema.index({ workspaceId: 1, scope: 1, teamIds: 1 });
KnowledgeSourceSchema.index({ workspaceId: 1, title: 1, isCurrentVersion: 1 });
KnowledgeSourceSchema.index({ workspaceId: 1, externalId: 1, origin: 1 }, { sparse: true });

const KnowledgeSource =
    models.KnowledgeSource || model<IKnowledgeSource>("KnowledgeSource", KnowledgeSourceSchema);

export default KnowledgeSource;
