import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/database/mongoose";
import UserProfile from "@/database/models/user-profile.model";
import WorkspaceMember from "@/database/models/workspace-member.model";
import { ACCEPTED_KNOWLEDGE_SOURCE_TYPES, MAX_KNOWLEDGE_SOURCE_SIZE } from "@/lib/constants";
import { isKnowledgeUploadPathOwnedBy } from "@/lib/knowledge/upload-path";

class UnauthorizedUploadError extends Error {
    constructor() {
        super("User is not authorized to upload knowledge sources.");
        this.name = "UnauthorizedUploadError";
    }
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as HandleUploadBody;

        const jsonResponse = await handleUpload({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                const { userId } = await auth();

                if (!userId) {
                    throw new UnauthorizedUploadError();
                }

                await connectToDatabase();

                const profile = await UserProfile.findOne({ clerkId: userId }).select("activeWorkspaceId").lean();
                if (!profile?.activeWorkspaceId) {
                    throw new UnauthorizedUploadError();
                }

                const membership = await WorkspaceMember.exists({
                    workspaceId: profile.activeWorkspaceId,
                    clerkId: userId,
                    status: "active",
                    role: { $in: ["owner", "admin", "trainer"] },
                });

                if (
                    !membership ||
                    !isKnowledgeUploadPathOwnedBy(pathname, profile.activeWorkspaceId.toString(), userId)
                ) {
                    throw new UnauthorizedUploadError();
                }

                return {
                    allowedContentTypes: ACCEPTED_KNOWLEDGE_SOURCE_TYPES,
                    addRandomSuffix: true,
                    maximumSizeInBytes: MAX_KNOWLEDGE_SOURCE_SIZE,
                    tokenPayload: JSON.stringify({
                        userId,
                        workspaceId: profile.activeWorkspaceId.toString(),
                    }),
                };
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        const status = error instanceof UnauthorizedUploadError ? 403 : 500;

        console.error("Knowledge upload error", error);

        return NextResponse.json(
            { error: status === 403 ? "Forbidden" : "Knowledge source upload failed" },
            { status },
        );
    }
}
