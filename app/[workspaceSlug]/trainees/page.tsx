import { notFound, redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { listMyAssignedModules } from "@/lib/actions/practice.actions";
import { UsersRound } from "lucide-react";
import Link from "next/link";

const WorkspaceTraineesPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, onboardingStatus, assignedResult] = await Promise.all([
        params,
        getOnboardingStatus(),
        listMyAssignedModules(),
    ]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    const assignments = assignedResult.success ? assignedResult.data : [];

    return (
        <main className="wrapper container py-6">
            <header className="flex items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Trainees</p>
                    <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">My training</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                        Open assigned modules and continue AI-led practice sessions.
                    </p>
                </div>
                <UsersRound className="size-8 text-[#d97757]" />
            </header>

            <section className="mt-6 grid gap-3">
                {assignments.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-8 text-sm text-[var(--text-muted)]">
                        No assigned modules yet. When a trainer assigns practice, it will appear here.
                    </div>
                ) : (
                    assignments.map((assignment) => (
                        <Link
                            key={assignment.assignmentId}
                            href={`/${workspaceSlug}/practice/${assignment.assignmentId}`}
                            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 transition hover:bg-[var(--surface-hover)]"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <span>
                                    <span className="block text-base font-semibold text-[var(--text-primary)]">{assignment.moduleTitle}</span>
                                    <span className="mt-1 block text-sm leading-6 text-[var(--text-muted)]">{assignment.moduleDescription || "AI-led practice module"}</span>
                                </span>
                                <span className="rounded-full bg-[#fff2ec] px-3 py-1 text-xs font-semibold capitalize text-[#b85f42]">
                                    {assignment.status.replace("_", " ")}
                                </span>
                            </div>
                            <div className="mt-4 h-2 rounded-full bg-[var(--border-subtle)]">
                                <div className="h-full rounded-full bg-[#d97757]" style={{ width: `${assignment.progressPercent}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-[var(--text-muted)]">
                                {assignment.completedScenarioCount}/{assignment.totalScenarioCount} scenarios complete
                            </p>
                        </Link>
                    ))
                )}
            </section>
        </main>
    );
};

export default WorkspaceTraineesPage;
