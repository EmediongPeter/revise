import { get as getBlob } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getKnowledgeSourceDownloadRecord } from "@/lib/actions/knowledge.actions";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ sourceId: string }> },
) {
    const { sourceId } = await params;
    const sourceResult = await getKnowledgeSourceDownloadRecord(sourceId);

    if (!sourceResult.success) {
        const status = sourceResult.error.includes("sign in")
            ? 401
            : sourceResult.error.includes("access")
              ? 403
              : 404;
        return NextResponse.json(
            { error: sourceResult.error },
            { status },
        );
    }

    const source = sourceResult.data;
    if (!source.isPrivate) return NextResponse.redirect(source.fileUrl);

    const blob = await getBlob(source.fileBlobKey, { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
        return NextResponse.json({ error: "The original source file is unavailable." }, { status: 404 });
    }

    return new Response(blob.stream, {
        headers: {
            "Content-Type": blob.blob.contentType,
            "Content-Length": String(blob.blob.size),
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(source.fileName)}`,
            "Cache-Control": "private, no-store",
        },
    });
}
