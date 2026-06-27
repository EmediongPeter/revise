"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    ArrowDown,
    ArrowUp,
    Archive,
    BookOpenCheck,
    Bot,
    CalendarClock,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    ClipboardCheck,
    Edit3,
    FileText,
    Headphones,
    PanelRightClose,
    PanelRightOpen,
    PackageCheck,
    ShieldCheck,
    Sparkles,
    Star,
    TrendingUp,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import AssignTrainingPlanModal from "@/components/training/AssignTrainingPlanModal";
import EditableBlueprintSection from "@/components/training/EditableBlueprintSection";
import {
    regenerateTrainingPlan,
    updateTrainingPlanProperties,
    updateTrainingPlanSources,
    updateTrainingPlanStatus,
    type TrainingPlanDetail,
} from "@/lib/actions/training.actions";
import type { TrainingPlanGoal, TrainingPlanStatus } from "@/types";

const statusLabels: Record<TrainingPlanStatus, string> = {
    draft: "Draft",
    review: "In review",
    ready: "Ready",
    archived: "Archived",
};

type ActiveMenu =
    | "header-status"
    | "header-teams"
    | "header-sources"
    | "header-assignees"
    | "property-status"
    | "property-goal"
    | "property-teams"
    | "property-assignees"
    | "property-sources";

const statusOptions: Array<{ value: TrainingPlanStatus; label: string; note: string; icon: React.ReactNode }> = [
    {
        value: "review",
        label: "In review",
        note: "Editable draft.",
        icon: <CircleDot className="size-3.5" />,
    },
    {
        value: "ready",
        label: "Ready",
        note: "Approved to assign.",
        icon: <CheckCircle2 className="size-3.5" />,
    },
    {
        value: "archived",
        label: "Archive",
        note: "Hide from active use.",
        icon: <Archive className="size-3.5" />,
    },
];

const goalLabels: Record<TrainingPlanGoal, string> = {
    onboarding: "Onboarding",
    "sales-readiness": "Sales readiness",
    "support-readiness": "Support readiness",
    compliance: "Compliance",
    "product-knowledge": "Product knowledge",
    operations: "Operations",
    custom: "Custom",
};

const goalOptions = Object.entries(goalLabels) as Array<[TrainingPlanGoal, string]>;

const goalMeta: Record<TrainingPlanGoal, { icon: React.ReactNode }> = {
    onboarding: { icon: <UserPlus className="size-3.5" /> },
    "sales-readiness": { icon: <TrendingUp className="size-3.5" /> },
    "support-readiness": { icon: <Headphones className="size-3.5" /> },
    compliance: { icon: <ShieldCheck className="size-3.5" /> },
    "product-knowledge": { icon: <BookOpenCheck className="size-3.5" /> },
    operations: { icon: <PackageCheck className="size-3.5" /> },
    custom: { icon: <Sparkles className="size-3.5" /> },
};

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

const formatDate = (value?: string) => {
    if (!value) return "-";

    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(value));
};

const Hint = ({
    children,
    label,
    disabled = false,
}: {
    children: React.ReactNode;
    label: string;
    disabled?: boolean;
}) => {
    const anchorRef = useRef<HTMLSpanElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

    const show = () => {
        if (disabled) return;

        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;

        const estimatedWidth = Math.min(280, Math.max(120, label.length * 7 + 28));
        const left = Math.min(
            window.innerWidth - estimatedWidth / 2 - 10,
            Math.max(estimatedWidth / 2 + 10, rect.left + rect.width / 2),
        );
        const belowTop = rect.bottom + 8;
        const top = belowTop + 32 > window.innerHeight ? Math.max(10, rect.top - 38) : belowTop;

        setPosition({ left, top });
    };

    const hide = () => setPosition(null);

    useEffect(() => {
        if (!position) return;

        window.addEventListener("scroll", hide, true);
        window.addEventListener("resize", hide);

        return () => {
            window.removeEventListener("scroll", hide, true);
            window.removeEventListener("resize", hide);
        };
    }, [position]);

    return (
        <span
            ref={anchorRef}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            className="relative inline-flex min-w-0"
        >
            {children}
            {position && createPortal(
                <span
                    className="pointer-events-none fixed z-[9999] -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-soft-lg)]"
                    style={{ left: position.left, top: position.top }}
                >
                    {label}
                </span>,
                document.body,
            )}
        </span>
    );
};

const MenuShell = ({
    children,
    align = "header",
}: {
    children: React.ReactNode;
    align?: "header" | "property";
}) => (
    <div
        data-module-menu="true"
        className={`pointer-events-auto absolute top-full z-[300] overflow-visible rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_18px_48px_rgba(15,23,42,0.16)] ${
            align === "property" ? "left-0 mt-1 w-56" : "left-0 mt-2 w-56"
        }`}
    >
        {children}
    </div>
);

const IconBadge = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex size-5 shrink-0 items-center justify-center text-[var(--text-muted)]">
        {children}
    </span>
);

const EditableButton = ({
    children,
    onClick,
    hint,
    active = false,
}: {
    children: React.ReactNode;
    onClick: () => void;
    hint: string;
    active?: boolean;
}) => (
    <Hint label={hint} disabled={active}>
        <button
            type="button"
            data-module-menu-trigger="true"
            onClick={onClick}
            className={`inline-flex h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] ${
                active
                    ? "border-[var(--border-medium)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
            }`}
        >
            {children}
        </button>
    </Hint>
);

const PropertyRow = ({
    icon,
    label,
    children,
    onClick,
    active = false,
    hint,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    hint?: string;
}) => {
    if (!onClick) {
        return (
            <div className="grid grid-cols-[104px_1fr] items-center gap-3 rounded-lg px-2 py-2 text-xs">
                <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                    {icon}
                    {label}
                </dt>
                <dd className="min-w-0 text-[var(--text-secondary)]">{children}</dd>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[104px_1fr] items-center gap-3 rounded-lg px-2 py-2 text-xs">
            <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                {icon}
                {label}
            </dt>
            <dd className="min-w-0 text-[var(--text-secondary)]">
                <Hint label={hint || "Edit property"} disabled={active}>
                    <button
                        type="button"
                        data-module-menu-trigger="true"
                        onClick={onClick}
                        className={`inline-flex max-w-full cursor-pointer items-center rounded-full border px-2 py-1 text-left transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] ${
                            active
                                ? "border-[var(--border-medium)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
                                : "border-transparent bg-transparent"
                        }`}
                    >
                        <span className="min-w-0">{children}</span>
                    </button>
                </Hint>
            </dd>
        </div>
    );
};

const HeaderTextEditor = ({
    planId,
    title,
    description,
    onDraftChange,
}: {
    planId: string;
    title: string;
    description?: string;
    onDraftChange: (draft: { title: string; description: string }) => void;
}) => {
    const [editing, setEditing] = useState<"title" | "description" | null>(null);
    const [draftTitle, setDraftTitle] = useState(title);
    const [draftDescription, setDraftDescription] = useState(description || "");
    const [isPending, startTransition] = useTransition();
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const savedRef = useRef({ title, description: description || "" });

    useEffect(() => {
        setDraftTitle(title);
        setDraftDescription(description || "");
        savedRef.current = { title, description: description || "" };
    }, [title, description]);

    useEffect(() => {
        const activeRef = editing === "title" ? titleRef : editing === "description" ? descriptionRef : null;
        activeRef?.current?.focus();
        activeRef?.current?.setSelectionRange(activeRef.current.value.length, activeRef.current.value.length);
    }, [editing]);

    const persist = (nextTitle = draftTitle, nextDescription = draftDescription) => {
        const trimmedTitle = nextTitle.trim();
        const normalizedDescription = nextDescription.trim();

        if (trimmedTitle.length < 2) return;
        if (
            savedRef.current.title === trimmedTitle &&
            savedRef.current.description === normalizedDescription
        ) {
            return;
        }

        savedRef.current = { title: trimmedTitle, description: normalizedDescription };
        startTransition(async () => {
            const result = await updateTrainingPlanProperties({
                planId,
                title: trimmedTitle,
                description: normalizedDescription,
            });

            if (!result.success) {
                toast.error(result.error);
                savedRef.current = { title, description: description || "" };
                return;
            }
        });
    };

    useEffect(() => {
        if (!editing) return;

        const timeout = window.setTimeout(() => persist(), 750);

        return () => window.clearTimeout(timeout);
    }, [draftTitle, draftDescription, editing]);

    return (
        <div className={`group/title mb-6 ${isPending ? "opacity-95" : ""}`}>
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                <ClipboardCheck className="size-5" />
            </div>

            {editing === "title" ? (
                <textarea
                    ref={titleRef}
                    value={draftTitle}
                    onBlur={() => {
                        persist();
                        setEditing(null);
                    }}
                    onChange={(event) => {
                        setDraftTitle(event.target.value);
                        onDraftChange({ title: event.target.value, description: draftDescription });
                    }}
                    className="block min-h-16 w-full resize-none border-none bg-transparent p-0 text-2xl font-semibold leading-tight tracking-tight text-[var(--text-primary)] outline-none"
                />
            ) : (
                <div className="flex items-start gap-2">
                    <button
                        type="button"
                        onClick={() => setEditing("title")}
                        className="min-w-0 text-left text-2xl font-semibold leading-tight tracking-tight text-[var(--text-primary)]"
                    >
                        {draftTitle}
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditing("title")}
                        className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] group-hover/title:opacity-100"
                    >
                        <Edit3 className="size-3.5" />
                        <span className="sr-only">Edit title</span>
                    </button>
                </div>
            )}

            {editing === "description" ? (
                <textarea
                    ref={descriptionRef}
                    value={draftDescription}
                    onBlur={() => {
                        persist();
                        setEditing(null);
                    }}
                    onChange={(event) => {
                        setDraftDescription(event.target.value);
                        onDraftChange({ title: draftTitle, description: event.target.value });
                    }}
                    placeholder="Add a short description..."
                    className="mt-3 block min-h-20 w-full max-w-3xl resize-none border-none bg-transparent p-0 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
            ) : (
                <div className="mt-3 flex items-start gap-2">
                    <button
                        type="button"
                        onClick={() => setEditing("description")}
                        className="max-w-3xl text-left text-sm leading-6 text-[var(--text-secondary)]"
                    >
                        {draftDescription || "Add a short description for this training module."}
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditing("description")}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] group-hover/title:opacity-100"
                    >
                        <Edit3 className="size-3.5" />
                        <span className="sr-only">Edit description</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const TrainingBlueprintDetailClient = ({
    plan,
    workspaceSlug,
}: {
    plan: TrainingPlanDetail;
    workspaceSlug: string;
}) => {
    const router = useRouter();
    const [propertiesOpen, setPropertiesOpen] = useState(true);
    const [favorite, setFavorite] = useState(false);
    const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null);
    const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
    const [selectedSourceIds, setSelectedSourceIds] = useState(plan.sourceIds);
    const [regenerationFeedback, setRegenerationFeedback] = useState("");
    const [headerDraft, setHeaderDraft] = useState({
        title: plan.title,
        description: plan.description || "",
    });
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setHeaderDraft({ title: plan.title, description: plan.description || "" });
    }, [plan.title, plan.description]);

    useEffect(() => {
        setSelectedSourceIds(plan.sourceIds);
    }, [plan.sourceIds]);

    const teamLabel = useMemo(() => {
        if (plan.teams.length === 0) return "General";
        if (plan.teams.length === 1) return plan.teams[0].name;
        return plan.teams.map((team) => team.identifier).join(", ");
    }, [plan.teams]);
    const assignmentState = plan.status === "ready" ? "All team members" : "Not assignable yet";
    const assigneeHint = plan.status === "ready"
        ? "Defaults to team members."
        : plan.status === "archived"
          ? "Archived module."
          : "Mark ready first.";
    const sourceNeedsRegeneration = plan.needsRegeneration;
    const previousHref = plan.navigation.previousPlanId ? `/${workspaceSlug}/modules/${plan.navigation.previousPlanId}` : undefined;
    const nextHref = plan.navigation.nextPlanId ? `/${workspaceSlug}/modules/${plan.navigation.nextPlanId}` : undefined;
    const selectedTeamIds = plan.teams.map((team) => team._id);

    const closeMenus = () => setActiveMenu(null);

    const updateStatus = (status: TrainingPlanStatus) => {
        startTransition(async () => {
            const result = await updateTrainingPlanStatus({ planId: plan._id, status });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(status === "archived" ? "Module archived." : "Module status updated.");
            closeMenus();
            router.refresh();
        });
    };

    const updateGoal = (goal: TrainingPlanGoal) => {
        startTransition(async () => {
            const result = await updateTrainingPlanProperties({ planId: plan._id, goal });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Module goal updated.");
            closeMenus();
            router.refresh();
        });
    };

    const toggleTeam = (teamId: string) => {
        const nextTeamIds = selectedTeamIds.includes(teamId)
            ? selectedTeamIds.filter((id) => id !== teamId)
            : [...selectedTeamIds, teamId];

        startTransition(async () => {
            const result = await updateTrainingPlanProperties({ planId: plan._id, teamIds: nextTeamIds });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            router.refresh();
        });
    };

    const toggleSelectedSource = (sourceId: string) => {
        setSelectedSourceIds((current) =>
            current.includes(sourceId)
                ? current.filter((id) => id !== sourceId)
                : [...current, sourceId],
        );
    };

    const saveSourceSelection = (sourceIds = selectedSourceIds) => {
        startTransition(async () => {
            const result = await updateTrainingPlanSources({ planId: plan._id, sourceIds });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Sources updated. Review regeneration next.");
            setSourcePickerOpen(false);
            router.refresh();
        });
    };

    const removeSource = (sourceId: string) => {
        const nextSourceIds = plan.sourceIds.filter((id) => id !== sourceId);
        setSelectedSourceIds(nextSourceIds);
        saveSourceSelection(nextSourceIds);
    };

    const regenerateDraft = () => {
        startTransition(async () => {
            const result = await regenerateTrainingPlan({
                planId: plan._id,
                feedback: regenerationFeedback,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(result.data.generationStatus === "queued" ? "Regeneration queued." : "Draft regenerated.");
            setRegenerationFeedback("");
            router.refresh();
        });
    };

    useEffect(() => {
        const isTypingTarget = (target: EventTarget | null) => {
            if (!(target instanceof HTMLElement)) return false;

            return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;

            if (event.key.toLowerCase() === "j" && nextHref) {
                event.preventDefault();
                router.push(nextHref);
            }

            if (event.key.toLowerCase() === "k" && previousHref) {
                event.preventDefault();
                router.push(previousHref);
            }

            if (event.key.toLowerCase() === "p") {
                event.preventDefault();
                setPropertiesOpen((current) => !current);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [nextHref, previousHref, router]);

    const renderStatusMenu = (align: "header" | "property" = "header") => (
        <MenuShell align={align}>
            <div className="p-1.5">
                {statusOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => updateStatus(option.value)}
                        disabled={isPending}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                        <IconBadge>{option.icon}</IconBadge>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{option.label}</span>
                            <span className="block truncate text-[11px] text-[var(--text-muted)]">{option.note}</span>
                        </span>
                        {plan.status === option.value && <Check className="size-3.5 text-[var(--text-muted)]" />}
                    </button>
                ))}
            </div>
        </MenuShell>
    );

    const renderGoalMenu = (align: "header" | "property" = "header") => (
        <MenuShell align={align}>
            <div className="max-h-72 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                {goalOptions.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => updateGoal(value)}
                        disabled={isPending}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                    >
                        <IconBadge>{goalMeta[value].icon}</IconBadge>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {plan.goal === value && <Check className="size-3.5 text-[var(--text-muted)]" />}
                    </button>
                ))}
            </div>
        </MenuShell>
    );

    const renderTeamsMenu = (align: "header" | "property" = "header") => (
        <MenuShell align={align}>
            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-semibold capitalize tracking-[0.12em] text-[var(--text-muted)]">
                Change teams
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                {plan.availableTeams.map((team) => {
                    const active = selectedTeamIds.includes(team._id);

                    return (
                        <button
                            key={team._id}
                            type="button"
                            onClick={() => toggleTeam(team._id)}
                            disabled={isPending}
                            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)] disabled:opacity-50"
                        >
                            <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                <Check className="size-3" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{team.name}</span>
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--text-muted)]">{team.identifier}</span>
                        </button>
                    );
                })}
            </div>
        </MenuShell>
    );

    const renderSourcesMenu = (align: "header" | "property" = "header") => (
        <MenuShell align={align}>
            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-semibold capitalize tracking-[0.12em] text-[var(--text-muted)]">
                Linked sources
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                {plan.sources.map((source) => (
                    <Link
                        key={source._id}
                        href={`/${workspaceSlug}/knowledge/${source._id}`}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-[var(--surface-hover)]"
                    >
                        <IconBadge><FileText className="size-3.5" /></IconBadge>
                        <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{source.title}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">{sourceTypeLabels[source.sourceType] || source.sourceType}</span>
                        </span>
                    </Link>
                ))}
            </div>
        </MenuShell>
    );

    const renderAssigneesMenu = (align: "header" | "property" = "header") => (
        <MenuShell align={align}>
            <div className="p-1.5">
                <AssignTrainingPlanModal
                    teams={plan.teams}
                    members={plan.members}
                    compact
                />
            </div>
        </MenuShell>
    );

    return (
        <main className="h-full w-full overflow-hidden">
            {activeMenu && <button type="button" aria-label="Close menu" onClick={closeMenus} className="fixed inset-0 z-[40] cursor-default" />}
            <div className="flex h-[calc(100vh-1rem)] flex-col overflow-hidden bg-transparent">
                <header className="relative z-[80] shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                    <div className="flex h-12 items-center justify-between gap-3 px-5">
                        <nav className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                            <Link href={`/${workspaceSlug}/modules`} className="transition hover:text-[var(--text-primary)]">
                                Training modules
                            </Link>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="truncate">{teamLabel}</span>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="max-w-[34rem] truncate text-[var(--text-primary)]">{headerDraft.title}</span>
                        </nav>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setFavorite((current) => !current)}
                                className="inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                <Star className={`size-4 ${favorite ? "fill-[#d97757] text-[#d97757]" : ""}`} />
                                <span className="sr-only">Feature module</span>
                            </button>
                            <span className="px-2 text-sm font-medium text-[var(--text-muted)]">
                                {plan.navigation.position} / {plan.navigation.total}
                            </span>
                            <Hint label="Previous module · K" disabled={!!activeMenu}>
                                <Link
                                    href={previousHref || "#"}
                                    aria-disabled={!previousHref}
                                    className={`inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition ${
                                        previousHref ? "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" : "pointer-events-none opacity-35"
                                    }`}
                                >
                                    <ArrowUp className="size-4" />
                                    <span className="sr-only">Previous module</span>
                                </Link>
                            </Hint>
                            <Hint label="Next module · J" disabled={!!activeMenu}>
                                <Link
                                    href={nextHref || "#"}
                                    aria-disabled={!nextHref}
                                    className={`inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition ${
                                        nextHref ? "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" : "pointer-events-none opacity-35"
                                    }`}
                                >
                                    <ArrowDown className="size-4" />
                                    <span className="sr-only">Next module</span>
                                </Link>
                            </Hint>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-5 py-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="relative">
                                <EditableButton active={activeMenu === "header-status"} hint="Change status" onClick={() => setActiveMenu(activeMenu === "header-status" ? null : "header-status")}>
                                    <CircleDot className="size-3.5 text-[var(--text-muted)]" />
                                    {statusLabels[plan.status]}
                                </EditableButton>
                                {activeMenu === "header-status" && renderStatusMenu()}
                            </span>
                            <span className="relative">
                                <EditableButton active={activeMenu === "header-teams"} hint="Change teams" onClick={() => setActiveMenu(activeMenu === "header-teams" ? null : "header-teams")}>
                                    <Users className="size-3.5" />
                                    <span className="max-w-44 truncate">{teamLabel}</span>
                                </EditableButton>
                                {activeMenu === "header-teams" && renderTeamsMenu()}
                            </span>
                            <span className="relative">
                                <EditableButton active={activeMenu === "header-sources"} hint="View linked sources" onClick={() => setActiveMenu(activeMenu === "header-sources" ? null : "header-sources")}>
                                    <BookOpenCheck className="size-3.5" />
                                    {plan.sources.length} source{plan.sources.length === 1 ? "" : "s"}
                                </EditableButton>
                                {activeMenu === "header-sources" && renderSourcesMenu()}
                            </span>
                            <span className="relative">
                                <EditableButton active={activeMenu === "header-assignees"} hint={assigneeHint} onClick={() => setActiveMenu(activeMenu === "header-assignees" ? null : "header-assignees")}>
                                    <ClipboardCheck className="size-3.5" />
                                    {assignmentState}
                                </EditableButton>
                                {activeMenu === "header-assignees" && renderAssigneesMenu()}
                            </span>
                        </div>
                        <Hint label="Toggle properties (P)" disabled={!!activeMenu}>
                            <button
                                type="button"
                                onClick={() => setPropertiesOpen((current) => !current)}
                                className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                {propertiesOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
                                <span className="sr-only">Toggle properties</span>
                            </button>
                        </Hint>
                    </div>
                </header>

                <div
                    className={`grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ease-out ${
                        propertiesOpen ? "lg:grid-cols-[minmax(0,1fr)_330px]" : "lg:grid-cols-[minmax(0,1fr)_0px]"
                    }`}
                >
                    <section className="min-h-0 min-w-0 overflow-y-auto px-8 py-7 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                        <div className="mx-auto max-w-4xl">
                            <HeaderTextEditor
                                planId={plan._id}
                                title={plan.title}
                                description={plan.description}
                                onDraftChange={setHeaderDraft}
                            />

                            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
                                <span className="flex items-center gap-2">
                                    <span className="text-[var(--text-muted)]">
                                        {goalMeta[plan.goal]?.icon || <Sparkles className="size-3.5" />}
                                    </span>
                                    {goalLabels[plan.goal] || plan.goal}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Bot className="size-3.5 text-[var(--text-muted)]" />
                                    {plan.generatedBy === "ai" ? "AI generated draft" : "Manual draft"}
                                </span>
                                <span className="flex items-center gap-2">
                                    <CalendarClock className="size-3.5 text-[var(--text-muted)]" />
                                    Updated {formatDate(plan.updatedAt)}
                                </span>
                            </div>

                            {sourceNeedsRegeneration && (
                                <div className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-semibold">Sources changed.</p>
                                            <p className="text-xs text-amber-800/80 dark:text-amber-100/75">Regenerate before assigning.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={regenerateDraft}
                                            disabled={isPending}
                                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[#d97757] px-3 text-xs font-semibold text-white transition hover:bg-[#c76647] disabled:opacity-50"
                                        >
                                            Regenerate draft
                                        </button>
                                    </div>
                                    <textarea
                                        value={regenerationFeedback}
                                        onChange={(event) => setRegenerationFeedback(event.target.value)}
                                        placeholder="Optional feedback for AI..."
                                        className="mt-3 min-h-16 w-full resize-none rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2 text-xs text-amber-950 outline-none transition placeholder:text-amber-800/45 focus:border-amber-300 dark:border-amber-200/15 dark:bg-black/15 dark:text-amber-50 dark:placeholder:text-amber-100/35"
                                    />
                                </div>
                            )}

                            <section className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sources</h2>
                                    <button
                                        type="button"
                                        onClick={() => setSourcePickerOpen((current) => !current)}
                                        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                                            sourcePickerOpen
                                                ? "border-[var(--border-medium)] bg-[var(--surface-hover)] text-[var(--text-primary)]"
                                                : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                        }`}
                                    >
                                        + Add source
                                    </button>
                                </div>
                                {sourcePickerOpen && (
                                    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold text-[var(--text-primary)]">Ready workspace sources</p>
                                            <button
                                                type="button"
                                                onClick={() => saveSourceSelection()}
                                                disabled={isPending || selectedSourceIds.length === 0}
                                                className="inline-flex h-7 items-center rounded-full bg-[#d97757] px-3 text-xs font-semibold text-white transition hover:bg-[#c76647] disabled:opacity-40"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        <div className="max-h-52 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                                            {plan.availableSources.map((source) => {
                                                const selected = selectedSourceIds.includes(source._id);

                                                return (
                                                    <button
                                                        key={source._id}
                                                        type="button"
                                                        onClick={() => toggleSelectedSource(source._id)}
                                                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--surface-hover)]"
                                                    >
                                                        <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                                            <Check className="size-3" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{source.title}</span>
                                                            <span className="block truncate text-[11px] text-[var(--text-muted)]">
                                                                {sourceTypeLabels[source.sourceType] || source.sourceType} - v{source.version}
                                                            </span>
                                                        </span>
                                                        {plan.sourceIds.includes(source._id) && (
                                                            <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                                                linked
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            {plan.availableSources.length === 0 && (
                                                <p className="rounded-lg bg-[var(--surface-elevated)] px-3 py-3 text-xs text-[var(--text-muted)]">No ready sources yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="divide-y divide-[var(--border-subtle)]">
                                    {plan.sources.map((source) => (
                                        <div
                                            key={source._id}
                                            className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-[var(--surface-hover)]"
                                        >
                                            <Link href={`/${workspaceSlug}/knowledge/${source._id}`} className="flex min-w-0 items-center gap-3">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--text-muted)]">
                                                    <FileText className="size-4" />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{source.title}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {sourceTypeLabels[source.sourceType] || source.sourceType} - v{source.version}
                                                    </span>
                                                </span>
                                            </Link>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--text-muted)]">
                                                    {source.status}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSource(source._id)}
                                                    disabled={isPending || plan.sourceIds.length <= 1}
                                                    className="inline-flex size-7 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-35"
                                                >
                                                    <X className="size-3.5" />
                                                    <span className="sr-only">Remove source</span>
                                                </button>
                                            </span>
                                        </div>
                                    ))}
                                    {plan.sources.length === 0 && (
                                        <p className="px-4 py-4 text-sm text-[var(--text-muted)]">No linked sources were found.</p>
                                    )}
                                </div>
                            </section>

                            <div className="space-y-4">
                                <EditableBlueprintSection planId={plan._id} title="Objective" field="objective" value={plan.objective} mode="text" />
                                {plan.sourceReferenceNotes && (
                                    <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                                        {plan.sourceReferenceNotes}
                                    </p>
                                )}
                                <EditableBlueprintSection planId={plan._id} title="Trainer guidance" field="trainerGuidance" value={plan.trainerGuidance} mode="text" />
                                <EditableBlueprintSection planId={plan._id} title="Key topics" field="keyTopics" value={plan.keyTopics} />
                                <EditableBlueprintSection planId={plan._id} title="Required knowledge" field="requiredKnowledge" value={plan.requiredKnowledge} />
                                <EditableBlueprintSection planId={plan._id} title="Practice scenarios" field="practiceScenarios" value={plan.practiceScenarios} />
                                <EditableBlueprintSection planId={plan._id} title="Assessment criteria" field="assessmentCriteria" value={plan.assessmentCriteria} />
                                <EditableBlueprintSection planId={plan._id} title="Roleplay prompts" field="rolePlayPrompts" value={plan.rolePlayPrompts} />
                                <EditableBlueprintSection planId={plan._id} title="Assessment questions" field="assessmentQuestions" value={plan.assessmentQuestions} />
                                <EditableBlueprintSection planId={plan._id} title="Common mistakes" field="commonMistakes" value={plan.commonMistakes} />
                                <EditableBlueprintSection planId={plan._id} title="Recommended assignments" field="recommendedAssignments" value={plan.recommendedAssignments} />
                                <EditableBlueprintSection planId={plan._id} title="Missing sections" field="missingSections" value={plan.missingSections} />
                            </div>
                        </div>
                    </section>

                    <aside
                        aria-hidden={!propertiesOpen}
                        className={`min-h-0 overflow-visible bg-transparent transition-[opacity,transform] duration-300 ease-out ${
                            propertiesOpen
                                ? "translate-x-0 opacity-100"
                                : "pointer-events-none translate-x-4 opacity-0"
                        }`}
                    >
                        <div className="h-full w-full overflow-x-visible overflow-y-auto px-4 py-6 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent] lg:w-[330px]">
                            <section className="rounded-xl border border-[var(--border-subtle)] bg-transparent p-2 shadow-sm">
                                <h2 className="mb-2 px-2 text-sm font-semibold text-[var(--text-primary)]">Properties</h2>
                                <dl className="space-y-1">
                                    <span className="relative block">
                                        <PropertyRow active={activeMenu === "property-status"} icon={<CircleDot className="size-4" />} label="Status" onClick={() => setActiveMenu(activeMenu === "property-status" ? null : "property-status")}>
                                            <span className="font-medium">{statusLabels[plan.status]}</span>
                                        </PropertyRow>
                                        {activeMenu === "property-status" && renderStatusMenu("property")}
                                    </span>
                                    <span className="relative block">
                                        <PropertyRow active={activeMenu === "property-goal"} icon={<span className="text-[var(--text-muted)]">{goalMeta[plan.goal]?.icon || <Sparkles className="size-4" />}</span>} label="Goal" onClick={() => setActiveMenu(activeMenu === "property-goal" ? null : "property-goal")}>
                                            {goalLabels[plan.goal] || plan.goal}
                                        </PropertyRow>
                                        {activeMenu === "property-goal" && renderGoalMenu("property")}
                                    </span>
                                    <span className="relative block">
                                        <PropertyRow active={activeMenu === "property-teams"} icon={<Users className="size-4" />} label="Teams" onClick={() => setActiveMenu(activeMenu === "property-teams" ? null : "property-teams")}>
                                            {plan.teams.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {plan.teams.map((team) => (
                                                        <span key={team._id} className="rounded-full px-2 py-1 text-xs font-semibold">
                                                            {team.identifier}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                "General"
                                            )}
                                        </PropertyRow>
                                        {activeMenu === "property-teams" && renderTeamsMenu("property")}
                                    </span>
                                    <span className="relative block">
                                        <PropertyRow active={activeMenu === "property-assignees"} hint={assigneeHint} icon={<Users className="size-4" />} label="Assignees" onClick={() => setActiveMenu(activeMenu === "property-assignees" ? null : "property-assignees")}>
                                            {assignmentState}
                                        </PropertyRow>
                                        {activeMenu === "property-assignees" && renderAssigneesMenu("property")}
                                    </span>
                                    <span className="relative block">
                                        <PropertyRow active={activeMenu === "property-sources"} icon={<BookOpenCheck className="size-4" />} label="Sources" onClick={() => setActiveMenu(activeMenu === "property-sources" ? null : "property-sources")}>
                                            {plan.sources.length}
                                        </PropertyRow>
                                        {activeMenu === "property-sources" && renderSourcesMenu("property")}
                                    </span>
                                    <PropertyRow icon={<Bot className="size-4" />} label="Drafted by">
                                        <span className="uppercase">{plan.generatedBy || "manual"}</span>
                                    </PropertyRow>
                                    <PropertyRow icon={<CalendarClock className="size-4" />} label="Created">
                                        {formatDate(plan.createdAt)}
                                    </PropertyRow>
                                    <PropertyRow icon={<CalendarClock className="size-4" />} label="Updated">
                                        {formatDate(plan.updatedAt)}
                                    </PropertyRow>
                                </dl>
                            </section>

                            <section className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-transparent p-2 shadow-sm">
                                <h2 className="mb-3 px-2 text-sm font-semibold text-[var(--text-primary)]">Lifecycle</h2>
                                <div className="space-y-2 px-2 text-xs text-[var(--text-secondary)]">
                                    {["review", "ready", "archived"].map((status) => (
                                        <div key={status} className="flex items-center gap-2">
                                            <span className={`size-2 rounded-full ${plan.status === status ? "bg-[#d97757]" : "bg-[var(--border-medium)]"}`} />
                                            <span className={plan.status === status ? "font-semibold text-[var(--text-primary)]" : ""}>
                                                {statusLabels[status as TrainingPlanStatus]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
};

export default TrainingBlueprintDetailClient;
