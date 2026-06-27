"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    BookOpen,
    BriefcaseBusiness,
    Check,
    ChevronDown,
    ChevronRight,
    Cloud,
    FileAudio,
    FileCheck2,
    FileText,
    Globe2,
    GraduationCap,
    Headphones,
    Link2,
    ListChecks,
    LucideIcon,
    NotebookText,
    ShieldCheck,
    Sparkles,
    Upload,
    UsersRound,
    XCircle,
    X,
} from "lucide-react";
import { z } from "zod";
import FileUploader from "@/components/FileUploader";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS } from "@/lib/constants";
import { processUploadedKnowledgeSource } from "@/lib/actions/knowledge.actions";
import { prepareTrainingBlueprintDraft } from "@/lib/actions/training.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";
import { KnowledgeSourceUploadSchema } from "@/lib/zod";
import type { TeamSummary } from "@/lib/actions/workspace.actions";

const NEW_SOURCE_EVENT = "revise:new-source";

type KnowledgeSourceUploadValues = z.infer<typeof KnowledgeSourceUploadSchema>;
type SourceOrigin = "upload" | "paste" | "url" | "cloud" | "media";
type SourceIconKey = "book" | "policy" | "checklist" | "support" | "sales" | "training" | "compliance" | "knowledge";

const sourceTypeOptions = [
    { value: "sop", label: "SOP", description: "Repeatable operating procedures and team workflows." },
    { value: "handbook", label: "Handbook", description: "Employee, company, or department handbooks." },
    { value: "sales-script", label: "Sales script", description: "Talk tracks, discovery guides, and objection handling." },
    { value: "support-policy", label: "Support policy", description: "Escalation, response, and customer care policies." },
    { value: "onboarding-guide", label: "Onboarding guide", description: "New hire ramp-up and role familiarization guides." },
    { value: "compliance-policy", label: "Compliance policy", description: "Rules, standards, and mandatory knowledge checks." },
    { value: "knowledge-base", label: "Knowledge base", description: "General reference material used across teams." },
    { value: "other", label: "Other", description: "A source that does not fit the default categories yet." },
] as const;

const sourceOrigins: Array<{
    value: SourceOrigin;
    label: string;
    description: string;
    icon: LucideIcon;
}> = [
    { value: "upload", label: "Upload files", description: "PDF, TXT, and Markdown sources", icon: Upload },
    { value: "paste", label: "Paste text", description: "Draft SOPs, notes, or policy text", icon: FileText },
    { value: "url", label: "Import URL", description: "Web pages and public knowledge docs", icon: Link2 },
    { value: "cloud", label: "Cloud storage", description: "Drive, OneDrive, Dropbox, SharePoint", icon: Cloud },
    { value: "media", label: "Audio or video", description: "Recordings, calls, and walkthroughs", icon: FileAudio },
];

const sourceIcons: Array<{ key: SourceIconKey; icon: LucideIcon; label: string }> = [
    { key: "book", icon: BookOpen, label: "Book" },
    { key: "policy", icon: ShieldCheck, label: "Policy" },
    { key: "checklist", icon: ListChecks, label: "Checklist" },
    { key: "support", icon: Headphones, label: "Support" },
    { key: "sales", icon: BriefcaseBusiness, label: "Sales" },
    { key: "training", icon: GraduationCap, label: "Training" },
    { key: "compliance", icon: FileCheck2, label: "Compliance" },
    { key: "knowledge", icon: NotebookText, label: "Knowledge" },
];

const sourceColors = ["#d97757", "#6366f1", "#0ea5e9", "#16a34a", "#eab308", "#dc2626", "#9333ea", "#475569"];

export const openNewSourceModal = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(NEW_SOURCE_EVENT));
};

const getUploadContentType = (file: File) => {
    if (file.type) return file.type;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf")) return "application/pdf";
    if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) return "text/markdown";

    return "text/plain";
};

const getFileTitle = (title: string, file: File, fileCount: number) => {
    if (fileCount === 1) return title.trim();

    const fileTitle = file.name.replace(/\.[^/.]+$/, "").trim();
    return fileTitle || title.trim();
};

const PropertyPill = ({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition ${
            active
                ? "border-[#d97757]/35 bg-[#d97757]/10 text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        }`}
    >
        <Icon className="size-3.5" />
        <span>{label}</span>
        <ChevronDown className={`size-3.5 text-[var(--text-muted)] transition ${active ? "rotate-180" : ""}`} />
    </button>
);

const DropdownShell = ({ children, width = "w-80" }: { children: ReactNode; width?: string }) => (
    <div
        className={`absolute left-0 top-full z-[150] mt-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-lg)] [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--text-muted)_42%,transparent)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-[var(--border-medium)] ${width}`}
    >
        {children}
    </div>
);

const NewSourceModal = ({ workspaceSlug }: { workspaceSlug?: string }) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [resolvedWorkspaceSlug, setResolvedWorkspaceSlug] = useState(workspaceSlug);
    const [teams, setTeams] = useState<TeamSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string>();
    const [origin, setOrigin] = useState<SourceOrigin>("upload");
    const [selectedIcon, setSelectedIcon] = useState<SourceIconKey>("book");
    const [selectedColor, setSelectedColor] = useState(sourceColors[0]);
    const [openPicker, setOpenPicker] = useState<"icon" | "origin" | "type" | "access" | "teams" | null>(null);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const [isMac, setIsMac] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");
    const [prepareBlueprint, setPrepareBlueprint] = useState(false);
    const [trainerGuidance, setTrainerGuidance] = useState("");

    const form = useForm<KnowledgeSourceUploadValues>({
        resolver: zodResolver(KnowledgeSourceUploadSchema),
        mode: "onChange",
        defaultValues: {
            title: "",
            description: "",
            sourceType: "sop",
            scope: "workspace",
            teamIds: [],
            files: [],
        },
    });
    const title = form.watch("title");
    const sourceType = form.watch("sourceType");
    const scope = form.watch("scope");
    const selectedTeamIds = form.watch("teamIds");
    const files = form.watch("files");
    const activeOrigin = sourceOrigins.find((item) => item.value === origin) || sourceOrigins[0];
    const activeType = sourceTypeOptions.find((item) => item.value === sourceType) || sourceTypeOptions[0];
    const activeIcon = sourceIcons.find((item) => item.key === selectedIcon) || sourceIcons[0];
    const ActiveIcon = activeIcon.icon;
    const uploadReady = origin === "upload" && Boolean(resolvedWorkspaceSlug) && form.formState.isValid && !submitting;
    const previewReady =
        origin === "paste"
            ? title.trim().length >= 2 && pasteText.trim().length > 0
            : origin === "url"
              ? title.trim().length >= 2 && sourceUrl.trim().length > 0
              : title.trim().length >= 2;
    const canSubmit = origin === "upload" ? uploadReady : previewReady && !submitting;
    const hasDraft =
        form.formState.isDirty ||
        files.length > 0 ||
        pasteText.trim().length > 0 ||
        sourceUrl.trim().length > 0 ||
        trainerGuidance.trim().length > 0 ||
        prepareBlueprint ||
        origin !== "upload" ||
        selectedIcon !== "book" ||
        selectedColor !== sourceColors[0];

    useEffect(() => {
        if (workspaceSlug) setResolvedWorkspaceSlug(workspaceSlug);
    }, [workspaceSlug]);

    useEffect(() => {
        setIsMac(navigator.platform.toLowerCase().includes("mac"));
    }, []);

    useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener(NEW_SOURCE_EVENT, handleOpen);

        return () => window.removeEventListener(NEW_SOURCE_EVENT, handleOpen);
    }, []);

    useEffect(() => {
        let mounted = true;

        if (!open || (resolvedWorkspaceSlug && teams.length > 0)) return;

        setLoading(true);
        setError(undefined);

        getWorkspaceTeamData()
            .then((result) => {
                if (!mounted) return;

                if (!result.success) {
                    setError(result.error);
                    return;
                }

                setResolvedWorkspaceSlug((current) => current || result.data.activeWorkspace.slug);
                setTeams(result.data.teams);
            })
            .catch(() => {
                if (mounted) setError("Could not load workspace teams.");
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [open, resolvedWorkspaceSlug, teams.length]);

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (openPicker) {
                    setOpenPicker(null);
                    return;
                }

                if (submitting) return;
                if (hasDraft) {
                    setConfirmDiscardOpen(true);
                    return;
                }

                setOpen(false);
            }
        };
        const handlePointerDown = (event: MouseEvent) => {
            if (!openPicker) return;
            const target = event.target as HTMLElement | null;

            if (!target?.closest("[data-source-picker-root]")) {
                setOpenPicker(null);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handlePointerDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handlePointerDown);
            document.body.style.overflow = "";
        };
    }, [hasDraft, open, openPicker, submitting]);

    const selectedTeams = useMemo(
        () => teams.filter((team) => selectedTeamIds.includes(team._id)),
        [selectedTeamIds, teams],
    );

    const toggleTeam = (teamId: string) => {
        const nextTeamIds = selectedTeamIds.includes(teamId)
            ? selectedTeamIds.filter((id) => id !== teamId)
            : [...selectedTeamIds, teamId];

        form.setValue("teamIds", nextTeamIds, { shouldDirty: true, shouldValidate: true });
    };

    const resetModal = () => {
        form.reset();
        setOrigin("upload");
        setSelectedIcon("book");
        setSelectedColor(sourceColors[0]);
        setOpenPicker(null);
        setConfirmDiscardOpen(false);
        setPasteText("");
        setSourceUrl("");
        setPrepareBlueprint(false);
        setTrainerGuidance("");
    };

    const closeModal = () => {
        if (submitting) return;
        if (hasDraft) {
            setConfirmDiscardOpen(true);
            return;
        }

        setOpen(false);
        setOpenPicker(null);
    };

    const discardModal = () => {
        resetModal();
        setOpen(false);
    };

    const onSubmit = async (data: KnowledgeSourceUploadValues) => {
        if (origin !== "upload") {
            toast.message(`${activeOrigin.label} is ready in the UI. Backend connection comes next.`);
            return;
        }

        if (!resolvedWorkspaceSlug) return;

        setSubmitting(true);

        try {
            const failedUploads: string[] = [];
            const uploadedSourceIds: string[] = [];

            for (const file of data.files) {
                try {
                    const pathname = `knowledge/${crypto.randomUUID()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;
                    const contentType = getUploadContentType(file);
                    const blob = await upload(pathname, file, {
                        access: "private",
                        handleUploadUrl: "/api/knowledge/upload",
                        contentType,
                    });
                    const result = await processUploadedKnowledgeSource({
                        title: getFileTitle(data.title, file, data.files.length),
                        description: data.description,
                        sourceType: data.sourceType,
                        scope: data.scope,
                        teamIds: data.scope === "teams" ? data.teamIds : [],
                        fileName: file.name,
                        mimeType: contentType,
                        fileSize: file.size,
                        fileUrl: blob.url,
                        fileBlobKey: blob.pathname,
                    });

                    if (!result.success) {
                        failedUploads.push(`${file.name}: ${result.error}`);
                    } else {
                        uploadedSourceIds.push(result.data._id);
                    }
                } catch (error) {
                    failedUploads.push(
                        `${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`,
                    );
                }
            }

            if (failedUploads.length > 0) {
                toast.warning(
                    uploadedSourceIds.length > 0
                        ? `${uploadedSourceIds.length} source${uploadedSourceIds.length === 1 ? "" : "s"} created; ${failedUploads.length} failed.`
                        : `${failedUploads.length} source file${failedUploads.length === 1 ? "" : "s"} could not be processed.`,
                );
                if (uploadedSourceIds.length === 0) return;
            }

            const nextHref = uploadedSourceIds.length === 1
                ? `/${resolvedWorkspaceSlug}/knowledge/${uploadedSourceIds[0]}`
                : `/${resolvedWorkspaceSlug}/knowledge`;
            if (prepareBlueprint) {
                const blueprintResult = await prepareTrainingBlueprintDraft({
                    sourceIds: uploadedSourceIds,
                    trainerGuidance,
                });

                if (!blueprintResult.success) {
                    toast.error(blueprintResult.error);
                    setOpen(false);
                    resetModal();
                    router.push(nextHref);
                    router.refresh();
                    return;
                }

                const blueprintHref = `/${resolvedWorkspaceSlug}/modules/${blueprintResult.data._id}`;
                toast.success(
                    blueprintResult.data.generationStatus === "queued"
                        ? "Blueprint generation queued"
                        : "Training blueprint ready",
                    {
                        description: blueprintResult.data.title,
                        duration: 12000,
                        action: {
                            label: "Review",
                            onClick: () => router.push(blueprintHref),
                        },
                    },
                );
                setOpen(false);
                resetModal();
                router.push(blueprintHref);
                router.refresh();
                return;
            }

            toast.success(data.files.length === 1 ? "Source created" : "Sources created", {
                description: data.files.length === 1 ? getFileTitle(data.title, data.files[0], data.files.length) : `${data.files.length} sources uploaded`,
                duration: 12000,
                action: {
                    label: uploadedSourceIds.length === 1 ? "View source" : "View sources",
                    onClick: () => router.push(nextHref),
                },
            });
            setOpen(false);
            resetModal();
            router.push(nextHref);
            router.refresh();
        } catch (uploadError) {
            console.error(uploadError);
            toast.error("Failed to upload knowledge source.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderOriginBody = () => {
        if (origin === "upload") {
            return (
                <FileUploader
                    control={form.control}
                    name="files"
                    label="Knowledge source file"
                    acceptTypes={ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS}
                    icon={Upload}
                    placeholder="Drop source files here or click to upload"
                    hint="PDF, TXT, or Markdown files, up to 25MB each"
                    disabled={submitting}
                    multiple
                />
            );
        }

        if (origin === "paste") {
            return (
                <div className="min-h-[220px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                    <textarea
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                        placeholder="Paste an SOP, policy, script, or internal note..."
                        className="min-h-[200px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    />
                </div>
            );
        }

        if (origin === "url") {
            return (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        Source URL
                    </label>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3">
                        <Globe2 className="size-4 text-[var(--text-muted)]" />
                        <input
                            value={sourceUrl}
                            onChange={(event) => setSourceUrl(event.target.value)}
                            placeholder="https://company.com/policy"
                            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                        />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                        This will become the place for importing public docs, help-center pages, and internal knowledge URLs.
                    </p>
                </div>
            );
        }

        if (origin === "cloud") {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    {["Google Drive", "OneDrive", "Dropbox", "SharePoint"].map((provider) => (
                        <button
                            key={provider}
                            type="button"
                            onClick={() => toast.message(`${provider} connection UI is staged for the next integration pass.`)}
                            className="flex h-24 items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 text-left transition hover:bg-[var(--surface-hover)]"
                        >
                            <span>
                                <span className="block text-sm font-semibold text-[var(--text-primary)]">{provider}</span>
                                <span className="mt-1 block text-xs text-[var(--text-muted)]">Import source files</span>
                            </span>
                            <ChevronRight className="size-4 text-[var(--text-muted)]" />
                        </button>
                    ))}
                </div>
            );
        }

        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {["Upload audio", "Upload video", "Record voice note", "Import meeting"].map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => toast.message(`${item} UI is staged for transcription support.`)}
                        className="flex h-24 items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 text-left transition hover:bg-[var(--surface-hover)]"
                    >
                        <span>
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">{item}</span>
                            <span className="mt-1 block text-xs text-[var(--text-muted)]">Turn spoken knowledge into source text</span>
                        </span>
                        <ChevronRight className="size-4 text-[var(--text-muted)]" />
                    </button>
                ))}
            </div>
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-3 py-5 backdrop-blur-[2px] sm:px-6">
            <button
                type="button"
                aria-label="Close new source modal"
                className="absolute inset-0 cursor-default"
                onClick={closeModal}
            />
            <section className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[var(--surface-elevated)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-5 top-5 z-20 inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                </button>

                {confirmDiscardOpen && (
                    <div className="absolute inset-0 z-[170] flex items-center justify-center bg-black/20 px-4 backdrop-blur-[1px]">
                        <section className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
                            <div className="mb-5 flex items-start gap-3">
                                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                                    <XCircle className="size-5" />
                                </span>
                                <div>
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Discard this source?</h3>
                                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                                        Confirm that you want to discard this source.
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmDiscardOpen(false)}
                                    className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={discardModal}
                                    className="inline-flex h-9 items-center rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
                                >
                                    Discard
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-14 pt-6 sm:px-10 sm:pt-8">
                                <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                                    <BookOpen className="size-3.5 text-[#d97757]" />
                                    <span>New source</span>
                                </div>

                                <div className="relative mb-4" data-source-picker-root>
                                    <button
                                        type="button"
                                        onClick={() => setOpenPicker(openPicker === "icon" ? null : "icon")}
                                        className="flex size-8 items-center justify-center rounded-lg text-white shadow-sm transition hover:scale-[1.02] cursor-pointer"
                                        style={{ backgroundColor: selectedColor }}
                                    >
                                        <ActiveIcon className="size-4" />
                                    </button>
                                    {openPicker === "icon" && (
                                        <DropdownShell width="w-80">
                                            <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                Source icon
                                            </div>
                                            <div className="p-3">
                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    {sourceColors.map((color) => (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => setSelectedColor(color)}
                                                            className={`outline-none size-6 rounded-full ring-offset-2 ring-offset-[var(--surface-elevated)] ${selectedColor === color ? "ring-2 ring-[var(--text-primary)]" : ""}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {sourceIcons.map((item) => {
                                                        const Icon = item.icon;
                                                        const active = selectedIcon === item.key;

                                                        return (
                                                            <button
                                                                key={item.key}
                                                                type="button"
                                                                onClick={() => setSelectedIcon(item.key)}
                                                                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs transition ${
                                                                    active
                                                                        ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                                                                        : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                }`}
                                                            >
                                                                <Icon className="size-4" />
                                                                {item.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </DropdownShell>
                                    )}
                                </div>

                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <input
                                                    {...field}
                                                    disabled={submitting}
                                                    placeholder="Source title"
                                                    className="w-full bg-transparent text-[18px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] sm:text-2xl"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="mt-2">
                                            <FormControl>
                                                <input
                                                    {...field}
                                                    disabled={submitting}
                                                    placeholder="Add a short summary..."
                                                    className="w-full bg-transparent text-base text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)]"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="mt-5 flex flex-wrap items-center gap-2">
                                    <div className="relative" data-source-picker-root>
                                        <PropertyPill
                                            icon={activeOrigin.icon}
                                            label={activeOrigin.label}
                                            active={openPicker === "origin"}
                                            onClick={() => setOpenPicker(openPicker === "origin" ? null : "origin")}
                                        />
                                        {openPicker === "origin" && (
                                            <DropdownShell>
                                                <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                    Source origin
                                                </div>
                                                <div className="p-1.5 space-y-1">
                                                    {sourceOrigins.map((item) => {
                                                        const Icon = item.icon;
                                                        const active = origin === item.value;

                                                        return (
                                                            <button
                                                                key={item.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    setOrigin(item.value);
                                                                    setOpenPicker(null);
                                                                }}
                                                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                                                    active
                                                                        ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                }`}
                                                            >
                                                                <Icon className="mt-0.5 size-4 shrink-0" />
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block text-sm font-semibold">{item.label}</span>
                                                                    <span className="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">
                                                                        {item.description}
                                                                    </span>
                                                                </span>
                                                                {active && <Check className="mt-0.5 size-4" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </DropdownShell>
                                        )}
                                    </div>

                                    <div className="relative" data-source-picker-root>
                                        <PropertyPill
                                            icon={NotebookText}
                                            label={activeType.label}
                                            active={openPicker === "type"}
                                            onClick={() => setOpenPicker(openPicker === "type" ? null : "type")}
                                        />
                                        {openPicker === "type" && (
                                            <DropdownShell>
                                                <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                    Source type
                                                </div>
                                                <div className="p-1.5 space-y-1">
                                                    {sourceTypeOptions.map((item) => {
                                                        const active = sourceType === item.value;

                                                        return (
                                                            <button
                                                                key={item.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    form.setValue("sourceType", item.value, {
                                                                        shouldDirty: true,
                                                                        shouldValidate: true,
                                                                    });
                                                                    setOpenPicker(null);
                                                                }}
                                                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                                                    active
                                                                        ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                }`}
                                                            >
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block text-sm font-semibold">{item.label}</span>
                                                                    <span className="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">
                                                                        {item.description}
                                                                    </span>
                                                                </span>
                                                                {active && <Check className="mt-0.5 size-4" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </DropdownShell>
                                        )}
                                    </div>

                                    <div className="relative" data-source-picker-root>
                                        <PropertyPill
                                            icon={UsersRound}
                                            label={scope === "workspace" ? "Entire workspace" : "Specific teams"}
                                            active={openPicker === "access"}
                                            onClick={() => setOpenPicker(openPicker === "access" ? null : "access")}
                                        />
                                        {openPicker === "access" && (
                                            <DropdownShell width="w-72">
                                                <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                    Applies to
                                                </div>
                                                <div className="p-1.5 space-y-1">
                                                    {[
                                                        ["workspace", "Entire workspace", "Use this source across all teams."],
                                                        ["teams", "Specific teams", "Restrict this source to selected teams."],
                                                    ].map(([value, label, helper]) => {
                                                        const active = scope === value;

                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                onClick={() => {
                                                                    form.setValue("scope", value as "workspace" | "teams", {
                                                                        shouldDirty: true,
                                                                        shouldValidate: true,
                                                                    });
                                                                    if (value === "workspace") {
                                                                        form.setValue("teamIds", [], {
                                                                            shouldDirty: true,
                                                                            shouldValidate: true,
                                                                        });
                                                                    }
                                                                    setOpenPicker(null);
                                                                }}
                                                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                                                    active
                                                                        ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                }`}
                                                            >
                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block text-sm font-semibold">{label}</span>
                                                                    <span className="mt-0.5 block text-xs leading-4 text-[var(--text-muted)]">
                                                                        {helper}
                                                                    </span>
                                                                </span>
                                                                {active && <Check className="mt-0.5 size-4" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </DropdownShell>
                                        )}
                                    </div>

                                    {scope === "teams" && (
                                        <div className="relative" data-source-picker-root>
                                            <PropertyPill
                                                icon={UsersRound}
                                                label={
                                                    selectedTeams.length > 0
                                                        ? `${selectedTeams.length} team${selectedTeams.length === 1 ? "" : "s"}`
                                                        : "Select teams"
                                                }
                                                active={openPicker === "teams"}
                                                onClick={() => setOpenPicker(openPicker === "teams" ? null : "teams")}
                                            />
                                            {openPicker === "teams" && (
                                                <DropdownShell width="w-72">
                                                    <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">
                                                        Teams
                                                    </div>
                                                    <div className="p-1.5">
                                                        {loading && teams.length === 0 && (
                                                            <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                                                                Loading teams...
                                                            </div>
                                                        )}
                                                        {error && teams.length === 0 && (
                                                            <div className="px-3 py-4 text-sm text-amber-700">
                                                                {error}
                                                            </div>
                                                        )}
                                                        {!loading && !error && teams.length === 0 && (
                                                            <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
                                                                No teams found yet.
                                                            </div>
                                                        )}
                                                        {teams.map((team) => {
                                                            const active = selectedTeamIds.includes(team._id);

                                                            return (
                                                                <button
                                                                    key={team._id}
                                                                    type="button"
                                                                    onClick={() => toggleTeam(team._id)}
                                                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                                                        active
                                                                            ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                    }`}
                                                                >
                                                                    <span className={`flex size-4 items-center justify-center rounded border ${active ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                                        {active && <Check className="size-3" />}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{team.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </DropdownShell>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
                                    {renderOriginBody()}
                                </div>

                                {origin === "upload" && (
                                    <section className="mt-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
                                        <label className="flex cursor-pointer items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={prepareBlueprint}
                                                onChange={(event) => setPrepareBlueprint(event.target.checked)}
                                                className="mt-1 size-4 rounded border-[var(--border-subtle)] accent-[#d97757]"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-[var(--text-primary)]">
                                                    Prepare a training blueprint after upload
                                                </span>
                                                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                                                    Revise will create a review draft from the source. Your guidance shapes the future AI trainer conversation.
                                                </span>
                                            </span>
                                        </label>
                                        {prepareBlueprint && (
                                            <textarea
                                                value={trainerGuidance}
                                                onChange={(event) => setTrainerGuidance(event.target.value)}
                                                placeholder="Example: Train new support hires to handle refund requests calmly, ask good questions, and know when to escalate."
                                                className="mt-3 min-h-20 w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-medium)]"
                                            />
                                        )}
                                    </section>
                                )}
                            </div>

                            <footer className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 py-4 sm:px-10">
                                <div className="min-w-0 text-xs text-[var(--text-muted)]">
                                    {origin === "upload" ? (
                                        files.length > 0 ? (
                                            <span>{files.length} source file{files.length === 1 ? "" : "s"} selected</span>
                                        ) : (
                                            <span>Select files to activate upload</span>
                                        )
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Sparkles className="size-3.5" />
                                            {activeOrigin.label} flow preview
                                        </span>
                                    )}
                                    <span className="ml-3 hidden sm:inline">
                                        New source: {isMac ? "⌘ ⌥ S" : "Ctrl Alt S"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        disabled={submitting}
                                        className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        type={origin === "upload" ? "submit" : "button"}
                                        onClick={() => {
                                            if (origin !== "upload") {
                                                toast.message(`${activeOrigin.label} is ready in the UI. Backend connection comes next.`);
                                            }
                                        }}
                                        disabled={!canSubmit}
                                        className="h-9 rounded-full bg-[#d97757] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c96849] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {submitting ? "Processing..." : origin === "upload" ? "Upload source" : "Preview source"}
                                    </Button>
                                </div>
                            </footer>
                    </form>
                </Form>
            </section>
        </div>
    );
};

export default NewSourceModal;
