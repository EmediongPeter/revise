import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileText, MessageSquareText, XCircle } from "lucide-react";
import { getPracticeSessionReview } from "@/lib/actions/practice.actions";

const formatDuration = (seconds?: number) => {
    if (typeof seconds !== "number") return "-";
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}m ${remainder}s`;
};

const PracticeSessionReviewPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string; assignmentId: string }>;
}) => {
    const { workspaceSlug, assignmentId } = await params;
    const result = await getPracticeSessionReview(assignmentId);

    if (!result.success || result.data.workspaceSlug !== workspaceSlug) notFound();

    const review = result.data;

    return (
        <main className="wrapper container py-6">
            <header className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--border-subtle)] pb-5">
                <div className="flex min-w-0 items-start gap-3">
                    <Link
                        href={`/${workspaceSlug}/sessions`}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]"
                    >
                        <ArrowLeft className="size-4" />
                        <span className="sr-only">Back to sessions</span>
                    </Link>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Session review</p>
                        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{review.moduleTitle}</h1>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{review.traineeLabel}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold capitalize text-[var(--text-secondary)]">
                        {review.status.replace("_", " ")}
                    </span>
                    <span className="rounded-full bg-[#fff2ec] px-3 py-1.5 text-xs font-semibold text-[#b85f42]">
                        {typeof review.score === "number" ? `${review.score}%` : "Not scored"}
                    </span>
                </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Progress</p>
                    <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{review.progressPercent}%</p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Duration</p>
                    <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
                        <Clock3 className="size-4 text-[var(--text-muted)]" />
                        {formatDuration(review.durationSeconds)}
                    </p>
                </div>
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                    <p className="text-xs text-[var(--text-muted)]">Outcome</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-[var(--text-primary)]">
                        {review.completionReason?.replace("_", " ") || "In progress"}
                    </p>
                </div>
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">Scenario assessment</h2>
                    <div className="mt-3 space-y-3">
                        {review.checkpoints.map((checkpoint, index) => (
                            <article key={`${checkpoint.title}-${index}`} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--text-muted)]">Scenario {index + 1}</p>
                                        <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{checkpoint.title}</h3>
                                    </div>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                        {typeof checkpoint.score === "number" ? `${checkpoint.score}%` : "-"}
                                    </span>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {checkpoint.criteria.map((criterion) => (
                                        <div key={criterion.criterion} className="grid gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2.5 sm:grid-cols-[20px_minmax(0,1fr)_48px]">
                                            {criterion.met
                                                ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                                                : <XCircle className="mt-0.5 size-4 text-amber-600" />}
                                            <span>
                                                <span className="block text-sm font-medium text-[var(--text-primary)]">{criterion.criterion}</span>
                                                {criterion.evidence && <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{criterion.evidence}</span>}
                                            </span>
                                            <span className="text-right text-sm font-semibold text-[var(--text-secondary)]">{criterion.score}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
                                    <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1">
                                        {checkpoint.turnCount} {checkpoint.turnCount === 1 ? "turn" : "turns"}
                                    </span>
                                    <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1">
                                        {checkpoint.hintCount} {checkpoint.hintCount === 1 ? "hint" : "hints"}
                                    </span>
                                </div>
                                {checkpoint.misconceptions.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-xs font-semibold text-amber-900">Misconceptions</p>
                                        <p className="mt-1 text-sm leading-6 text-amber-900">{checkpoint.misconceptions.join("; ")}</p>
                                    </div>
                                )}
                                {checkpoint.evidenceRefs.length > 0 && (
                                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
                                        <FileText className="mt-0.5 size-3.5 shrink-0" />
                                        {checkpoint.evidenceRefs.map((reference) =>
                                            `${reference.sourceTitle}${reference.pageNumber ? ` p.${reference.pageNumber}` : ""} chunk ${reference.chunkIndex}`,
                                        ).join("; ")}
                                    </p>
                                )}
                            </article>
                        ))}
                        {review.checkpoints.length === 0 && (
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 text-sm text-[var(--text-muted)]">
                                This assignment has not started.
                            </div>
                        )}
                    </div>
                </section>

                <aside className="space-y-4">
                    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Readiness signals</h2>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Strengths</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{review.strengths.join("; ") || "No strengths recorded yet."}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Gaps</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{review.gaps.join("; ") || "No gaps recorded yet."}</p>
                        {review.managerNotes && <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-sm leading-6 text-[var(--text-secondary)]">{review.managerNotes}</p>}
                    </section>

                    <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            <MessageSquareText className="size-4" />
                            Transcript
                        </h2>
                        <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                            {review.messages.map((message, index) => (
                                <div key={`${message.createdAt}-${index}`} className="rounded-lg bg-[var(--bg-secondary)] p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                        {message.role === "assistant" ? "AI trainer" : "Trainee"}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">{message.content}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </main>
    );
};

export default PracticeSessionReviewPage;
