import { splitKnowledgeText, type ParsedKnowledgeChunk } from "@/lib/knowledge/chunk";

export type ParsedKnowledgeSource = {
    chunks: ParsedKnowledgeChunk[];
    characterCount: number;
    wordCount: number;
};

const supportedTextTypes = new Set(["text/plain", "text/markdown"]);

const getWordCount = (value: string) => value.split(/\s+/).filter(Boolean).length;

const parsePdf = async (file: File): Promise<ParsedKnowledgeSource> => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const buffer = await file.arrayBuffer();
    const document = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageBlocks: { text: string; pageNumber: number }[] = [];

    try {
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
            const page = await document.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const text = textContent.items
                .map((item) => ("str" in item ? item.str : ""))
                .filter(Boolean)
                .join(" ");

            pageBlocks.push({ text, pageNumber });
        }
    } finally {
        await document.destroy();
    }

    const fullText = pageBlocks.map((block) => block.text).join("\n");

    return {
        chunks: splitKnowledgeText(pageBlocks),
        characterCount: fullText.length,
        wordCount: getWordCount(fullText),
    };
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
