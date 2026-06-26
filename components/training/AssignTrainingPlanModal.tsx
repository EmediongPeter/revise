"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CalendarDays, Check, MailPlus, Send, Users, X } from "lucide-react";
import type { TrainingPlanMemberSummary, TrainingPlanTeamSummary } from "@/lib/actions/training.actions";

const initials = (value: string) =>
    value
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

const AssignTrainingPlanModal = ({
    teams,
    members,
    disabled = false,
    compact = false,
}: {
    teams: TrainingPlanTeamSummary[];
    members: TrainingPlanMemberSummary[];
    disabled?: boolean;
    compact?: boolean;
}) => {
    const [open, setOpen] = useState(false);
    const [selectedTeamIds, setSelectedTeamIds] = useState(teams.map((team) => team._id));
    const [assignmentMode, setAssignmentMode] = useState<"team" | "selected" | "future">("team");
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState("");
    const [required, setRequired] = useState(true);
    const [guidance, setGuidance] = useState("");
    const [inviteEmails, setInviteEmails] = useState("");
    const [inviteTeamId, setInviteTeamId] = useState(teams[0]?._id || "");
    const [mounted, setMounted] = useState(false);

    const selectedTeamNames = useMemo(
        () => teams.filter((team) => selectedTeamIds.includes(team._id)).map((team) => team.name),
        [selectedTeamIds, teams],
    );
    const externalWarning = assignmentMode === "selected" && selectedTeamIds.length > 0 && selectedMemberIds.length > 0;

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTeam = (teamId: string) => {
        setSelectedTeamIds((current) =>
            current.includes(teamId) ? current.filter((id) => id !== teamId) : [...current, teamId],
        );
    };

    const toggleMember = (memberId: string) => {
        setSelectedMemberIds((current) =>
            current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
        );
    };

    const close = () => setOpen(false);

    const stageAssignment = () => {
        toast.info("Assignment execution is staged for the next phase. This blueprint is ready for assignment design.");
        setOpen(false);
    };

    const inviteModal = open && assignmentMode === "future" && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Invite and assign</h2>
                            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                Add one or more trainees and optionally add them to a team.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    <div className="mt-5 space-y-4">
                        <label className="block text-sm font-semibold text-[var(--text-primary)]">
                            Email invitations
                            <textarea
                                value={inviteEmails}
                                onChange={(event) => setInviteEmails(event.target.value)}
                                placeholder="email@company.com, teammate@company.com"
                                className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--border-medium)]"
                            />
                        </label>
                        <label className="block text-sm font-semibold text-[var(--text-primary)]">
                            Add to team
                            <select
                                value={inviteTeamId}
                                onChange={(event) => setInviteTeamId(event.target.value)}
                                className="mt-2 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm outline-none focus:border-[var(--border-medium)]"
                            >
                                <option value="">Do not add to a team yet</option>
                                {teams.map((team) => (
                                    <option key={team._id} value={team._id}>{team.name}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={close}
                            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--text-secondary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={stageAssignment}
                            className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white"
                        >
                            Invite and assign
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        )
        : null;

    if (compact) {
        return (
            <div className="w-full">
                <div className="max-h-64 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                    {members.map((member) => {
                        const active = selectedMemberIds.includes(member._id);
                        const label = member.displayName || member.email;

                        return (
                            <button
                                key={member._id}
                                type="button"
                                onClick={() => {
                                    setAssignmentMode("selected");
                                    toggleMember(member._id);
                                }}
                                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                            >
                                <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                    <Check className="size-3" />
                                </span>
                                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-semibold text-white">
                                    {initials(label)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{label}</span>
                                    <span className="block truncate text-[11px] text-[var(--text-muted)]">{member.email}</span>
                                </span>
                            </button>
                        );
                    })}

                    {members.length === 0 && (
                        <p className="px-2.5 py-2 text-[12px] text-[var(--text-muted)]">No workspace members found.</p>
                    )}

                    <div className="px-2.5 py-1 text-[12px] text-[var(--text-muted)]">New user</div>
                    <button
                        type="button"
                        onClick={() => {
                            setAssignmentMode("future");
                            setOpen(true);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                    >
                        <MailPlus className="size-4 shrink-0 text-[var(--text-muted)]" />
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">Invite and add...</span>
                    </button>
                </div>
                {inviteModal}
            </div>
        );
    }

    const fullModal = open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[520] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
                <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                    <header className="flex items-start justify-between gap-5 border-b border-[var(--border-subtle)] px-6 py-5">
                        <div>
                            <span className="inline-flex h-7 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold text-[var(--text-muted)]">
                                <Users className="size-3.5" />
                                Assignment draft
                            </span>
                            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                                Assign this training module
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                                Choose who should take this training. Execution will be connected to trainee sessions in the next phase.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={close}
                            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <X className="size-5" />
                            <span className="sr-only">Close assignment modal</span>
                        </button>
                    </header>

                    <div className="space-y-6 overflow-y-auto px-6 py-5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                        <section>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Teams</h3>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {teams.length === 0 ? (
                                    <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)]">
                                        No team is attached yet. Assignments can still be prepared for selected members.
                                    </p>
                                ) : (
                                    teams.map((team) => {
                                        const active = selectedTeamIds.includes(team._id);

                                        return (
                                            <button
                                                key={team._id}
                                                type="button"
                                                onClick={() => toggleTeam(team._id)}
                                                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-left transition hover:bg-[var(--surface-hover)]"
                                            >
                                                <span>
                                                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{team.name}</span>
                                                    <span className="text-xs font-medium text-[var(--text-muted)]">{team.identifier}</span>
                                                </span>
                                                <span className={`inline-flex size-5 items-center justify-center rounded-md border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                                    <Check className="size-3.5" />
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trainees</h3>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[
                                    { value: "team", label: "Everyone in teams", description: "Best for broad rollout." },
                                    { value: "selected", label: "Selected people", description: "Use for targeted coaching." },
                                    { value: "future", label: "Future hires", description: "Queue for onboarding later." },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setAssignmentMode(option.value as "team" | "selected" | "future")}
                                        className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                                            assignmentMode === option.value
                                                ? "border-[#d97757] bg-[#fff2ec]"
                                                : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)]"
                                        }`}
                                    >
                                        <span className="block text-sm font-semibold text-[var(--text-primary)]">{option.label}</span>
                                        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{option.description}</span>
                                    </button>
                                ))}
                            </div>

                            {assignmentMode === "selected" && (
                                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-2 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                                    {members.map((member) => {
                                        const active = selectedMemberIds.includes(member._id);

                                        return (
                                            <button
                                                key={member._id}
                                                type="button"
                                                onClick={() => toggleMember(member._id)}
                                                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-elevated)]"
                                            >
                                                <span>
                                                    <span className="block text-sm font-medium text-[var(--text-primary)]">
                                                        {member.displayName || member.email}
                                                    </span>
                                                    <span className="text-xs text-[var(--text-muted)]">{member.role} - {member.status}</span>
                                                </span>
                                                <span className={`inline-flex size-5 items-center justify-center rounded-md border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                                    <Check className="size-3.5" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {externalWarning && (
                                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                                    Selected people are not validated against team membership yet. Next phase should let admins assign externally or add them to {selectedTeamNames.join(", ")} first.
                                </p>
                            )}
                        </section>

                        <section className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm font-semibold text-[var(--text-primary)]">
                                Due date
                                <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3">
                                    <CalendarDays className="size-4 text-[var(--text-muted)]" />
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(event) => setDueDate(event.target.value)}
                                        className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
                                    />
                                </span>
                            </label>
                            <label className="text-sm font-semibold text-[var(--text-primary)]">
                                Requirement
                                <button
                                    type="button"
                                    onClick={() => setRequired((current) => !current)}
                                    className="mt-2 flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)]"
                                >
                                    {required ? "Required training" : "Optional practice"}
                                    <span className={`h-5 w-9 rounded-full p-0.5 transition ${required ? "bg-[#d97757]" : "bg-[var(--border-medium)]"}`}>
                                        <span className={`block size-4 rounded-full bg-white transition ${required ? "translate-x-4" : ""}`} />
                                    </span>
                                </button>
                            </label>
                        </section>

                        <label className="block text-sm font-semibold text-[var(--text-primary)]">
                            Trainer guidance override
                            <textarea
                                value={guidance}
                                onChange={(event) => setGuidance(event.target.value)}
                                placeholder="Optional notes for how the AI trainer should lead this assigned session."
                                className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                            />
                        </label>
                    </div>

                    <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
                        <span className="text-xs text-[var(--text-muted)]">
                            {assignmentMode === "team" ? `${selectedTeamIds.length} team${selectedTeamIds.length === 1 ? "" : "s"} selected` : `${selectedMemberIds.length} trainee${selectedMemberIds.length === 1 ? "" : "s"} selected`}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={close}
                                className="inline-flex h-9 cursor-pointer items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={stageAssignment}
                                className="inline-flex h-9 cursor-pointer items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white transition hover:bg-[#c96849]"
                            >
                                Stage assignment
                            </button>
                        </div>
                    </footer>
                </div>
            </div>,
            document.body,
        )
        : null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                disabled={disabled}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <Send className="size-4" />
                Assign
            </button>
            {fullModal}
        </>
    );
};

export default AssignTrainingPlanModal;
