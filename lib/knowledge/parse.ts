import { splitKnowledgeText, type ParsedKnowledgeChunk } from "@/lib/knowledge/chunk";
import { PDFParse } from "pdf-parse";

export type ParsedKnowledgeSource = {
    chunks: ParsedKnowledgeChunk[];
    characterCount: number;
    wordCount: number;
};

const supportedTextTypes = new Set(["text/plain", "text/markdown"]);

const getWordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const parsePdf = async (file: File): Promise<ParsedKnowledgeSource> => {
    const buffer = await file.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    try {
        const result = await parser.getText();
        const pageBlocks = result.pages.map((page, index) => ({
            text: page.text,
            pageNumber: index + 1,
        }));
        const fullText = result.text || pageBlocks.map((block) => block.text).join("\n");

        return {
            chunks: splitKnowledgeText(pageBlocks),
            characterCount: fullText.length,
            wordCount: getWordCount(fullText),
        };
    } finally {
        await parser.destroy();
    }
};

const parseText = async (file: File): Promise<ParsedKnowledgeSource> => {
    const text = await file.text();

    return {
        chunks: splitKnowledgeText([{ text }]),
        characterCount: text.length,
        wordCount: getWordCount(text),
    };
};

export const parseKnowledgeFile = async (file: File): Promise<ParsedKnowledgeSource> => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        return parsePdf(file);
    }

    if (
        supportedTextTypes.has(file.type) ||
        file.name.toLowerCase().endsWith(".txt") ||
        file.name.toLowerCase().endsWith(".md") ||
        file.name.toLowerCase().endsWith(".markdown")
    ) {
        return parseText(file);
    }

    throw new Error("Unsupported source file type.");
};
