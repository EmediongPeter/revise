import { z } from 'zod';
import {
    MAX_FILE_SIZE,
    ACCEPTED_PDF_TYPES,
    ACCEPTED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS,
    ACCEPTED_KNOWLEDGE_SOURCE_TYPES,
    MAX_KNOWLEDGE_SOURCE_SIZE,
} from './constants';

const hasAcceptedKnowledgeSourceType = (file: File) => {
    if (ACCEPTED_KNOWLEDGE_SOURCE_TYPES.includes(file.type)) return true;

    const fileName = file.name.toLowerCase();
    return ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
};

export const UploadSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title is too long"),
    author: z.string().min(1, "Author name is required").max(100, "Author name is too long"),
    persona: z.string().min(1, "Please select a voice"),
    pdfFile: z.instanceof(File, { message: "PDF file is required" })
        .refine((file) => file.size <= MAX_FILE_SIZE, "File size must be less than 50MB")
        .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), "Only PDF files are accepted"),
    coverImage: z.instanceof(File).optional()
        .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, "Image size must be less than 10MB")
        .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), "Only .jpg, .jpeg, .png and .webp formats are supported"),
});

export const KnowledgeSourceUploadSchema = z.object({
    title: z.string().min(2, "Source title is required").max(120, "Source title is too long"),
    description: z.string().max(500, "Description is too long").optional(),
    sourceType: z.enum([
        "sop",
        "handbook",
        "sales-script",
        "support-policy",
        "onboarding-guide",
        "compliance-policy",
        "knowledge-base",
        "other",
    ]),
    scope: z.enum(["workspace", "teams"]),
    teamIds: z.array(z.string()),
    file: z.instanceof(File, { message: "Source file is required" })
        .refine((file) => file.size <= MAX_KNOWLEDGE_SOURCE_SIZE, "File size must be less than 25MB")
        .refine(hasAcceptedKnowledgeSourceType, "Only PDF, TXT, and Markdown files are accepted"),
}).refine((value) => value.scope === "workspace" || value.teamIds.length > 0, {
    message: "Select at least one team or choose entire workspace",
    path: ["teamIds"],
});
