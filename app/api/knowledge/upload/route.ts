import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";
import { ACCEPTED_KNOWLEDGE_SOURCE_TYPES, MAX_KNOWLEDGE_SOURCE_SIZE } from "@/lib/constants";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as HandleUploadBody;

        const jsonResponse = await handleUpload({
            token: process.env.bookified_READ_WRITE_TOKEN,
            body,
            request,
            onBeforeGenerateToken: async () => {
                const { userId } = await auth();

                if (!userId) {
                    throw new Error("Unauthorized: User not authenticated");
                }

                return {
                    allowedContentTypes: ACCEPTED_KNOWLEDGE_SOURCE_TYPES,
                    addRandomSuffix: true,
                    maximumSizeInBytes: MAX_KNOWLEDGE_SOURCE_SIZE,
                    tokenPayload: JSON.stringify({ userId }),
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.log("Knowledge source uploaded to blob:", blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        const status = message.includes("Unauthorized") ? 401 : 500;

        console.error("Knowledge upload error", error);

        return NextResponse.json(
            { error: status === 401 ? "Unauthorized" : "Knowledge source upload failed" },
            { status },
        );
    }
}
