import Link from "next/link";
import {
    Archive,
    BookOpenCheck,
    CheckCircle2,
    Clock3,
    FileText,
    Filter,
    Layers3,
    Search,
    TriangleAlert,
    Upload,
    Users,
} from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import { listKnowledgeSources } from "@/lib/actions/knowledge.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";
import type { KnowledgeSourceScope, KnowledgeSourceStatus, KnowledgeSourceType } from "@/types";
import type { KnowledgeSourceSummary } from "@/lib/actions/knowledge.actions";

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

const statusLabels: Record<KnowledgeSourceStatus | "all", string> = {
    all: "All statuses",
    uploaded: "Uploaded",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
    archived: "Archived",
};

const scopeLabels: Record<KnowledgeSourceScope | "all", string> = {
    all: "All scopes",
    workspace: "Entire workspace",
    teams: "Specific teams",
};

const statusTone = (status: string): "neutral" | "success" | "warning" | "info" => {
    if (status === "ready") return "success";
    if (status === "failed") return "warning";
    if (status === "processing") return "info";
    return "neutral";
};

const formatDate = (value?: string) => {
    if (!value) return "Not updated yet";

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

const normalizeFilterValue = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T) =>
    value && allowed.includes(value as T) ? (value as T) : fallback;

const matchesSearch = (source: KnowledgeSourceSummary, query: string) => {
    if (!query) return true;

    const searchable = [
        source.title,
        source.description,
        source.fileName,
        source.sourceType,
        source.status,
        source.origin,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return searchable.includes(query.toLowerCase());
};

const KnowledgeSourceLibrary = async ({
    workspaceSlug,
    filters = {},
}: {
    workspaceSlug: string;
    filters?: {
        q?: string;
        status?: string;
        scope?: string;
        teamId?: string;
        sourceType?: string;
    };
}) => {
    const [sourceResult, workspaceResult] = await Promise.all([
        listKnowledgeSources({ includeArchived: true }),
        getWorkspaceTeamData(),
    ]);
    const sources = sourceResult.success ? sourceResult.data : [];
    const teams = workspaceResult.success ? workspaceResult.data.teams : [];
    const teamNameById = new Map(teams.map((team) => [team._id, team.name]));
    const uploadHref = `/${workspaceSlug}/knowledge/new`;
    const activeStatus = normalizeFilterValue(filters.status, ["all", "uploaded", "processing", "ready", "failed", "archived"] as const, "all");
    const activeScope = normalizeFilterValue(filters.scope, ["all", "workspace", "teams"] as const, "all");
    const activeSourceType = normalizeFilterValue(
        filters.sourceType,
        ["all", ...Object.keys(sourceTypeLabels)] as Array<KnowledgeSourceType | "all">,
        "all",
    );
    const activeTeamId = teams.some((team) => team._id === filters.teamId) ? filters.teamId || "all" : "all";
    const searchQuery = filters.q?.trim() || "";
    const currentSources = sources.filter((source) => source.status !== "archived");
    const teamScopedCount = currentSources.filter((source) => source.scope === "teams").length;
    const filteredSources = sources.filter((source) => {
        if (!matchesSearch(source, searchQuery)) return false;
        if (activeStatus !== "all" && source.status !== activeStatus) return false;
        if (activeScope !== "all" && source.scope !== activeScope) return false;
        if (activeSourceType !== "all" && source.sourceType !== activeSourceType) return false;
        if (activeTeamId !== "all") {
            return source.scope === "workspace" || source.teamIds.includes(activeTeamId);
        }

        return true;
    });

    return (
        <main className="wrapper container">
            <PageHeader
                eyebrow="Sources"
                title="Company source library"
                description="Manage the SOPs, handbooks, scripts, policies, and guides that power source-backed practice."
                actions={
                    <Link href={uploadHref} className="dashboard-primary-action">
                        <Upload className="size-4" />
                        Upload source
                    </Link>
                }
            />

            {sources.length > 0 && (
                <>
                    <section className="dashboard-grid dashboard-grid-4 mb-6">
                        <MetricCard
                            icon={Layers3}
                            label="Active sources"
                            value={currentSources.length}
                            detail={`${sources.length - currentSources.length} archived`}
                        />
                        <MetricCard
                            icon={CheckCircle2}
                            label="Training ready"
                            value={currentSources.filter((source) => source.status === "ready").length}
                            detail="Parsed and chunked"
                        />
                        <MetricCard
                            icon={Users}
                            label="Team-scoped"
                            value={teamScopedCount}
                            detail="Limited to selected teams"
                        />
                        <MetricCard
                            icon={TriangleAlert}
                            label="Needs attention"
                            value={currentSources.filter((source) => source.status === "failed" || source.status === "processing").length}
                            detail="Processing or failed"
                        />
                    </section>

                    <section className="mb-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-soft-sm)]">
                        <form className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_auto] lg:items-end">
                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                    <Search className="size-3.5" />
                                    Search
                                </span>
                                <input
                                    name="q"
                                    defaultValue={searchQuery}
                                    placeholder="Search title, description, or file"
                                    className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#d97757]"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                    <Filter className="size-3.5" />
                                    Status
                                </span>
                                <select name="status" defaultValue={activeStatus} className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#d97757]">
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Scope</span>
                                <select name="scope" defaultValue={activeScope} className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#d97757]">
                                    {Object.entries(scopeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Team</span>
                                <select name="teamId" defaultValue={activeTeamId} className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#d97757]">
                                    <option value="all">All teams</option>
                                    {teams.map((team) => (
                                        <option key={team._id} value={team._id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Type</span>
                                <select name="sourceType" defaultValue={activeSourceType} className="h-11 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#d97757]">
                                    <option value="all">All types</option>
                                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button type="submit" className="dashboard-secondary-action h-11 justify-center">
                                Apply
                            </button>
                        </form>
                    </section>
                </>
            )}

            {sources.length === 0 ? (
                <EmptyState
                    icon={BookOpenCheck}
                    title="Upload your first knowledge source"
                    description="Start with one SOP, handbook, or policy. Revise will parse it into training-ready knowledge chunks."
                    action={{ label: "Upload source", href: uploadHref }}
                />
            ) : filteredSources.length === 0 ? (
                <EmptyState
                    icon={Search}
                    title="No sources match these filters"
                    description="Adjust the search or filters to find the policy, report, SOP, or guide you need."
                    action={{ label: "Clear filters", href: `/${workspaceSlug}/knowledge` }}
                />
            ) : (
                <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-sm)]">
                    <div className="grid grid-cols-[1.5fr_0.75fr_0.9fr_0.75fr] gap-4 border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] max-lg:hidden">
                        <span>Source</span>
                        <span>Status</span>
                        <span>Scope</span>
                        <span>Storage</span>
                    </div>

                    {filteredSources.map((source) => {
                        const scopedTeams = source.teamIds
                            .map((teamId) => teamNameById.get(teamId) || "Unknown team")
                            .filter(Boolean);
                        const sourceTypeLabel = sourceTypeLabels[source.sourceType] || source.sourceType;

                        return (
                            <article
                                key={source._id}
                                className="grid gap-4 border-b border-[var(--border-subtle)] px-4 py-4 last:border-b-0 lg:grid-cols-[1.5fr_0.75fr_0.9fr_0.75fr] lg:items-center"
                            >
                                <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                                            {sourceTypeLabel}
                                        </span>
                                        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                                            v{source.version}
                                        </span>
                                        {source.status === "archived" && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                                                <Archive className="size-3" />
                                                archived
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{source.title}</h2>
                                    {source.description && (
                                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{source.description}</p>
                                    )}
                                    {source.failureReason && <p className="mt-2 text-sm text-amber-600">{source.failureReason}</p>}
                                </div>

                                <div>
                                    <StatusBadge tone={statusTone(source.status)}>{statusLabels[source.status]}</StatusBadge>
                                    <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                        <Clock3 className="size-3.5" />
                                        {formatDate(source.updatedAt || source.createdAt)}
                                    </p>
                                </div>

                                <div className="min-w-0">
                                    {source.scope === "workspace" ? (
                                        <span className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                                            Entire workspace
                                        </span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {scopedTeams.length > 0 ? (
                                                scopedTeams.map((teamName) => (
                                                    <span
                                                        key={teamName}
                                                        className="max-w-36 truncate rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                                                    >
                                                        {teamName}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-sm text-[var(--text-muted)]">No teams selected</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-muted)]">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="size-4 shrink-0" />
                                        <span className="truncate">{source.fileName || "Knowledge source"}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--text-muted)]">{formatFileSize(source.fileSize)}</p>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </main>
    );
};

export default KnowledgeSourceLibrary;
