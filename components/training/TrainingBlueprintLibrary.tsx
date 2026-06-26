import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenCheck, ClipboardCheck } from "lucide-react";
import CreateBlueprintModal from "@/components/training/CreateBlueprintModal";
import TrainingBlueprintActions from "@/components/training/TrainingBlueprintActions";
import { listKnowledgeSources } from "@/lib/actions/knowledge.actions";
import { listTrainingPlans } from "@/lib/actions/training.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

const statusLabels = {
    draft: "Draft",
    review: "In review",
    ready: "Ready",
    assigned: "Assigned",
    archived: "Archived",
};

const goalLabels: Record<string, string> = {
    onboarding: "Onboarding",
    "sales-readiness": "Sales readiness",
    "support-readiness": "Support readiness",
    compliance: "Compliance",
    "product-knowledge": "Product knowledge",
    operations: "Operations",
    custom: "Custom",
};

const Hint = ({ children, label }: { children: ReactNode; label: string }) => (
    <span className="group/hint relative inline-flex min-w-0">
        {children}
        <span className="pointer-events-none absolute left-1/2 top-full z-[140] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-[var(--shadow-soft-lg)] group-hover/hint:block">
            {label}
        </span>
    </span>
);

const TrainingBlueprintLibrary = async ({ workspaceSlug }: { workspaceSlug: string }) => {
    const [result, sourceResult, workspaceResult] = await Promise.all([
        listTrainingPlans(),
        listKnowledgeSources(),
        getWorkspaceTeamData(),
    ]);
    const plans = result.success ? result.data : [];
    const sources = sourceResult.success ? sourceResult.data : [];
    const teams = workspaceResult.success ? workspaceResult.data.teams : [];

    return (
        <main className="wrapper container">
            <header className="mb-0 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Training blueprints</h1>
                    <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                        {plans.length}
                    </span>
                </div>
                <CreateBlueprintModal sources={sources} teams={teams} workspaceSlug={workspaceSlug} />
            </header>

            {plans.length === 0 ? (
                <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
                    <div className="max-w-md text-left">
                        <div className="mb-8 flex h-24 w-28 items-center justify-center text-[var(--text-muted)]">
                            <svg viewBox="0 0 112 96" className="h-full w-full" fill="none" aria-hidden="true">
                                <path d="M24 66h64M32 52h48M40 38h32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M31 22h50a8 8 0 0 1 8 8v48H31a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z" stroke="currentColor" strokeWidth="2" />
                                <path d="M23 70a8 8 0 0 0 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">No blueprints yet</h2>
                        <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                            Upload a ready source, then ask Revise to prepare a draft blueprint with topics, scenarios, assessment criteria, and source-backed roleplay prompts.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <CreateBlueprintModal sources={sources} teams={teams} workspaceSlug={workspaceSlug} />
                            <Link
                                href={`/${workspaceSlug}/knowledge`}
                                className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                View sources
                            </Link>
                        </div>
                    </div>
                </section>
            ) : (
                <section className="min-h-[calc(100vh-8rem)] py-3">
                    <div className="grid min-w-[960px] grid-cols-[minmax(360px,1fr)_150px_130px_110px_130px_170px] border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        <span>Name</span>
                        <span>Goal</span>
                        <span>Status</span>
                        <span>Sources</span>
                        <span>Updated</span>
                        <span />
                    </div>
                    <div className="overflow-x-auto pb-6 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                        <div className="min-w-[960px] divide-y divide-[var(--border-subtle)]">
                            {plans.map((plan) => (
                                <article
                                    key={plan._id}
                                    className="grid grid-cols-[minmax(360px,1fr)_150px_130px_110px_130px_170px] items-center gap-0 px-4 py-4 transition hover:bg-[var(--surface-hover)]"
                                >
                                    <Link href={`/${workspaceSlug}/modules/${plan._id}`} className="flex min-w-0 items-start gap-3">
                                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                            <ClipboardCheck className="size-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block max-w-[42rem] whitespace-normal break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
                                                {plan.title}
                                            </span>
                                            <span className="mt-1 block text-xs text-[var(--text-muted)]">
                                                {plan.generatedBy === "ai" ? "AI draft" : "Manual draft"} · {plan.generationStatus}
                                            </span>
                                        </span>
                                    </Link>
                                    <Hint label="Blueprint goal">
                                        <span className="text-sm text-[var(--text-secondary)]">{goalLabels[plan.goal] || plan.goal}</span>
                                    </Hint>
                                    <span>
                                        <Hint label={plan.status === "review" ? "Open review, edit sections, then mark ready" : statusLabels[plan.status]}>
                                            <span className="inline-flex h-7 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm font-medium text-[var(--text-secondary)]">
                                                {statusLabels[plan.status]}
                                            </span>
                                        </Hint>
                                    </span>
                                    <Hint label={`${plan.sourceIds.length} linked source${plan.sourceIds.length === 1 ? "" : "s"}`}>
                                        <span className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)]">
                                            <BookOpenCheck className="size-4" />
                                            {plan.sourceIds.length}
                                        </span>
                                    </Hint>
                                    <Hint label="Last updated">
                                        <span className="text-sm text-[var(--text-muted)]">
                                            {plan.updatedAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(plan.updatedAt)) : "-"}
                                        </span>
                                    </Hint>
                                    <TrainingBlueprintActions
                                        planId={plan._id}
                                        workspaceSlug={workspaceSlug}
                                        status={plan.status}
                                        compact
                                    />
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
};

export default TrainingBlueprintLibrary;
