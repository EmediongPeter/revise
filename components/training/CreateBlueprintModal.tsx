"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpenCheck, Check, ClipboardCheck, Sparkles, X } from "lucide-react";
import { prepareTrainingBlueprintDraft } from "@/lib/actions/training.actions";
import type { KnowledgeSourceSummary } from "@/lib/actions/knowledge.actions";
import type { TeamSummary } from "@/lib/actions/workspace.actions";

const sourceTypeLabels: Record<string, string> = {
    all: "All types",
    sop: "SOP",
    handbook: "Handbook",
    "sales-script": "Sales script",
    "support-policy": "Support policy",
    "onboarding-guide": "Onboarding guide",
    "compliance-policy": "Compliance policy",
    "knowledge-base": "Knowledge base",
    other: "Other",
};

const CreateBlueprintModal = ({
    sources,
    teams,
    workspaceSlug,
}: {
    sources: KnowledgeSourceSummary[];
    teams: TeamSummary[];
    workspaceSlug: string;
}) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
    const [trainerGuidance, setTrainerGuidance] = useState("");
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [teamFilter, setTeamFilter] = useState("all");
    const [isPending, startTransition] = useTransition();
    const readySources = useMemo(() => sources.filter((source) => source.status === "ready"), [sources]);
    const filteredSources = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return readySources.filter((source) => {
            if (typeFilter !== "all" && source.sourceType !== typeFilter) return false;
            if (teamFilter !== "all" && source.scope === "teams" && !source.teamIds.includes(teamFilter)) return false;
            if (teamFilter !== "all" && source.scope === "workspace") return true;
            if (!normalizedQuery) return true;

            return [source.title, source.description, source.fileName, source.sourceType]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery);
        });
    }, [query, readySources, teamFilter, typeFilter]);
    const selectedSources = readySources.filter((source) => selectedSourceIds.includes(source._id));
    const canSubmit = selectedSourceIds.length > 0 && !isPending;

    const toggleSource = (sourceId: string) => {
        setSelectedSourceIds((current) =>
            current.includes(sourceId)
                ? current.filter((id) => id !== sourceId)
                : [...current, sourceId],
        );
    };

    const reset = () => {
        setSelectedSourceIds([]);
        setTrainerGuidance("");
        setQuery("");
        setTypeFilter("all");
        setTeamFilter("all");
    };

    const close = () => {
        if (isPending) return;
        setOpen(false);
        reset();
    };

    const handleSubmit = () => {
        startTransition(async () => {
            const result = await prepareTrainingBlueprintDraft({
                sourceIds: selectedSourceIds,
                trainerGuidance,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            const href = `/${workspaceSlug}/modules/${result.data._id}`;
            toast.success(result.data.generationStatus === "queued" ? "Blueprint generation queued" : "Training blueprint ready", {
                description: result.data.title,
                duration: 12000,
                action: {
                    label: "Review",
                    onClick: () => router.push(href),
                },
            });
            setOpen(false);
            reset();
            router.push(href);
            router.refresh();
        });
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-9 items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white shadow-[var(--shadow-soft-sm)] transition hover:bg-[#c96849]"
            >
                <Sparkles className="mr-2 size-4" />
                Create blueprint
            </button>

            {open && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-[2px]">
                    <button
                        type="button"
                        aria-label="Close create blueprint modal"
                        className="absolute inset-0 cursor-default"
                        onClick={close}
                    />
                    <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                        <button
                            type="button"
                            onClick={close}
                            className="absolute right-4 top-4 z-20 inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Close</span>
                        </button>

                        <div className="border-b border-[var(--border-subtle)] px-6 py-5 sm:px-8">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                                <ClipboardCheck className="size-3.5 text-[#d97757]" />
                                New blueprint
                            </div>
                            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                                Create training blueprint
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                                Pick ready sources. Revise will draft the blueprint, while your guidance shapes how the future AI trainer should lead the conversation.
                            </p>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
                            <div className="mb-4 grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 md:grid-cols-[1fr_160px_160px]">
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search ready sources"
                                    className="h-9 min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--border-medium)]"
                                />
                                <select
                                    value={typeFilter}
                                    onChange={(event) => setTypeFilter(event.target.value)}
                                    className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                                >
                                    {Object.entries(sourceTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={teamFilter}
                                    onChange={(event) => setTeamFilter(event.target.value)}
                                    className="h-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                                >
                                    <option value="all">All teams</option>
                                    {teams.map((team) => (
                                        <option key={team._id} value={team._id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedSources.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {selectedSources.map((source) => (
                                        <button
                                            key={source._id}
                                            type="button"
                                            onClick={() => toggleSource(source._id)}
                                            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#d97757]/35 bg-[#d97757]/10 px-2.5 text-xs font-semibold text-[var(--text-primary)]"
                                        >
                                            {source.title}
                                            <X className="size-3" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid max-h-72 gap-3 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                                {readySources.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)] p-6 text-center">
                                        <BookOpenCheck className="mx-auto mb-3 size-7 text-[var(--text-muted)]" />
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">No ready sources yet</p>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                                            Upload and process a source before creating a blueprint.
                                        </p>
                                    </div>
                                ) : filteredSources.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)] p-6 text-center">
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">No sources match this view</p>
                                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                                            Adjust the search, team, or type filter.
                                        </p>
                                    </div>
                                ) : (
                                    filteredSources.map((source) => {
                                        const active = selectedSourceIds.includes(source._id);

                                        return (
                                            <button
                                                key={source._id}
                                                type="button"
                                                onClick={() => toggleSource(source._id)}
                                                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                                                    active
                                                        ? "border-[#d97757]/45 bg-[#d97757]/10"
                                                        : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)]"
                                                }`}
                                            >
                                                <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                    {active && <Check className="size-3.5" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{source.title}</span>
                                                    <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                                                        {source.description || source.fileName || source.sourceType}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <label className="mt-5 block">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">Trainer guidance</span>
                                <textarea
                                    value={trainerGuidance}
                                    onChange={(event) => setTrainerGuidance(event.target.value)}
                                    placeholder="Tell Revise how the trainer should lead the conversation, what to emphasize, or how the trainee should feel after the session."
                                    className="mt-2 min-h-28 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-medium)]"
                                />
                            </label>
                        </div>

                        <footer className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] px-6 py-4 sm:px-8">
                            <p className="text-xs text-[var(--text-muted)]">
                                {selectedSourceIds.length} source{selectedSourceIds.length === 1 ? "" : "s"} selected
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={close}
                                    disabled={isPending}
                                    className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    className="inline-flex h-9 items-center rounded-full bg-[#d97757] px-5 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {isPending ? "Creating..." : "Generate draft"}
                                </button>
                            </div>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
};

export default CreateBlueprintModal;
