import { Sparkles } from "lucide-react";

const FullPageLoader = ({ label = "Preparing workspace" }: { label?: string }) => {
    return (
        <main className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="flex flex-col items-center text-center">
                <div className="relative flex size-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-sm)]">
                    <Sparkles className="size-5 text-[var(--text-primary)]" />
                    <span className="absolute inset-0 rounded-2xl border border-[#d97757]/40 opacity-0 animate-ping" />
                </div>
                <p className="mt-5 text-sm font-semibold text-[var(--text-primary)]">
                    {label}
                    <span className="inline-block w-6 animate-pulse text-left">...</span>
                </p>
            </div>
        </main>
    );
};

export default FullPageLoader;
