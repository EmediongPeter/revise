import { model, models, Schema } from "mongoose";
import { IWorkspace } from "@/types";

const WorkspaceSchema = new Schema<IWorkspace>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        avatarSeed: { type: String, trim: true },
        industry: { type: String, required: true },
        ownerClerkId: { type: String, required: true, index: true },
        createdByClerkId: { type: String, required: true },
        trainingGoals: [{ type: String }],
        googleDriveConnected: { type: Boolean, required: true, default: false },
        uploadedSourceName: { type: String },
    },
    { timestamps: true },
);

const Workspace = models.Workspace || model<IWorkspace>("Workspace", WorkspaceSchema);

export default Workspace;
