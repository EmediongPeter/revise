"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Users } from "lucide-react";
import { toast } from "sonner";
import { updateKnowledgeSourceScope } from "@/lib/actions/knowledge.actions";
import type { TeamSummary } from "@/lib/actions/workspace.actions";
import type { KnowledgeSourceScope } from "@/types";

const KnowledgeSourceAccessEditor = ({
    sourceId,
    initialScope,
    initialTeamIds,
    teams,
}: {
    sourceId: string;
    initialScope: KnowledgeSourceScope;
    initialTeamIds: string[];
    teams: TeamSummary[];
}) => {
    const router = useRouter();
    const [scope, setScope] = useState<KnowledgeSourceScope>(initialScope);
    const [teamIds, setTeamIds] = useState(initialTeamIds);
    const [isPending, startTransition] = useTransition();
    const initialTeamKey = useMemo(() => [...initialTeamIds].sort().join(","), [initialTeamIds]);
    const currentTeamKey = useMemo(() => [...teamIds].sort().join(","), [teamIds]);
    const hasChanges = scope !== initialScope || currentTeamKey !== initialTeamKey;
    const canSave = hasChanges && !isPending && (scope === "workspace" || teamIds.length > 0);

    const toggleTeam = (teamId: string) => {
        setTeamIds((current) =>
            current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId],
        );
    };

    const saveAccess = () => {
        startTransition(async () => {
            const result = await updateKnowledgeSourceScope({
                sourceId,
                scope,
                teamIds: scope === "teams" ? teamIds : [],
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Source access updated.");
            router.refresh();
        });
    };

    return (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
            <div className="mb-4 flex items-center gap-2">
                <Users className="size-4 text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Source access</p>
            </div>
            <p className="mb-4 text-sm leading-6 text-[var(--text-muted)]">
                Control which teams can use this source when building training plans and practice scenarios.
            </p>

            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={() => setScope("workspace")}
                    disabled={isPending}
                    className={`rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                        scope === "workspace"
                            ? "border-[#d97757] bg-[#d97757]/10"
                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                >
                    <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Entire workspace</span>
                        {scope === "workspace" && <Check className="size-4 text-[#d97757]" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                        Any training plan in this workspace can reference this source.
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setScope("teams")}
                    disabled={isPending}
                    className={`rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                        scope === "teams"
                            ? "border-[#d97757] bg-[#d97757]/10"
                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                >
                    <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">Specific teams</span>
                        {scope === "teams" && <Check className="size-4 text-[#d97757]" />}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                        Only selected teams can reference this source in training.
                    </span>
                </button>
            </div>

            {scope === "teams" && (
                <div className="mt-4 space-y-2">
                    {teams.map((team) => {
                        const selected = teamIds.includes(team._id);

                        return (
                            <button
                                key={team._id}
                                type="button"
                                onClick={() => toggleTeam(team._id)}
                                disabled={isPending}
                                className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2.5 text-left transition hover:bg-[var(--surface-hover)] disabled:opacity-60"
                            >
                                <span
                                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                                        selected
                                            ? "border-[#d97757] bg-[#d97757] text-white"
                                            : "border-[var(--border-subtle)]"
                                    }`}
                                >
                                    {selected && <Check className="size-3" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                                        {team.name}
                                    </span>
                                    {team.description && (
                                        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                                            {team.description}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                    {teams.length === 0 && (
                        <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-muted)]">
                            Create a team before limiting this source to specific teams.
                        </p>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={saveAccess}
                disabled={!canSave}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-warm-hover)] disabled:pointer-events-none disabled:opacity-40"
            >
                {isPending ? "Saving" : "Save access"}
            </button>
        </section>
    );
};

export default KnowledgeSourceAccessEditor;
