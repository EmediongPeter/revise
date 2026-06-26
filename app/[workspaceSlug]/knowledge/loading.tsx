const WorkspaceKnowledgeLoading = () => (
    <main className="wrapper container">
        <section className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="relative size-10">
                    <div className="absolute inset-0 rounded-full bg-[var(--text-muted)]/20" />
                    <div className="absolute inset-2 animate-pulse rounded-full bg-[var(--text-muted)]/45" />
                    <div className="absolute inset-0 rotate-45 overflow-hidden rounded-full">
                        <div className="h-full w-1/2 bg-[var(--surface-elevated)]/80" />
                    </div>
                </div>
            </div>
        </section>
    </main>
);

export default WorkspaceKnowledgeLoading;
