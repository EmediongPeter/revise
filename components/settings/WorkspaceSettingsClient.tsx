'use client';

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Building2, Check, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/dashboard/DashboardPrimitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { slugifyWorkspace } from "@/lib/onboarding";
import {
    createTeam,
    deleteTeam,
    updateActiveWorkspace,
    updateTeam,
    type WorkspaceTeamData,
} from "@/lib/actions/workspace.actions";

const inputClass =
    "mt-1.5 h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-medium)]";

const textareaClass =
    "mt-1.5 min-h-24 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--border-medium)]";

const teamAccentClasses = ["bg-[#d97757]", "bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-zinc-400"];

const getTeamAccent = (index: number) => teamAccentClasses[index % teamAccentClasses.length];

const createTeamDrafts = (teams: WorkspaceTeamData["teams"]) =>
    Object.fromEntries(
        teams.map((team) => [team._id, { name: team.name, description: team.description || "" }]),
    );

const WorkspaceSettingsClient = ({ initialData }: { initialData: WorkspaceTeamData }) => {
    const [workspace, setWorkspace] = useState(initialData.activeWorkspace);
    const [teams, setTeams] = useState(initialData.teams);
    const [name, setName] = useState(initialData.activeWorkspace.name);
    const [slug, setSlug] = useState(initialData.activeWorkspace.slug);
    const [industry, setIndustry] = useState(initialData.activeWorkspace.industry);
    const [trainingGoals, setTrainingGoals] = useState(initialData.activeWorkspace.trainingGoals.join("\n"));
    const [googleDriveConnected, setGoogleDriveConnected] = useState(initialData.activeWorkspace.googleDriveConnected);
    const [uploadedSourceName, setUploadedSourceName] = useState(initialData.activeWorkspace.uploadedSourceName || "");
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamDescription, setNewTeamDescription] = useState("");
    const [editingTeams, setEditingTeams] = useState<Record<string, { name: string; description: string }>>(() =>
        createTeamDrafts(initialData.teams),
    );
    const [isPending, startTransition] = useTransition();

    const applyData = (data: WorkspaceTeamData) => {
        setWorkspace(data.activeWorkspace);
        setTeams(data.teams);
        setEditingTeams(createTeamDrafts(data.teams));
        setName(data.activeWorkspace.name);
        setSlug(data.activeWorkspace.slug);
        setIndustry(data.activeWorkspace.industry);
        setTrainingGoals(data.activeWorkspace.trainingGoals.join("\n"));
        setGoogleDriveConnected(data.activeWorkspace.googleDriveConnected);
        setUploadedSourceName(data.activeWorkspace.uploadedSourceName || "");
    };

    const handleWorkspaceSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        startTransition(async () => {
            const result = await updateActiveWorkspace({
                name,
                slug,
                industry,
                trainingGoals,
                googleDriveConnected,
                uploadedSourceName,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            applyData(result.data);
            toast.success("Workspace settings saved.");
        });
    };

    const handleCreateTeam = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        startTransition(async () => {
            const result = await createTeam({ name: newTeamName, description: newTeamDescription });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            applyData(result.data);
            setNewTeamName("");
            setNewTeamDescription("");
            toast.success("Team added.");
        });
    };

    const handleUpdateTeam = (teamId: string) => {
        const draft = editingTeams[teamId];
        if (!draft) return;

        startTransition(async () => {
            const result = await updateTeam({ teamId, name: draft.name, description: draft.description });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            applyData(result.data);
            toast.success("Team updated.");
        });
    };

    const handleDeleteTeam = (teamId: string) => {
        startTransition(async () => {
            const result = await deleteTeam(teamId);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            applyData(result.data);
            toast.success("Team deleted.");
        });
    };

    const canEditWorkspace = ["owner", "admin"].includes(workspace.memberRole);

    return (
        <main className="container wrapper">
            <PageHeader
                eyebrow="Settings"
                title="Workspace controls"
                description="Edit the active workspace, source context, and teams used by the Revise dashboard."
                actions={<StatusBadge tone={canEditWorkspace ? "success" : "neutral"}>{workspace.memberRole}</StatusBadge>}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <form onSubmit={handleWorkspaceSubmit} className="dashboard-panel space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="metric-card-icon">
                            <Building2 className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Workspace profile</h2>
                            <p className="text-sm text-[var(--text-muted)]">These details are shared across the active workspace.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Name
                            <input
                                value={name}
                                disabled={!canEditWorkspace || isPending}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setSlug(slugifyWorkspace(event.target.value));
                                }}
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Workspace URL
                            <div className="mt-1.5 flex h-10 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                <span className="flex items-center border-r border-[var(--border-subtle)] px-3 text-xs text-[var(--text-muted)]">
                                    revise.app/
                                </span>
                                <input
                                    value={slug}
                                    disabled={!canEditWorkspace || isPending}
                                    onChange={(event) => setSlug(slugifyWorkspace(event.target.value))}
                                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none"
                                />
                            </div>
                        </label>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Industry
                            <input
                                value={industry}
                                disabled={!canEditWorkspace || isPending}
                                onChange={(event) => setIndustry(event.target.value)}
                                className={inputClass}
                            />
                        </label>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">
                            Uploaded source name
                            <input
                                value={uploadedSourceName}
                                disabled={!canEditWorkspace || isPending}
                                onChange={(event) => setUploadedSourceName(event.target.value)}
                                className={inputClass}
                                placeholder="Employee handbook.pdf"
                            />
                        </label>
                    </div>

                    <label className="block text-sm font-medium text-[var(--text-secondary)]">
                        Training goals
                        <textarea
                            value={trainingGoals}
                            disabled={!canEditWorkspace || isPending}
                            onChange={(event) => setTrainingGoals(event.target.value)}
                            className={textareaClass}
                            placeholder="One goal per line"
                        />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
                        <span>
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">Google Drive connected</span>
                            <span className="block text-xs text-[var(--text-muted)]">Track whether this workspace can import Drive sources.</span>
                        </span>
                        <input
                            type="checkbox"
                            checked={googleDriveConnected}
                            disabled={!canEditWorkspace || isPending}
                            onChange={(event) => setGoogleDriveConnected(event.target.checked)}
                            className="size-4 accent-[#d97757]"
                        />
                    </label>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={!canEditWorkspace || isPending} className="rounded-lg">
                            <Save className="size-4" />
                            {isPending ? "Saving" : "Save changes"}
                        </Button>
                    </div>
                </form>

                <section className="dashboard-panel space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="metric-card-icon">
                            <UsersRound className="size-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-[var(--text-primary)]">Teams</h2>
                            <p className="text-sm text-[var(--text-muted)]">Create and rename teams for this workspace.</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateTeam} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
                        <input
                            value={newTeamName}
                            onChange={(event) => setNewTeamName(event.target.value)}
                            disabled={isPending}
                            className={inputClass}
                            placeholder="New team name"
                        />
                        <input
                            value={newTeamDescription}
                            onChange={(event) => setNewTeamDescription(event.target.value)}
                            disabled={isPending}
                            className={inputClass}
                            placeholder="Description"
                        />
                        <Button type="submit" size="sm" disabled={isPending} className="mt-3 w-full rounded-lg">
                            <Plus className="size-4" />
                            Add team
                        </Button>
                    </form>

                    <div className="space-y-3">
                        {teams.map((team, index) => {
                            const draft = editingTeams[team._id] || { name: team.name, description: team.description || "" };

                            return (
                                <div key={team._id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className={cn("size-2.5 rounded-full", getTeamAccent(index))} />
                                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                            {team.isDefault ? "Default team" : "Team"}
                                        </span>
                                    </div>
                                    <input
                                        value={draft.name}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            setEditingTeams((current) => ({
                                                ...current,
                                                [team._id]: { ...draft, name: event.target.value },
                                            }))
                                        }
                                        className={inputClass}
                                    />
                                    <input
                                        value={draft.description}
                                        disabled={isPending}
                                        onChange={(event) =>
                                            setEditingTeams((current) => ({
                                                ...current,
                                                [team._id]: { ...draft, description: event.target.value },
                                            }))
                                        }
                                        className={inputClass}
                                        placeholder="Description"
                                    />
                                    <div className="mt-3 flex gap-2">
                                        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => handleUpdateTeam(team._id)} className="flex-1 rounded-lg">
                                            <Check className="size-4" />
                                            Save
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            disabled={isPending || team.isDefault}
                                            onClick={() => handleDeleteTeam(team._id)}
                                            className="rounded-lg text-[var(--text-muted)]"
                                        >
                                            <Trash2 className="size-4" />
                                            <span className="sr-only">Delete team</span>
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </main>
    );
};

export default WorkspaceSettingsClient;
