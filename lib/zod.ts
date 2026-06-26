import { z } from 'zod';
import {
    MAX_FILE_SIZE,
    ACCEPTED_PDF_TYPES,
    ACCEPTED_IMAGE_TYPES,
    MAX_IMAGE_SIZE,
    ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS,
    ACCEPTED_KNOWLEDGE_SOURCE_TYPES,
    MAX_KNOWLEDGE_SOURCE_FILES,
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
    files: z.array(z.instanceof(File, { message: "Source file is required" }))
        .min(1, "Upload at least one source file")
        .max(MAX_KNOWLEDGE_SOURCE_FILES, `Upload ${MAX_KNOWLEDGE_SOURCE_FILES} files or fewer at once`)
        .refine(
            (files) => files.every((file) => file.size <= MAX_KNOWLEDGE_SOURCE_SIZE),
            "Each file must be less than 25MB",
        )
        .refine(
            (files) => files.every(hasAcceptedKnowledgeSourceType),
            "Only PDF, TXT, and Markdown files are accepted",
        ),
}).refine((value) => value.scope === "workspace" || value.teamIds.length > 0, {
    message: "Select at least one team or choose entire workspace",
    path: ["teamIds"],
});

const blueprintListSchema = z.array(z.string().trim().min(1)).max(24).default([]);

export const TrainingBlueprintAISchema = z.object({
    title: z.string().trim().min(2).max(140),
    description: z.string().trim().max(500).optional(),
    objective: z.string().trim().min(10).max(800),
    keyTopics: blueprintListSchema,
    requiredKnowledge: blueprintListSchema,
    practiceScenarios: blueprintListSchema,
    commonMistakes: blueprintListSchema,
    assessmentQuestions: blueprintListSchema,
    rolePlayPrompts: blueprintListSchema,
    assessmentCriteria: blueprintListSchema,
    recommendedAssignments: blueprintListSchema,
    missingSections: blueprintListSchema,
    sourceReferenceNotes: z.string().trim().max(1200).optional(),
});
