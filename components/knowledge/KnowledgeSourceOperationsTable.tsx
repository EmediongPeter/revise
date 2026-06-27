"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Archive,
    ArrowRight,
    Check,
    ChevronDown,
    Copy,
    Download,
    FileText,
    Route,
    Sparkles,
    UsersRound,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import {
    archiveKnowledgeSource,
    updateKnowledgeSourceScope,
    updateKnowledgeSourceType,
} from "@/lib/actions/knowledge.actions";
import type { KnowledgeSourceSummary } from "@/lib/actions/knowledge.actions";
import type { TeamSummary } from "@/lib/actions/workspace.actions";
import type { KnowledgeSourceStatus, KnowledgeSourceType } from "@/types";

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

const sourceTypeOptions: Array<{ value: KnowledgeSourceType; label: string }> = [
    { value: "sop", label: "SOP" },
    { value: "handbook", label: "Handbook" },
    { value: "sales-script", label: "Sales script" },
    { value: "support-policy", label: "Support policy" },
    { value: "onboarding-guide", label: "Onboarding guide" },
    { value: "compliance-policy", label: "Compliance policy" },
    { value: "knowledge-base", label: "Knowledge base" },
    { value: "other", label: "Other" },
];

const statusLabels: Record<KnowledgeSourceStatus, string> = {
    uploaded: "Uploaded",
    processing: "Processing",
    ready: "Ready",
    failed: "Failed",
    archived: "Archived",
};

const statusTone = (status: string): "neutral" | "success" | "warning" | "info" => {
    if (status === "ready") return "success";
    if (status === "failed") return "warning";
    if (status === "processing") return "info";
    return "neutral";
};

const formatDate = (value?: string) => {
    if (!value) return "Not updated";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
};

const formatFileSize = (value?: number) => {
    if (!value) return "Unknown";
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getTeamIdentifier = (name: string) => {
    const words = name.split(/\s+/).filter(Boolean);
    const identifier = words.length === 1
        ? words[0].slice(0, 3)
        : words.map((word) => word[0]).join("").slice(0, 3);

    return identifier.toUpperCase();
};

const Hint = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <span className="group/hint relative inline-flex min-w-0">
        {children}
        <span className="pointer-events-none absolute left-1/2 top-full z-[140] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-[var(--shadow-soft-lg)] group-hover/hint:block">
            {label}
        </span>
    </span>
);

const DropdownPanel = ({ children, width = "w-72" }: { children: React.ReactNode; width?: string }) => (
    <div className={`absolute left-0 top-full z-[150] mt-2 max-h-80 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-lg)] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--text-muted)_42%,transparent)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-[var(--border-medium)] ${width}`}>
        {children}
    </div>
);

const gridTemplateColumns = "minmax(320px,1fr) 150px 130px 170px 120px 72px";

const KnowledgeSourceOperationsTable = ({
    sources,
    teams,
    workspaceSlug,
}: {
    sources: KnowledgeSourceSummary[];
    teams: TeamSummary[];
    workspaceSlug: string;
}) => {
    const router = useRouter();
    const [openEditor, setOpenEditor] = useState<{ sourceId: string; field: "type" | "teams" } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ sourceId: string; x: number; y: number } | null>(null);
    const [isPending, startTransition] = useTransition();
    const teamNameById = useMemo(() => new Map(teams.map((team) => [team._id, team.name])), [teams]);
    const contextSource = contextMenu ? sources.find((source) => source._id === contextMenu.sourceId) : undefined;

    useEffect(() => {
        const close = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-source-popover]")) return;
            setOpenEditor(null);
            setContextMenu(null);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpenEditor(null);
                setContextMenu(null);
            }
        };

        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    const updateType = (sourceId: string, sourceType: KnowledgeSourceType) => {
        startTransition(async () => {
            const result = await updateKnowledgeSourceType({ sourceId, sourceType });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Source type updated.");
            setOpenEditor(null);
            router.refresh();
        });
    };

    const updateTeams = (source: KnowledgeSourceSummary, teamId: string) => {
        const teamIds = source.teamIds.includes(teamId)
            ? source.teamIds.filter((id) => id !== teamId)
            : [...source.teamIds, teamId];

        startTransition(async () => {
            const result = await updateKnowledgeSourceScope({
                sourceId: source._id,
                scope: teamIds.length > 0 ? "teams" : "workspace",
                teamIds,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Source access updated.");
            router.refresh();
        });
    };

    const copySourceLink = async (sourceId: string) => {
        const href = `${window.location.origin}/${workspaceSlug}/knowledge/${sourceId}`;
        await navigator.clipboard.writeText(href);
        toast.success("Source link copied.");
    };

    const archiveSource = (sourceId: string) => {
        startTransition(async () => {
            const result = await archiveKnowledgeSource(sourceId);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Source archived.");
            setContextMenu(null);
            router.refresh();
        });
    };

    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-auto pb-4 [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--text-muted)_45%,transparent)_transparent]">
                <div className="min-w-[760px]">
                    <div
                        className="grid items-center border-b border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                        style={{ gridTemplateColumns }}
                    >
                        <span>Name</span>
                        <span>Type</span>
                        <span>Readiness</span>
                        <span>Teams</span>
                        <span>Updated</span>
                        <span />
                    </div>
                    {sources.map((source) => {
                        const scopedTeams = source.teamIds.map((teamId) => teamNameById.get(teamId) || "Unknown").filter(Boolean);
                        const sourceTypeLabel = sourceTypeLabels[source.sourceType] || source.sourceType;
                        const sourceHref = `/${workspaceSlug}/knowledge/${source._id}`;
                        const sourceTeams = source.scope === "workspace" ? teams : teams.filter((team) => source.teamIds.includes(team._id));
                        const teamLabel =
                            source.scope === "workspace"
                                ? "All"
                                : sourceTeams.length > 0
                                  ? sourceTeams.map((team) => getTeamIdentifier(team.name)).join(", ")
                                  : "None";

                        return (
                            <article
                                key={source._id}
                                onContextMenu={(event) => {
                                    event.preventDefault();
                                    setContextMenu({ sourceId: source._id, x: event.clientX, y: event.clientY });
                                }}
                                className="group grid items-center gap-0 rounded-xl px-3 py-3 text-sm transition hover:bg-[var(--surface-hover)]"
                                style={{ gridTemplateColumns }}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--text-muted)]">
                                        <FileText className="size-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <Link
                                            href={sourceHref}
                                            className="group/link flex min-w-0 items-start gap-1.5 font-semibold leading-5 text-[var(--text-primary)] transition hover:text-[#d97757]"
                                        >
                                            <span className="whitespace-normal break-words">{source.title}</span>
                                            <ArrowRight className="mt-0.5 size-3.5 shrink-0 opacity-0 transition group-hover/link:translate-x-0.5 group-hover/link:opacity-100" />
                                        </Link>
                                        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                                            {source.status === "archived" && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                                                    <Archive className="size-3" />
                                                    archived
                                                </span>
                                            )}
                                            <span>{source.version ? `v${source.version}` : "v1"}</span>
                                            <span aria-hidden="true">·</span>
                                            <span>{formatFileSize(source.fileSize)}</span>
                                            {source.fileName && (
                                                <>
                                                    <span aria-hidden="true">·</span>
                                                    <span className="max-w-[18rem] truncate">{source.fileName}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative min-w-0" data-source-popover>
                                    <Hint label="Change source type">
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setOpenEditor(openEditor?.sourceId === source._id && openEditor.field === "type" ? null : { sourceId: source._id, field: "type" })}
                                            className="inline-flex max-w-[132px] items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                                        >
                                            <span className="truncate">{sourceTypeLabel}</span>
                                            <ChevronDown className="size-3" />
                                        </button>
                                    </Hint>
                                    {openEditor?.sourceId === source._id && openEditor.field === "type" && (
                                        <DropdownPanel>
                                            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                Change type
                                            </div>
                                            <div className="p-1.5">
                                                {sourceTypeOptions.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => updateType(source._id, option.value)}
                                                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                    >
                                                        {option.label}
                                                        {source.sourceType === option.value && <Check className="size-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </DropdownPanel>
                                    )}
                                </div>

                                <Hint label={source.status === "ready" ? "Ready for training" : statusLabels[source.status]}>
                                    <StatusBadge tone={statusTone(source.status)}>{statusLabels[source.status]}</StatusBadge>
                                </Hint>

                                <div className="relative min-w-0" data-source-popover>
                                    <Hint label="Change source access">
                                        <button
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setOpenEditor(openEditor?.sourceId === source._id && openEditor.field === "teams" ? null : { sourceId: source._id, field: "teams" })}
                                            className="inline-flex max-w-[145px] items-center gap-1.5 rounded-full bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                                        >
                                            <UsersRound className="size-3.5 shrink-0" />
                                            <span className="truncate">{teamLabel}</span>
                                            <ChevronDown className="size-3" />
                                        </button>
                                    </Hint>
                                    {openEditor?.sourceId === source._id && openEditor.field === "teams" && (
                                        <DropdownPanel width="w-80">
                                            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                Change teams
                                            </div>
                                            <div className="p-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        startTransition(async () => {
                                                            const result = await updateKnowledgeSourceScope({ sourceId: source._id, scope: "workspace", teamIds: [] });
                                                            if (!result.success) {
                                                                toast.error(result.error);
                                                                return;
                                                            }
                                                            toast.success("Source access updated.");
                                                            setOpenEditor(null);
                                                            router.refresh();
                                                        });
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                >
                                                    <span className={`flex size-4 items-center justify-center rounded border ${source.scope === "workspace" ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                        {source.scope === "workspace" && <Check className="size-3" />}
                                                    </span>
                                                    Entire workspace
                                                </button>
                                                <p className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">Teams</p>
                                                {teams.map((team) => {
                                                    const active = source.teamIds.includes(team._id);

                                                    return (
                                                        <button
                                                            key={team._id}
                                                            type="button"
                                                            onClick={() => updateTeams(source, team._id)}
                                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                        >
                                                            <span className={`flex size-4 items-center justify-center rounded border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                                {active && <Check className="size-3" />}
                                                            </span>
                                                            <span className="min-w-0 flex-1 truncate">{team.name}</span>
                                                            <span className="text-xs text-[var(--text-muted)]">{getTeamIdentifier(team.name)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </DropdownPanel>
                                    )}
                                </div>

                                <Hint label={`Updated ${formatDate(source.updatedAt || source.createdAt)}`}>
                                    <span className="truncate text-xs text-[var(--text-muted)]">{formatDate(source.updatedAt || source.createdAt)}</span>
                                </Hint>

                                <div className="flex justify-end">
                                    <Link
                                        href={sourceHref}
                                        className="inline-flex h-8 items-center rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--text-secondary)] opacity-100 transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] sm:opacity-0 sm:group-hover:opacity-100"
                                    >
                                        Review
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>

            {contextMenu && contextSource && (
                <div
                    data-source-popover
                    className="fixed z-[160] w-64 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] py-1 shadow-[var(--shadow-soft-lg)]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <Link href={`/${workspaceSlug}/knowledge/${contextSource._id}`} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                        <FileText className="size-4" />
                        Open source
                    </Link>
                    <button type="button" onClick={() => copySourceLink(contextSource._id)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                        <Copy className="size-4" />
                        Copy link
                    </button>
                    {contextSource.fileUrl && (
                        <Link href={contextSource.fileUrl} target="_blank" rel="noreferrer" className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                            <Download className="size-4" />
                            Download original
                        </Link>
                    )}
                    <button type="button" disabled className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] opacity-60">
                        <Sparkles className="size-4" />
                        Prepare training plan
                    </button>
                    <button type="button" disabled className="flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--text-muted)] opacity-60">
                        <Route className="size-4" />
                        Change access
                    </button>
                    <div className="my-1 border-t border-[var(--border-subtle)]" />
                    <button type="button" onClick={() => archiveSource(contextSource._id)} className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Archive className="size-4" />
                        Archive source
                    </button>
                </div>
            )}
        </section>
    );
};

export default KnowledgeSourceOperationsTable;
