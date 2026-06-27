import "server-only";

export const AI_BLUEPRINT_PROVIDER = process.env.AI_BLUEPRINT_PROVIDER || "gemini";
export const AI_BLUEPRINT_FALLBACK_PROVIDER = process.env.AI_BLUEPRINT_FALLBACK_PROVIDER || "openrouter";
export const AI_BLUEPRINT_MODEL = process.env.AI_BLUEPRINT_MODEL || "gemini-2.5-flash";
export const GEMINI_BLUEPRINT_MODEL = process.env.GEMINI_BLUEPRINT_MODEL || AI_BLUEPRINT_MODEL;
export const GEMINI_PRACTICE_MODEL = process.env.GEMINI_PRACTICE_MODEL || "gemini-2.5-flash";
export const OPENROUTER_BLUEPRINT_MODEL =
    process.env.OPENROUTER_BLUEPRINT_MODEL ||
    process.env.AI_BLUEPRINT_FALLBACK_MODEL ||
    "qwen/qwen3.6-plus";
export const AI_VOICE_PROVIDER = process.env.AI_VOICE_PROVIDER || "groq";
export const AI_VOICE_MODEL = process.env.AI_VOICE_MODEL || "llama-3.3-70b-versatile";
export const AI_EMBEDDING_PROVIDER = process.env.AI_EMBEDDING_PROVIDER || "pinecone";
export const PINECONE_EMBEDDING_MODEL = process.env.PINECONE_EMBEDDING_MODEL || "llama-text-embed-v2";
export const PINECONE_NAMESPACE_PREFIX = process.env.PINECONE_NAMESPACE_PREFIX || "revise";
export const AI_BLUEPRINT_CONTEXT_LIMIT = Number(process.env.AI_BLUEPRINT_CONTEXT_LIMIT || 28);
export const AI_BLUEPRINT_RETRIEVAL_MODE = process.env.AI_BLUEPRINT_RETRIEVAL_MODE || "legacy";
export const AI_BLUEPRINT_MAX_OUTPUT_TOKENS = Number(process.env.AI_BLUEPRINT_MAX_OUTPUT_TOKENS || 4096);
export const AI_CHUNK_TARGET_TOKENS = Number(process.env.AI_CHUNK_TARGET_TOKENS || 500);
export const AI_CHUNK_OVERLAP_TOKENS = Number(process.env.AI_CHUNK_OVERLAP_TOKENS || 80);
export const AI_PROVIDER_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 45000);
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
export const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
export const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

export const requireOpenRouterConfig = () => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    return {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: OPENROUTER_BASE_URL,
        model: OPENROUTER_BLUEPRINT_MODEL,
    };
};

export const requireGeminiConfig = () => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    return {
        apiKey: process.env.GEMINI_API_KEY,
        baseUrl: GEMINI_BASE_URL,
        model: GEMINI_BLUEPRINT_MODEL,
    };
};

export const requireGeminiPracticeConfig = () => {
    const config = requireGeminiConfig();

    return {
        ...config,
        model: GEMINI_PRACTICE_MODEL,
    };
};

export const requireGroqConfig = () => {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured.");
    }

    return {
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: GROQ_BASE_URL,
        model: AI_VOICE_MODEL,
    };
};

export const requirePineconeConfig = () => {
    if (!process.env.PINECONE_API_KEY) {
        throw new Error("PINECONE_API_KEY is not configured.");
    }

    if (!process.env.PINECONE_INDEX_NAME) {
        throw new Error("PINECONE_INDEX_NAME is not configured.");
    }

    return {
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
        indexHost: process.env.PINECONE_INDEX_HOST,
        embeddingModel: PINECONE_EMBEDDING_MODEL,
    };
};

export const getPineconeNamespace = (workspaceId: string) =>
    `${PINECONE_NAMESPACE_PREFIX}-${workspaceId}`;
