const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const getKnowledgeUploadPrefix = (workspaceId: string, userId: string) =>
    `knowledge/${sanitizePathSegment(workspaceId)}/${sanitizePathSegment(userId)}/`;

export const isKnowledgeUploadPathOwnedBy = (
    pathname: string,
    workspaceId: string,
    userId: string,
) => {
    let decodedPathname: string;

    try {
        decodedPathname = decodeURIComponent(pathname);
    } catch {
        return false;
    }

    const prefix = getKnowledgeUploadPrefix(workspaceId, userId);
    if (!decodedPathname.startsWith(prefix)) return false;

    const fileName = decodedPathname.slice(prefix.length);
    return fileName.length > 0 && !fileName.includes("/") && !fileName.includes("\\");
};
