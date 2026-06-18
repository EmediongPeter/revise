import { model, models, Schema } from "mongoose";
import { IUserProfile } from "@/types";

const UserProfileSchema = new Schema<IUserProfile>(
    {
        clerkId: { type: String, required: true, unique: true, index: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        firstName: { type: String },
        lastName: { type: String },
        displayName: { type: String, required: true },
        imageUrl: { type: String },
        role: { type: String },
        onboardingCompleted: { type: Boolean, required: true, default: false, index: true },
        activeWorkspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
    },
    { timestamps: true },
);

const UserProfile = models.UserProfile || model<IUserProfile>("UserProfile", UserProfileSchema);

export default UserProfile;
