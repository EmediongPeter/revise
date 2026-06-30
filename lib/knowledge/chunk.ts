import { AI_CHUNK_OVERLAP_TOKENS, AI_CHUNK_TARGET_TOKENS } from "@/lib/ai/config";

export type ParsedKnowledgeChunk = {
    content: string;
    chunkIndex: number;
    pageNumber?: number;
    sectionTitle?: string;
    wordCount: number;
};

type TextBlock = {
    text: string;
    pageNumber?: number;
    sectionTitle?: string;
};

const normalizeText = (value: string) =>
    value
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const getWordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const tokenTargetToWordTarget = (tokens: number) =>
    Number.isFinite(tokens) && tokens > 0 ? Math.max(120, Math.floor(tokens * 0.75)) : 375;
const tokenOverlapToWordOverlap = (tokens: number) =>
    Number.isFinite(tokens) && tokens === 0
        ? 0
        : Number.isFinite(tokens) && tokens > 0
          ? Math.max(20, Math.floor(tokens * 0.75))
          : 60;

export const splitKnowledgeText = (
    blocks: TextBlock[],
    chunkSize = tokenTargetToWordTarget(AI_CHUNK_TARGET_TOKENS),
    overlapSize = tokenOverlapToWordOverlap(AI_CHUNK_OVERLAP_TOKENS),
): ParsedKnowledgeChunk[] => {
    if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
        throw new Error("chunkSize must be a finite number greater than 0");
    }
    if (!Number.isFinite(overlapSize) || overlapSize < 0 || overlapSize >= chunkSize) {
        throw new Error("overlapSize must be >= 0 and less than chunkSize");
    }

    const chunks: ParsedKnowledgeChunk[] = [];

    blocks.forEach((block) => {
        const normalized = normalizeText(block.text);
        if (!normalized) return;

        const words = normalized.split(/\s+/).filter(Boolean);
        let startIndex = 0;

        while (startIndex < words.length) {
            const endIndex = Math.min(startIndex + chunkSize, words.length);
            const content = words.slice(startIndex, endIndex).join(" ");

            chunks.push({
                content,
                chunkIndex: chunks.length,
                pageNumber: block.pageNumber,
                sectionTitle: block.sectionTitle,
                wordCount: getWordCount(content),
            });

            if (endIndex >= words.length) break;
            startIndex = endIndex - overlapSize;
        }
    });

    return chunks;
};
