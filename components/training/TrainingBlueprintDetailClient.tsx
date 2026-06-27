"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
    Loader2,
    PanelRightClose,
    PanelRightOpen,
    PackageCheck,
    RotateCcw,
    Search,
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
    TrainingBlueprintIcon,
    trainingEmojiOptions,
    trainingIconColors,
    trainingIconOptions,
} from "@/components/training/TrainingBlueprintIcon";
import {
    regenerateTrainingPlan,
    updateTrainingPlanProperties,
    updateTrainingPlanSources,
    updateTrainingPlanStatus,
    type TrainingPlanDetail,
    type TrainingBlueprintRegenerationField,
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

const TRAINING_PROPERTIES_OPEN_KEY = "revise.training.propertiesPanel.open";

const getInitialPropertiesOpen = () => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(TRAINING_PROPERTIES_OPEN_KEY) !== "false";
};

const regenerationSectionOptions: Array<{ field: TrainingBlueprintRegenerationField; label: string }> = [
    { field: "objective", label: "Objective" },
    { field: "keyTopics", label: "Key topics" },
    { field: "requiredKnowledge", label: "Required knowledge" },
    { field: "practiceScenarios", label: "Practice scenarios" },
    { field: "assessmentCriteria", label: "Assessment criteria" },
    { field: "rolePlayPrompts", label: "Roleplay prompts" },
    { field: "assessmentQuestions", label: "Assessment questions" },
    { field: "commonMistakes", label: "Common mistakes" },
    { field: "recommendedAssignments", label: "Recommended assignments" },
    { field: "missingSections", label: "Missing sections" },
];

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
    iconKey,
    iconColor,
    onDraftChange,
}: {
    planId: string;
    title: string;
    description?: string;
    iconKey?: string;
    iconColor?: string;
    onDraftChange: (draft: { title: string; description: string }) => void;
}) => {
    const [editing, setEditing] = useState<"title" | "description" | null>(null);
    const [draftTitle, setDraftTitle] = useState(title);
    const [draftDescription, setDraftDescription] = useState(description || "");
    const [draftIconKey, setDraftIconKey] = useState(iconKey || "clipboard");
    const [draftIconColor, setDraftIconColor] = useState(iconColor || trainingIconColors[0]);
    const [iconPickerOpen, setIconPickerOpen] = useState(false);
    const [iconTab, setIconTab] = useState<"icons" | "emojis">("icons");
    const [isPending, startTransition] = useTransition();
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const savedRef = useRef({ title, description: description || "" });

    useEffect(() => {
        const activeRef = editing === "title" ? titleRef : editing === "description" ? descriptionRef : null;
        activeRef?.current?.focus();
        activeRef?.current?.setSelectionRange(activeRef.current.value.length, activeRef.current.value.length);
    }, [editing]);

    const persist = useCallback((nextTitle = draftTitle, nextDescription = draftDescription) => {
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
    }, [description, draftDescription, draftTitle, planId, title]);

    const persistIcon = (nextIconKey = draftIconKey, nextIconColor = draftIconColor) => {
        setDraftIconKey(nextIconKey);
        setDraftIconColor(nextIconColor);

        startTransition(async () => {
            const result = await updateTrainingPlanProperties({
                planId,
                iconKey: nextIconKey,
                iconColor: nextIconColor,
            });

            if (!result.success) {
                toast.error(result.error);
            }
        });
    };

    useEffect(() => {
        if (!editing) return;

        const timeout = window.setTimeout(() => persist(), 750);

        return () => window.clearTimeout(timeout);
    }, [draftTitle, draftDescription, editing, persist]);

    return (
        <div className={`group/title mb-6 ${isPending ? "opacity-95" : ""}`}>
            <div className="relative mb-4 inline-flex">
                <button
                    type="button"
                    onClick={() => setIconPickerOpen((current) => !current)}
                    className="flex size-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]"
                    style={{ color: draftIconColor }}
                >
                    <TrainingBlueprintIcon iconKey={draftIconKey} iconColor={draftIconColor} className="size-5" />
                    <span className="sr-only">Change module icon</span>
                </button>
                <div
                    className={`absolute left-0 top-full z-[260] mt-2 w-[min(23rem,calc(100vw-3rem))] origin-top rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_18px_48px_rgba(15,23,42,0.18)] transition-[opacity,transform,visibility] duration-200 ${
                        iconPickerOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-[0.98] opacity-0"
                    }`}
                >
                    <div className="flex border-b border-[var(--border-subtle)] px-3 pt-3">
                        {(["icons", "emojis"] as const).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setIconTab(tab)}
                                className={`border-b-2 px-3 pb-2 text-sm font-semibold capitalize transition ${
                                    iconTab === tab
                                        ? "border-[#6366f1] text-[var(--text-primary)]"
                                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                            {trainingIconColors.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => persistIcon(draftIconKey, color)}
                                    className={`flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-[var(--surface-elevated)] transition ${draftIconColor === color ? "ring-2 ring-[var(--text-primary)]" : ""}`}
                                    style={{ backgroundColor: color }}
                                >
                                    {draftIconColor === color && <Check className="size-3.5 text-white" />}
                                    <span className="sr-only">Use color {color}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-3 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                        {iconTab === "icons" ? (
                            <div className="grid grid-cols-7 gap-1.5">
                                {trainingIconOptions.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => {
                                            persistIcon(option.key, draftIconColor);
                                            setIconPickerOpen(false);
                                        }}
                                        className={`flex size-9 items-center justify-center rounded-lg transition ${
                                            draftIconKey === option.key
                                                ? "bg-[#d97757]/10"
                                                : "hover:bg-[var(--surface-hover)]"
                                        }`}
                                        title={option.label}
                                    >
                                        <TrainingBlueprintIcon iconKey={option.key} iconColor={draftIconColor} className="size-4" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-6 gap-1.5">
                                {trainingEmojiOptions.map((emoji) => {
                                    const key = `emoji:${emoji}`;

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                persistIcon(key, draftIconColor);
                                                setIconPickerOpen(false);
                                            }}
                                            className={`flex size-9 items-center justify-center rounded-lg text-lg transition ${
                                                draftIconKey === key
                                                    ? "bg-[#d97757]/10"
                                                    : "hover:bg-[var(--surface-hover)]"
                                            }`}
                                        >
                                            {emoji}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
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

const RegenerateDraftModal = ({
    open,
    defaultMode,
    selectedSection,
    sectionDropdownOpen,
    feedback,
    sourceChanged,
    isPending,
    onClose,
    onModeChange,
    onSectionChange,
    onSectionDropdownOpenChange,
    onFeedbackChange,
    onSubmit,
}: {
    open: boolean;
    defaultMode: "full" | "section";
    selectedSection: TrainingBlueprintRegenerationField;
    sectionDropdownOpen: boolean;
    feedback: string;
    sourceChanged: boolean;
    isPending: boolean;
    onClose: () => void;
    onModeChange: (mode: "full" | "section") => void;
    onSectionChange: (field: TrainingBlueprintRegenerationField) => void;
    onSectionDropdownOpenChange: (open: boolean) => void;
    onFeedbackChange: (value: string) => void;
    onSubmit: () => void;
}) => {
    const selectedSectionOption = regenerationSectionOptions.find((option) => option.field === selectedSection) || regenerationSectionOptions[0];

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isPending) onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isPending, onClose, open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-[2px]">
            <button
                type="button"
                aria-label="Close regenerate draft dialog"
                className="absolute inset-0 cursor-default"
                onClick={isPending ? undefined : onClose}
            />
            <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-visible rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
                    <div>
                        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[#d97757]">
                            <RotateCcw className="size-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Regenerate draft</h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                            Refresh the whole training module or target one section with specific feedback.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </header>

                <div className="min-h-0 overflow-visible px-6 py-5">
                    {sourceChanged && (
                        <div className="mb-4 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                            Linked sources changed. Regenerating the entire draft will rebuild it from the current sources.
                        </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2">
                        {([
                            ["full", "Entire draft", "Best when the overall plan needs a fresh pass."],
                            ["section", "One section", "Best when only one part needs a tighter rewrite."],
                        ] as const).map(([mode, label, helper]) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onModeChange(mode)}
                                disabled={isPending}
                                className={`rounded-xl border px-4 py-3 text-left transition ${
                                    defaultMode === mode
                                        ? "border-[#d97757]/60 bg-[#d97757]/10 text-[var(--text-primary)]"
                                        : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                                }`}
                            >
                                <span className="block text-sm font-semibold">{label}</span>
                                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{helper}</span>
                            </button>
                        ))}
                    </div>

                    {defaultMode === "section" && (
                        <div className="mt-4 overflow-visible">
                            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                Section
                            </label>
                            <div className="relative mt-2">
                                <button
                                    type="button"
                                    onClick={() => onSectionDropdownOpenChange(!sectionDropdownOpen)}
                                    disabled={isPending}
                                    className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition ${
                                        sectionDropdownOpen
                                            ? "border-[#d97757]/60 bg-[#d97757]/10 text-[var(--text-primary)]"
                                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                    } disabled:opacity-60`}
                                >
                                    <span className="min-w-0 truncate">{selectedSectionOption.label}</span>
                                    <ChevronRight className={`size-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${sectionDropdownOpen ? "rotate-90" : ""}`} />
                                </button>
                                <div
                                    className={`absolute bottom-full left-0 right-0 z-[540] mb-2 origin-bottom rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.22)] transition-[opacity,transform,visibility] duration-200 ease-out [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent] ${
                                        sectionDropdownOpen
                                            ? "visible translate-y-0 scale-100 opacity-100"
                                            : "invisible translate-y-1 scale-[0.98] opacity-0"
                                    }`}
                                >
                                    <div className="max-h-64 overflow-y-auto pr-1">
                                        {regenerationSectionOptions.map((option) => (
                                            <button
                                                key={option.field}
                                                type="button"
                                                onClick={() => {
                                                    onSectionChange(option.field);
                                                    onSectionDropdownOpenChange(false);
                                                }}
                                                disabled={isPending}
                                                className={`flex h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm font-medium transition ${
                                                    selectedSection === option.field
                                                        ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                }`}
                                            >
                                                <span className="min-w-0 truncate">{option.label}</span>
                                                {selectedSection === option.field && <Check className="size-4 shrink-0 text-[#d97757]" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Feedback
                        </label>
                        <textarea
                            value={feedback}
                            onChange={(event) => onFeedbackChange(event.target.value)}
                            placeholder="Tell AI what should change..."
                            disabled={isPending}
                            className="mt-2 min-h-28 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-medium)] disabled:opacity-60"
                        />
                    </div>
                </div>

                <footer className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={isPending}
                        className="inline-flex h-9 items-center gap-2 rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                        {isPending ? "Regenerating" : defaultMode === "section" ? "Regenerate section" : "Regenerate draft"}
                    </button>
                </footer>
            </section>
        </div>,
        document.body,
    );
};

const SourceSelectionModal = ({
    open,
    sources,
    linkedSourceIds,
    selectedSourceIds,
    planTeamIds,
    search,
    tab,
    isPending,
    onClose,
    onSearchChange,
    onTabChange,
    onToggleSource,
    onSave,
}: {
    open: boolean;
    sources: TrainingPlanDetail["availableSources"];
    linkedSourceIds: string[];
    selectedSourceIds: string[];
    planTeamIds: string[];
    search: string;
    tab: "recommended" | "all";
    isPending: boolean;
    onClose: () => void;
    onSearchChange: (value: string) => void;
    onTabChange: (tab: "recommended" | "all") => void;
    onToggleSource: (sourceId: string) => void;
    onSave: () => void;
}) => {
    const recommendedSources = useMemo(() => {
        if (planTeamIds.length === 0) return sources;

        return sources.filter((source) => {
            if (source.scope !== "teams") return true;
            const sourceTeamIds = source.teamIds || [];
            return sourceTeamIds.some((teamId) => planTeamIds.includes(teamId));
        });
    }, [planTeamIds, sources]);
    const visibleBase = tab === "recommended" ? recommendedSources : sources;
    const normalizedSearch = search.trim().toLowerCase();
    const visibleSources = visibleBase.filter((source) => {
        if (!normalizedSearch) return true;
        return [source.title, source.description, source.sourceType]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedSearch));
    });

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isPending) onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isPending, onClose, open]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-[2px]">
            <button
                type="button"
                aria-label="Close add source dialog"
                className="absolute inset-0 cursor-default"
                onClick={isPending ? undefined : onClose}
            />
            <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                <header className="border-b border-[var(--border-subtle)] px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[#d97757]">
                                <BookOpenCheck className="size-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add sources</h2>
                            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                                Attach ready knowledge sources to this training module.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                        >
                            <X className="size-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3">
                            <Search className="size-4 shrink-0 text-[var(--text-muted)]" />
                            <input
                                value={search}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Search sources..."
                                className="h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                            />
                        </div>
                        <div className="inline-flex h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-1">
                            {([
                                ["recommended", "Recommended", recommendedSources.length],
                                ["all", "All workspace", sources.length],
                            ] as const).map(([value, label, count]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => onTabChange(value)}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                                        tab === value
                                            ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    {label}
                                    <span className="text-[10px] text-[var(--text-muted)]">{count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="min-h-0 overflow-y-auto px-6 py-4 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                    <div className="space-y-2">
                        {visibleSources.map((source) => {
                            const selected = selectedSourceIds.includes(source._id);
                            const linked = linkedSourceIds.includes(source._id);

                            return (
                                <button
                                    key={source._id}
                                    type="button"
                                    onClick={() => onToggleSource(source._id)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                        selected
                                            ? "border-[#d97757]/60 bg-[#d97757]/10"
                                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--surface-hover)]"
                                    }`}
                                >
                                    <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded border ${selected ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)] text-transparent"}`}>
                                        <Check className="size-3.5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{source.title}</span>
                                        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                                            {sourceTypeLabels[source.sourceType] || source.sourceType} - v{source.version}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-2">
                                        {linked && (
                                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                                linked
                                            </span>
                                        )}
                                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-semibold capitalize text-[var(--text-muted)]">
                                            {source.scope === "teams" ? "team" : "workspace"}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                        {visibleSources.length === 0 && (
                            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-8 text-center">
                                <p className="text-sm font-semibold text-[var(--text-primary)]">No sources found</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">
                                    Try another search or switch to all workspace sources.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                        {selectedSourceIds.length} selected
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={isPending || selectedSourceIds.length === 0}
                            className="inline-flex h-9 items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-50"
                        >
                            Save sources
                        </button>
                    </div>
                </footer>
            </section>
        </div>,
        document.body,
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
    const [propertiesOpen, setPropertiesOpen] = useState(getInitialPropertiesOpen);
    const [favorite, setFavorite] = useState(false);
    const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null);
    const [sourceModalOpen, setSourceModalOpen] = useState(false);
    const [sourceSearch, setSourceSearch] = useState("");
    const [sourceTab, setSourceTab] = useState<"recommended" | "all">("recommended");
    const [selectedSourceIds, setSelectedSourceIds] = useState(plan.sourceIds);
    const [regenerationOpen, setRegenerationOpen] = useState(false);
    const [regenerationMode, setRegenerationMode] = useState<"full" | "section">("full");
    const [regenerationSection, setRegenerationSection] = useState<TrainingBlueprintRegenerationField>("objective");
    const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
    const [regenerationFeedback, setRegenerationFeedback] = useState("");
    const [headerDraft, setHeaderDraft] = useState({
        title: plan.title,
        description: plan.description || "",
    });
    const [isPending, startTransition] = useTransition();

    const setStoredPropertiesOpen = useCallback((value: boolean | ((current: boolean) => boolean)) => {
        setPropertiesOpen((current) => {
            const next = typeof value === "function" ? value(current) : value;
            window.localStorage.setItem(TRAINING_PROPERTIES_OPEN_KEY, String(next));
            return next;
        });
    }, []);

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
            setSourceModalOpen(false);
            setSourceSearch("");
            setSourceTab("recommended");
            router.refresh();
        });
    };

    const removeSource = (sourceId: string) => {
        const nextSourceIds = plan.sourceIds.filter((id) => id !== sourceId);
        setSelectedSourceIds(nextSourceIds);
        saveSourceSelection(nextSourceIds);
    };

    const openRegenerationModal = (
        mode: "full" | "section" = "full",
        sectionField: TrainingBlueprintRegenerationField = "objective",
    ) => {
        setRegenerationMode(mode);
        setRegenerationSection(sectionField);
        setSectionDropdownOpen(false);
        setRegenerationOpen(true);
    };

    const closeRegenerationModal = () => {
        setSectionDropdownOpen(false);
        setRegenerationOpen(false);
    };

    const updateRegenerationMode = (mode: "full" | "section") => {
        setSectionDropdownOpen(false);
        setRegenerationMode(mode);
    };

    const regenerateDraft = () => {
        startTransition(async () => {
            const result = await regenerateTrainingPlan({
                planId: plan._id,
                feedback: regenerationFeedback,
                sectionField: regenerationMode === "section" ? regenerationSection : undefined,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(
                result.data.generationStatus === "queued"
                    ? "Regeneration needs a larger background pass."
                    : regenerationMode === "section"
                      ? "Section regenerated."
                      : "Draft regenerated.",
            );
            setRegenerationFeedback("");
            closeRegenerationModal();
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
                setStoredPropertiesOpen((current) => !current);
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [nextHref, previousHref, router, setStoredPropertiesOpen]);

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
                    planId={plan._id}
                    workspaceSlug={workspaceSlug}
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
            <RegenerateDraftModal
                open={regenerationOpen}
                defaultMode={regenerationMode}
                selectedSection={regenerationSection}
                sectionDropdownOpen={sectionDropdownOpen}
                feedback={regenerationFeedback}
                sourceChanged={sourceNeedsRegeneration}
                isPending={isPending}
                onClose={closeRegenerationModal}
                onModeChange={updateRegenerationMode}
                onSectionChange={setRegenerationSection}
                onSectionDropdownOpenChange={setSectionDropdownOpen}
                onFeedbackChange={setRegenerationFeedback}
                onSubmit={regenerateDraft}
            />
            <SourceSelectionModal
                open={sourceModalOpen}
                sources={plan.availableSources}
                linkedSourceIds={plan.sourceIds}
                selectedSourceIds={selectedSourceIds}
                planTeamIds={selectedTeamIds}
                search={sourceSearch}
                tab={sourceTab}
                isPending={isPending}
                onClose={() => setSourceModalOpen(false)}
                onSearchChange={setSourceSearch}
                onTabChange={setSourceTab}
                onToggleSource={toggleSelectedSource}
                onSave={() => saveSourceSelection()}
            />
            <div className="flex h-[calc(100vh-1rem)] flex-col overflow-hidden bg-transparent">
                <header className="relative z-[80] shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                    <div className="flex h-12 items-center justify-between gap-3 px-5">
                        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap text-sm font-medium text-[var(--text-muted)]">
                            <Link href={`/${workspaceSlug}/modules`} className="shrink-0 transition hover:text-[var(--text-primary)]">
                                Training modules
                            </Link>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="shrink-0">{teamLabel}</span>
                            <ChevronRight className="size-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{headerDraft.title}</span>
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
                                onClick={() => setStoredPropertiesOpen((current) => !current)}
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
                                iconKey={plan.iconKey}
                                iconColor={plan.iconColor}
                                onDraftChange={setHeaderDraft}
                            />

                            <div className="mb-5 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => openRegenerationModal(sourceNeedsRegeneration ? "full" : "section")}
                                    disabled={isPending}
                                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                    Regenerate
                                </button>
                            </div>

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
                                            onClick={() => openRegenerationModal("full")}
                                            disabled={isPending}
                                            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-[#d97757] px-3 text-xs font-semibold text-white transition hover:bg-[#c76647] disabled:opacity-50"
                                        >
                                            Review regeneration
                                        </button>
                                    </div>
                                </div>
                            )}

                            <section className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                                <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Sources</h2>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSourceIds(plan.sourceIds);
                                            setSourceSearch("");
                                            setSourceTab("recommended");
                                            setSourceModalOpen(true);
                                        }}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                    >
                                        + Add source
                                    </button>
                                </div>
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
                                <EditableBlueprintSection key={`objective-${plan.objective || ""}`} planId={plan._id} title="Objective" field="objective" value={plan.objective} mode="text" />
                                {plan.sourceReferenceNotes && (
                                    <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                                        {plan.sourceReferenceNotes}
                                    </p>
                                )}
                                <EditableBlueprintSection key={`trainerGuidance-${plan.trainerGuidance || ""}`} planId={plan._id} title="Trainer guidance" field="trainerGuidance" value={plan.trainerGuidance} mode="text" />
                                <EditableBlueprintSection key={`keyTopics-${plan.keyTopics.join("\u001f")}`} planId={plan._id} title="Key topics" field="keyTopics" value={plan.keyTopics} />
                                <EditableBlueprintSection key={`requiredKnowledge-${plan.requiredKnowledge.join("\u001f")}`} planId={plan._id} title="Required knowledge" field="requiredKnowledge" value={plan.requiredKnowledge} />
                                <EditableBlueprintSection key={`practiceScenarios-${plan.practiceScenarios.join("\u001f")}`} planId={plan._id} title="Practice scenarios" field="practiceScenarios" value={plan.practiceScenarios} />
                                <EditableBlueprintSection key={`assessmentCriteria-${plan.assessmentCriteria.join("\u001f")}`} planId={plan._id} title="Assessment criteria" field="assessmentCriteria" value={plan.assessmentCriteria} />
                                <EditableBlueprintSection key={`rolePlayPrompts-${plan.rolePlayPrompts.join("\u001f")}`} planId={plan._id} title="Roleplay prompts" field="rolePlayPrompts" value={plan.rolePlayPrompts} />
                                <EditableBlueprintSection key={`assessmentQuestions-${plan.assessmentQuestions.join("\u001f")}`} planId={plan._id} title="Assessment questions" field="assessmentQuestions" value={plan.assessmentQuestions} />
                                <EditableBlueprintSection key={`commonMistakes-${plan.commonMistakes.join("\u001f")}`} planId={plan._id} title="Common mistakes" field="commonMistakes" value={plan.commonMistakes} />
                                <EditableBlueprintSection key={`recommendedAssignments-${plan.recommendedAssignments.join("\u001f")}`} planId={plan._id} title="Recommended assignments" field="recommendedAssignments" value={plan.recommendedAssignments} />
                                <EditableBlueprintSection key={`missingSections-${plan.missingSections.join("\u001f")}`} planId={plan._id} title="Missing sections" field="missingSections" value={plan.missingSections} />
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
