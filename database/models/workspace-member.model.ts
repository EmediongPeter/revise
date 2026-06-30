import { deleteModel, model, models, Schema } from "mongoose";
import { IWorkspaceMember } from "@/types";

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        clerkId: { type: String, index: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        displayName: { type: String },
        role: {
            type: String,
            enum: ["owner", "admin", "trainer", "trainee", "member"],
            required: true,
            default: "member",
        },
        status: {
            type: String,
            enum: ["active", "invited", "removed"],
            required: true,
            default: "invited",
        },
        teamIds: [{ type: Schema.Types.ObjectId, ref: "Team", index: true }],
        invitedByClerkId: { type: String },
    },
    { timestamps: true },
);

WorkspaceMemberSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
WorkspaceMemberSchema.index({ workspaceId: 1, clerkId: 1 });
WorkspaceMemberSchema.index({ workspaceId: 1, teamIds: 1, status: 1 });

const cachedWorkspaceMember = models.WorkspaceMember;
const cachedRolePath = cachedWorkspaceMember?.schema.path("role") as unknown as { enumValues?: string[] } | undefined;

if (cachedWorkspaceMember && !cachedRolePath?.enumValues?.includes("trainee")) {
    deleteModel("WorkspaceMember");
}

const WorkspaceMember =
    models.WorkspaceMember || model<IWorkspaceMember>("WorkspaceMember", WorkspaceMemberSchema);

export default WorkspaceMember;
