# AI Provider Environment

Use these values to configure the Phase 1 AI layer.

```env
AI_BLUEPRINT_PROVIDER=openrouter
AI_BLUEPRINT_MODEL=google/gemma-4-31b-it:free
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

AI_VOICE_PROVIDER=groq
AI_VOICE_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=
GROQ_BASE_URL=https://api.groq.com/openai/v1

AI_EMBEDDING_PROVIDER=pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=revise
PINECONE_INDEX_HOST=https://revise-214he9f.svc.aped-4627-b74a.pinecone.io
PINECONE_NAMESPACE_PREFIX=revise
PINECONE_EMBEDDING_MODEL=llama-text-embed-v2

AI_BLUEPRINT_SYNC_CHUNK_LIMIT=80
AI_BLUEPRINT_CONTEXT_LIMIT=28
AI_CHUNK_TARGET_TOKENS=500
AI_CHUNK_OVERLAP_TOKENS=80
AI_PROVIDER_TIMEOUT_MS=45000
```

Create the Pinecone index with integrated embeddings using `llama-text-embed-v2` and map the embedded text field to `text`.
