"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { archiveKnowledgeSource } from "@/lib/actions/knowledge.actions";

const KnowledgeSourceActions = ({
    sourceId,
    workspaceSlug,
    archived,
}: {
    sourceId: string;
    workspaceSlug: string;
    archived: boolean;
}) => {
    const router = useRouter();
    const [confirmingArchive, setConfirmingArchive] = useState(false);
    const [isPending, startTransition] = useTransition();

    const archiveSource = () => {
        startTransition(async () => {
            const result = await archiveKnowledgeSource(sourceId);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Source archived.");
            router.push(`/${workspaceSlug}/knowledge`);
            router.refresh();
        });
    };

    if (archived) return null;

    return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Source management</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Archive this source when it should no longer be used for new training. Existing audit history can stay intact.
            </p>

            {confirmingArchive ? (
                <div className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">Archive this source?</p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                        It will leave the active library and stop being used for new training generation.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={archiveSource}
                            disabled={isPending}
                            className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-40"
                        >
                            <Archive className="size-4" />
                            Archive source
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmingArchive(false)}
                            disabled={isPending}
                            className="inline-flex h-9 items-center rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setConfirmingArchive(true)}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-amber-300/70 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                >
                    <Archive className="size-4" />
                    Archive source
                </button>
            )}
        </div>
    );
};

export default KnowledgeSourceActions;
