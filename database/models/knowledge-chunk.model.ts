import { model, models, Schema } from "mongoose";
import { IKnowledgeChunk } from "@/types";

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        sourceId: { type: Schema.Types.ObjectId, ref: "KnowledgeSource", required: true, index: true },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        scope: {
            type: String,
            enum: ["workspace", "teams"],
            required: true,
            default: "workspace",
            index: true,
        },
        content: { type: String, required: true },
        chunkIndex: { type: Number, required: true, index: true },
        pageNumber: { type: Number, index: true },
        sectionTitle: { type: String, trim: true },
        wordCount: { type: Number, required: true },
        tokenCount: { type: Number },
        sourceVersion: { type: Number, required: true, default: 1 },
        embeddingStatus: {
            type: String,
            enum: ["pending", "embedded", "failed"],
            required: true,
            default: "pending",
            index: true,
        },
        embeddingModel: { type: String, trim: true },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true },
);

KnowledgeChunkSchema.index({ sourceId: 1, chunkIndex: 1 }, { unique: true });
KnowledgeChunkSchema.index({ workspaceId: 1, sourceId: 1, pageNumber: 1 });
KnowledgeChunkSchema.index({ workspaceId: 1, scope: 1, teamIds: 1 });
KnowledgeChunkSchema.index({ workspaceId: 1, embeddingStatus: 1 });
KnowledgeChunkSchema.index({ workspaceId: 1, content: "text" });

const KnowledgeChunk =
    models.KnowledgeChunk || model<IKnowledgeChunk>("KnowledgeChunk", KnowledgeChunkSchema);

export default KnowledgeChunk;
