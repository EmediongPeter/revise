import Link from "next/link";
import {
    Search,
    SlidersHorizontal,
} from "lucide-react";
import KnowledgeSourceOperationsTable from "@/components/knowledge/KnowledgeSourceOperationsTable";
import NewSourceTrigger from "@/components/knowledge/NewSourceTrigger";
import KnowledgeSourceWorkspaceState from "@/components/knowledge/KnowledgeSourceWorkspaceState";
import { listKnowledgeSources } from "@/lib/actions/knowledge.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";
import type { KnowledgeSourceStatus, KnowledgeSourceType } from "@/types";
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
    all: "All sources",
    uploaded: "Uploaded",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
    archived: "Archived",
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

const SourceStackIllustration = () => (
    <div className="relative mx-auto mb-8 flex h-24 w-28 items-center justify-center text-[var(--text-muted)]">
        <svg viewBox="0 0 112 96" className="h-full w-full" fill="none" aria-hidden="true">
            <path d="M29 33.5 56 19l27 14.5L56 48 29 33.5Z" stroke="currentColor" strokeWidth="2" />
            <path d="M29 49.5 56 35l27 14.5L56 64 29 49.5Z" stroke="currentColor" strokeWidth="2" opacity=".78" />
            <path d="M29 65.5 56 51l27 14.5L56 80 29 65.5Z" stroke="currentColor" strokeWidth="2" opacity=".55" />
            <path d="M56 48v32M29 33.5v32M83 33.5v32" stroke="currentColor" strokeWidth="2" opacity=".35" />
        </svg>
    </div>
);

const shortcut = (
    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90">
        <kbd className="rounded bg-white/20 px-1.5 py-0.5">N</kbd>
        <span>then</span>
        <kbd className="rounded bg-white/20 px-1.5 py-0.5">S</kbd>
    </span>
);

const buildStatusHref = (workspaceSlug: string, status: string, query: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (query) params.set("q", query);
    const suffix = params.toString();

    return `/${workspaceSlug}/knowledge${suffix ? `?${suffix}` : ""}`;
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
    const activeStatus = normalizeFilterValue(filters.status, ["all", "uploaded", "processing", "ready", "failed", "archived"] as const, "all");
    const activeSourceType = normalizeFilterValue(
        filters.sourceType,
        ["all", ...Object.keys(sourceTypeLabels)] as Array<KnowledgeSourceType | "all">,
        "all",
    );
    const searchQuery = filters.q?.trim() || "";
    const filteredSources = sources.filter((source) => {
        if (!matchesSearch(source, searchQuery)) return false;
        if (activeStatus !== "all" && source.status !== activeStatus) return false;
        if (activeSourceType !== "all" && source.sourceType !== activeSourceType) return false;

        return true;
    });
    const statusOptions: Array<KnowledgeSourceStatus | "all"> = ["all", "ready", "processing", "failed", "archived"];

    return (
        <main className="wrapper container">
            <KnowledgeSourceWorkspaceState />

            <header className="mb-0 flex h-14 items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Sources</h1>
                    <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                        {sources.length}
                    </span>
                </div>
                <NewSourceTrigger />
            </header>

            <section className="flex min-h-[calc(100vh-8rem)] flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-3">
                    <nav className="flex flex-wrap items-center gap-2" aria-label="Source views">
                        {statusOptions.map((status) => {
                            const active = activeStatus === status;

                            return (
                                <Link
                                    key={status}
                                    href={buildStatusHref(workspaceSlug, status, searchQuery)}
                                    className={`inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition ${
                                        active
                                            ? "border-[var(--border-medium)] bg-[var(--surface-hover)] text-[var(--text-primary)] shadow-[var(--shadow-soft-sm)]"
                                            : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    {statusLabels[status]}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-2">
                        <form className="relative">
                            {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
                            {activeSourceType !== "all" && <input type="hidden" name="sourceType" value={activeSourceType} />}
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                name="q"
                                defaultValue={searchQuery}
                                placeholder="Search"
                                className="h-8 w-48 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] pl-8 pr-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-medium)]"
                            />
                        </form>
                        <details className="group relative">
                            <summary className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
                                <SlidersHorizontal className="size-4" />
                                <span className="sr-only">Filter sources</span>
                            </summary>
                            <form className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-soft-lg)]">
                                {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
                                {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
                                <label className="block px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                    Source type
                                </label>
                                <select
                                    name="sourceType"
                                    defaultValue={activeSourceType}
                                    className="mb-2 h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2 text-sm text-[var(--text-primary)] outline-none"
                                >
                                    <option value="all">All types</option>
                                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <button type="submit" className="h-9 w-full rounded-lg bg-[var(--text-primary)] text-sm font-semibold text-[var(--text-inverse)]">
                                    Apply
                                </button>
                            </form>
                        </details>
                    </div>
                </div>

                {sources.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center px-4 py-16">
                        <div className="max-w-md text-left">
                            <SourceStackIllustration />
                            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Sources</h2>
                            <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                Sources are the company knowledge Revise uses to create training plans, practice scenarios, and readiness checks. Start with an SOP, handbook, sales script, or support policy.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center gap-2">
                                <NewSourceTrigger variant="primary">
                                    Upload new source
                                    {shortcut}
                                </NewSourceTrigger>
                                <Link
                                    href="/wizard"
                                    className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                >
                                    View guide
                                </Link>
                            </div>
                        </div>
                    </section>
                ) : filteredSources.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center px-4 py-16">
                        <div className="max-w-sm text-center">
                            <Search className="mx-auto mb-4 size-8 text-[var(--text-muted)]" />
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">No matching sources</h2>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                                Adjust the view, search, or type filter to find the source you need.
                            </p>
                            <Link
                                href={`/${workspaceSlug}/knowledge`}
                                className="mt-5 inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                Clear filters
                            </Link>
                        </div>
                    </section>
                ) : (
                    <KnowledgeSourceOperationsTable
                        sources={filteredSources}
                        teams={teams}
                        workspaceSlug={workspaceSlug}
                    />
                )}
            </section>
        </main>
    );
};

export default KnowledgeSourceLibrary;
