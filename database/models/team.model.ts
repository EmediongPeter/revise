import { model, models, Schema } from "mongoose";
import { ITeam } from "@/types";

const TeamSchema = new Schema<ITeam>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        name: { type: String, required: true, trim: true },
        description: { type: String },
        createdByClerkId: { type: String, required: true },
        isDefault: { type: Boolean, required: true, default: false },
    },
    { timestamps: true },
);

TeamSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

const Team = models.Team || model<ITeam>("Team", TeamSchema);

export default Team;
