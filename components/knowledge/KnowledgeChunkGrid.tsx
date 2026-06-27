"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";
import type { KnowledgeChunkPreview } from "@/lib/actions/knowledge.actions";

const KnowledgeChunkGrid = ({ chunks }: { chunks: KnowledgeChunkPreview[] }) => {
    const [activeChunk, setActiveChunk] = useState<KnowledgeChunkPreview | null>(null);

    useEffect(() => {
        if (!activeChunk) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setActiveChunk(null);
        };

        document.addEventListener("keydown", closeOnEscape);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.body.style.overflow = "";
        };
    }, [activeChunk]);

    if (chunks.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)] p-6 text-sm text-[var(--text-muted)]">
                No readable chunks are available yet. If this source is still processing, check back shortly.
            </div>
        );
    }

    return (
        <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {chunks.map((chunk) => (
                    <button
                        key={chunk._id}
                        type="button"
                        onClick={() => setActiveChunk(chunk)}
                        className="group min-h-44 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#d97757]/60 hover:bg-[var(--surface-hover)] hover:shadow-[var(--shadow-soft-sm)]"
                    >
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-xs font-bold text-[var(--text-primary)]">
                                    {chunk.chunkIndex + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">Chunk {chunk.chunkIndex + 1}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {chunk.pageNumber ? `Page ${chunk.pageNumber} · ` : ""}
                                        {chunk.wordCount} words
                                    </p>
                                </div>
                            </div>
                            <FileText className="size-4 text-[var(--text-muted)] transition group-hover:text-[#d97757]" />
                        </div>
                        <p className="line-clamp-5 text-sm leading-6 text-[var(--text-secondary)]">{chunk.content}</p>
                        <span className="mt-3 inline-flex rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                            Embedding {chunk.embeddingStatus}
                        </span>
                    </button>
                ))}
            </div>

            {activeChunk && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Chunk ${activeChunk.chunkIndex + 1}`}
                    onMouseDown={() => setActiveChunk(null)}
                >
                    <div
                        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-lg)]"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5">
                            <div>
                                <p className="text-lg font-semibold text-[var(--text-primary)]">Chunk {activeChunk.chunkIndex + 1}</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    {activeChunk.pageNumber ? `Page ${activeChunk.pageNumber} · ` : ""}
                                    {activeChunk.wordCount} words · Embedding {activeChunk.embeddingStatus}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveChunk(null)}
                                className="flex size-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                aria-label="Close chunk preview"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-5">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                                {activeChunk.content}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default KnowledgeChunkGrid;
