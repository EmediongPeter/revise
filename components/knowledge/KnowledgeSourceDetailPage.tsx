import Link from "next/link";
import {
    ArrowLeft,
    BookOpenCheck,
    CheckCircle2,
    Download,
    FileText,
    Layers3,
    Route,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import KnowledgeChunkGrid from "@/components/knowledge/KnowledgeChunkGrid";
import KnowledgeSourceAccessEditor from "@/components/knowledge/KnowledgeSourceAccessEditor";
import KnowledgeSourceActions from "@/components/knowledge/KnowledgeSourceActions";
import TrainingBlueprintButton from "@/components/training/TrainingBlueprintButton";
import { getKnowledgeSourceDetail } from "@/lib/actions/knowledge.actions";
import { listTrainingPlansForSource } from "@/lib/actions/training.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";
import type { KnowledgeSourceStatus } from "@/types";

const sourceTypeLabels: Record<string, string> = {
    sop: "SOP",
    handbook: "Handbook",
    "sales-script": "Sales script",
    "support-policy": "Support policy",
    "onboarding-guide": "Onboarding guide",
    "compliance-policy": "Compliance policy",
    "knowledge-base": "Knowledge base",
    other: "Other",
};

const statusLabels: Record<KnowledgeSourceStatus, string> = {
    uploaded: "Uploaded",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
    archived: "Archived",
};

const statusTone = (status: KnowledgeSourceStatus): "neutral" | "success" | "warning" | "info" => {
    if (status === "ready") return "success";
    if (status === "failed") return "warning";
    if (status === "processing") return "info";
    return "neutral";
};

const formatDate = (value?: string) => {
    if (!value) return "Not available";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
};

const formatFileSize = (value?: number) => {
    if (!value) return "Unknown size";
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const KnowledgeSourceDetailPage = async ({
    sourceId,
    workspaceSlug,
}: {
    sourceId: string;
    workspaceSlug: string;
}) => {
    const [result, trainingPlanResult] = await Promise.all([
        getKnowledgeSourceDetail(sourceId),
        listTrainingPlansForSource(sourceId),
    ]);

    if (!result.success) {
        return (
            <main className="wrapper container">
                <EmptyState
                    icon={TriangleAlert}
                    title="Source unavailable"
                    description={result.error}
                    action={{ label: "Back to sources", href: `/${workspaceSlug}/knowledge` }}
                />
            </main>
        );
    }

    const source = result.data;
    const workspaceResult = await getWorkspaceTeamData();
    const teams = workspaceResult.success ? workspaceResult.data.teams : [];
    const trainingPlans = trainingPlanResult.success ? trainingPlanResult.data : [];
    const sourceTypeLabel = sourceTypeLabels[source.sourceType] || source.sourceType;
    const canGenerateTraining = source.status === "ready" && source.chunkCount > 0;

    return (
        <main className="wrapper container">
            <Link
                href={`/${workspaceSlug}/knowledge`}
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
                <ArrowLeft className="size-4" />
                Back to sources
            </Link>

            <PageHeader
                eyebrow="Source detail"
                title={source.title}
                description={source.description || source.fileName || sourceTypeLabel}
                actions={
                    <>
                        {source.fileUrl && (
                            <Link href={`/api/knowledge/${source._id}/download`} className="dashboard-secondary-action">
                                <Download className="size-4" />
                                Download
                            </Link>
                        )}
                        <TrainingBlueprintButton
                            sourceIds={[source._id]}
                            workspaceSlug={workspaceSlug}
                            disabled={!canGenerateTraining}
                        />
                    </>
                }
            />

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-6">
                <MetricCard icon={Layers3} label="Chunks" value={source.chunkCount} detail="Segments" />
                <MetricCard icon={BookOpenCheck} label="Pages" value={source.pageCount || "-"} detail="Parsed" />
                <MetricCard icon={FileText} label="Words" value={source.totalChunkWords.toLocaleString()} detail="Extracted" />
                <MetricCard icon={ShieldCheck} label="Version" value={`v${source.version}`} detail={source.isCurrentVersion ? "Current" : "Previous"} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="space-y-5">
                    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Source overview</p>
                            </div>
                            <StatusBadge tone={statusTone(source.status)}>{statusLabels[source.status]}</StatusBadge>
                        </div>

                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Type</dt>
                                <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{sourceTypeLabel}</dd>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Scope</dt>
                                <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                                    {source.scope === "workspace" ? "Entire workspace" : "Specific teams"}
                                </dd>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">File</dt>
                                <dd className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{source.fileName || "Knowledge source"}</dd>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(source.fileSize)}</p>
                            </div>
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Updated</dt>
                                <dd className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{formatDate(source.updatedAt || source.createdAt)}</dd>
                            </div>
                        </dl>

                        {source.failureReason && (
                            <div className="mt-4 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                                {source.failureReason}
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Extracted knowledge</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    Preview extracted chunks before training generation.
                                </p>
                            </div>
                            <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
                                {source.chunkCount} total
                            </span>
                        </div>

                        <KnowledgeChunkGrid chunks={source.chunks} />
                    </section>
                </div>

                <aside className="space-y-5">
                    <KnowledgeSourceAccessEditor
                        sourceId={source._id}
                        initialScope={source.scope}
                        initialTeamIds={source.teamIds}
                        teams={teams}
                    />

                    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
                        <div className="mb-4 flex items-center gap-2">
                            <Route className="size-4 text-[var(--text-muted)]" />
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Training readiness</p>
                        </div>
                        {canGenerateTraining ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                                    <CheckCircle2 className="size-4" />
                                    Ready for training generation
                                </div>
                                <p className="mt-2 text-sm leading-6 text-emerald-700">
                                    Parsed and ready for training plans.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">Not ready yet</p>
                                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                                    Waiting for parsed chunks.
                                </p>
                            </div>
                        )}
                    </section>

                    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Usage</p>
                        {trainingPlans.length === 0 ? (
                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                                No training plans use this source yet.
                            </p>
                        ) : (
                            <div className="mt-3 space-y-2">
                                {trainingPlans.map((plan) => (
                                    <div
                                        key={plan._id}
                                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3"
                                    >
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.title}</p>
                                        <p className="mt-1 text-xs capitalize text-[var(--text-muted)]">
                                            {plan.goal.replace(/-/g, " ")} / {plan.status}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <KnowledgeSourceActions
                        sourceId={source._id}
                        workspaceSlug={workspaceSlug}
                        archived={source.status === "archived"}
                    />
                </aside>
            </section>
        </main>
    );
};

export default KnowledgeSourceDetailPage;
