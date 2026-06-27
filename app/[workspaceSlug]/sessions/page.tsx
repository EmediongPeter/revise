import { listPracticeSessions } from "@/lib/actions/practice.actions";
import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { assertWorkspacePageAccess } from "@/lib/workspace/page-access";

const WorkspaceSessionsPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, sessionResult] = await Promise.all([
        assertWorkspacePageAccess(params),
        listPracticeSessions(),
    ]);

    const sessions = sessionResult.success ? sessionResult.data : [];

    return (
        <main className="wrapper container py-6">
            <header className="flex items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Practice sessions</p>
                    <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Practice history</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                        Review assigned module practice, transcript status, progress, and readiness signals.
                    </p>
                </div>
                <MessageSquareText className="size-8 text-[#d97757]" />
            </header>

            <section className="mt-6 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                {sessions.length === 0 ? (
                    <div className="p-8 text-sm text-[var(--text-muted)]">No assigned practice sessions yet.</div>
                ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                        {sessions.map((session) => (
                            <Link
                                key={session.assignmentId}
                                href={session.reviewable
                                    ? `/${workspaceSlug}/sessions/${session.assignmentId}`
                                    : `/${workspaceSlug}/practice/${session.assignmentId}`}
                                className="grid gap-3 px-5 py-4 transition hover:bg-[var(--surface-hover)] md:grid-cols-[1fr_180px_120px_120px]"
                            >
                                <span>
                                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{session.moduleTitle}</span>
                                    <span className="mt-1 block text-xs text-[var(--text-muted)]">{session.traineeLabel}</span>
                                </span>
                                <span className="text-sm capitalize text-[var(--text-secondary)]">{session.status.replace("_", " ")}</span>
                                <span className="text-sm text-[var(--text-muted)]">{session.progressPercent}% complete</span>
                                <span className="text-sm text-[var(--text-muted)]">{session.score ? `${session.score}%` : "-"}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
};

export default WorkspaceSessionsPage;
