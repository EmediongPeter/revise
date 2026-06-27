"use client";

import { useSyncExternalStore } from "react";
import { RotateCw, WifiOff } from "lucide-react";

const KnowledgeSourceWorkspaceState = () => {
    const online = useSyncExternalStore(
        (onStoreChange) => {
            window.addEventListener("online", onStoreChange);
            window.addEventListener("offline", onStoreChange);
            return () => {
                window.removeEventListener("online", onStoreChange);
                window.removeEventListener("offline", onStoreChange);
            };
        },
        () => navigator.onLine,
        () => true,
    );

    if (online) return null;

    return (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm shadow-[var(--shadow-soft-sm)]">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text-primary)]">Network error</p>
                <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">
                    Revise cannot reach the server right now. You can keep reviewing what is visible, then reload when your connection returns.
                </p>
            </div>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
                <RotateCw className="size-3.5" />
                Reload
            </button>
        </div>
    );
};

export default KnowledgeSourceWorkspaceState;
