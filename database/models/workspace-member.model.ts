import { model, models, Schema } from "mongoose";
import { IWorkspaceMember } from "@/types";

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        clerkId: { type: String, index: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        displayName: { type: String },
        role: {
            type: String,
            enum: ["owner", "admin", "trainer", "member"],
            required: true,
            default: "member",
        },
        status: {
            type: String,
            enum: ["active", "invited", "removed"],
            required: true,
            default: "invited",
        },
        invitedByClerkId: { type: String },
    },
    { timestamps: true },
);

WorkspaceMemberSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
WorkspaceMemberSchema.index({ workspaceId: 1, clerkId: 1 });

const WorkspaceMember =
    models.WorkspaceMember || model<IWorkspaceMember>("WorkspaceMember", WorkspaceMemberSchema);

export default WorkspaceMember;
