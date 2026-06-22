"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Upload, X } from "lucide-react";
import { z } from "zod";
import FileUploader from "@/components/FileUploader";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS } from "@/lib/constants";
import { processUploadedKnowledgeSource } from "@/lib/actions/knowledge.actions";
import { KnowledgeSourceUploadSchema } from "@/lib/zod";
import type { TeamSummary } from "@/lib/actions/workspace.actions";

type KnowledgeSourceUploadValues = z.infer<typeof KnowledgeSourceUploadSchema>;

const sourceTypeOptions = [
    { value: "sop", label: "SOP" },
    { value: "handbook", label: "Handbook" },
    { value: "sales-script", label: "Sales script" },
    { value: "support-policy", label: "Support policy" },
    { value: "onboarding-guide", label: "Onboarding guide" },
    { value: "compliance-policy", label: "Compliance policy" },
    { value: "knowledge-base", label: "Knowledge base" },
    { value: "other", label: "Other" },
] as const;

const scopeOptions = [
    {
        value: "workspace",
        label: "Entire workspace",
        description: "Available to every team and training flow in this workspace.",
    },
    {
        value: "teams",
        label: "Specific teams",
        description: "Only used for selected teams and their training flows.",
    },
] as const;

const KnowledgeSourceUploadForm = ({ teams, workspaceSlug }: { teams: TeamSummary[]; workspaceSlug: string }) => {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scopePickerOpen, setScopePickerOpen] = useState(false);
    const [teamPickerOpen, setTeamPickerOpen] = useState(false);
    const scopePickerRef = useRef<HTMLDivElement>(null);
    const teamPickerRef = useRef<HTMLDivElement>(null);
    const form = useForm<KnowledgeSourceUploadValues>({
        resolver: zodResolver(KnowledgeSourceUploadSchema),
        defaultValues: {
            title: "",
            description: "",
            sourceType: "sop",
            scope: "workspace",
            teamIds: [],
            file: undefined,
        },
    });
    const scope = form.watch("scope");
    const selectedTeamIds = form.watch("teamIds");
    const selectedScopeOption = scopeOptions.find((option) => option.value === scope) || scopeOptions[0];

    useEffect(() => {
        const closeOpenPickers = (event: MouseEvent) => {
            const target = event.target as Node;

            if (scopePickerRef.current && !scopePickerRef.current.contains(target)) {
                setScopePickerOpen(false);
            }

            if (teamPickerRef.current && !teamPickerRef.current.contains(target)) {
                setTeamPickerOpen(false);
            }
        };

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setScopePickerOpen(false);
                setTeamPickerOpen(false);
            }
        };

        document.addEventListener("mousedown", closeOpenPickers);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOpenPickers);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, []);

    const toggleTeam = (teamId: string) => {
        const nextTeamIds = selectedTeamIds.includes(teamId)
            ? selectedTeamIds.filter((id) => id !== teamId)
            : [...selectedTeamIds, teamId];

        form.setValue("teamIds", nextTeamIds, { shouldDirty: true, shouldValidate: true });
    };

    const onSubmit = async (data: KnowledgeSourceUploadValues) => {
        setIsSubmitting(true);

        try {
            const pathname = `knowledge/${crypto.randomUUID()}-${data.file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")}`;
            const blob = await upload(pathname, data.file, {
                access: "public",
                handleUploadUrl: "/api/knowledge/upload",
                contentType: data.file.type,
            });
            const result = await processUploadedKnowledgeSource({
                title: data.title,
                description: data.description,
                sourceType: data.sourceType,
                scope: data.scope,
                teamIds: data.scope === "teams" ? data.teamIds : [],
                file: data.file,
                fileUrl: blob.url,
                fileBlobKey: blob.pathname,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Knowledge source is ready.");
            form.reset();
            router.push(`/${workspaceSlug}/knowledge`);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload knowledge source.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {isSubmitting && <LoadingOverlay />}
            <div className="new-book-wrapper">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-7">
                        <FileUploader
                            control={form.control}
                            name="file"
                            label="Knowledge source file"
                            acceptTypes={ACCEPTED_KNOWLEDGE_SOURCE_EXTENSIONS}
                            icon={Upload}
                            placeholder="Upload SOP, handbook, script, or policy"
                            hint="PDF, TXT, or Markdown file, up to 25MB"
                            disabled={isSubmitting}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Source title</FormLabel>
                                    <FormControl>
                                        <Input className="form-input" placeholder="ex: Support escalation SOP" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Description</FormLabel>
                                    <FormControl>
                                        <Input className="form-input" placeholder="What should Revise use this for?" {...field} disabled={isSubmitting} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="sourceType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Source type</FormLabel>
                                    <FormControl>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {sourceTypeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => field.onChange(option.value)}
                                                    disabled={isSubmitting}
                                                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                                                        field.value === option.value
                                                            ? "border-[#d97757] bg-[#d97757]/10 text-[var(--text-primary)]"
                                                            : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                                                    }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="scope"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="form-label">Applies to</FormLabel>
                                    <FormControl>
                                        <div ref={scopePickerRef} className="relative">
                                            <button
                                                type="button"
                                                disabled={isSubmitting}
                                                onClick={() => setScopePickerOpen((current) => !current)}
                                                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-left shadow-sm transition hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                                                        {selectedScopeOption.label}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
                                                        {selectedScopeOption.description}
                                                    </span>
                                                </span>
                                                <ChevronDown className={`size-4 shrink-0 text-[var(--text-muted)] transition ${scopePickerOpen ? "rotate-180" : ""}`} />
                                            </button>

                                            {scopePickerOpen && (
                                                <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-soft-lg)]">
                                                    {scopeOptions.map((option) => {
                                                        const selected = field.value === option.value;

                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                disabled={isSubmitting}
                                                                onClick={() => {
                                                                    field.onChange(option.value);
                                                                    setScopePickerOpen(false);

                                                                    if (option.value === "workspace") {
                                                                        form.setValue("teamIds", [], { shouldDirty: true, shouldValidate: true });
                                                                        setTeamPickerOpen(false);
                                                                    }
                                                                }}
                                                                className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                                                                    selected
                                                                        ? "bg-[#d97757]/10 text-[var(--text-primary)]"
                                                                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                }`}
                                                            >
                                                                <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${selected ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                                    {selected && <Check className="size-3" />}
                                                                </span>
                                                                <span className="min-w-0">
                                                                    <span className="block text-sm font-semibold">{option.label}</span>
                                                                    <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{option.description}</span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </FormControl>
                                    <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                                        Workspace sources are available everywhere. Team-scoped sources are used only for selected team training.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {scope === "teams" && (
                            <FormField
                                control={form.control}
                                name="teamIds"
                                render={() => (
                                    <FormItem>
                                        <FormLabel className="form-label">Teams</FormLabel>
                                        <FormControl>
                                            <div ref={teamPickerRef} className="relative">
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => setTeamPickerOpen((current) => !current)}
                                                    className="flex h-12 w-full items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-left text-sm text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--surface-hover)]"
                                                >
                                                    <span>
                                                        {selectedTeamIds.length > 0
                                                            ? `${selectedTeamIds.length} team${selectedTeamIds.length === 1 ? "" : "s"} selected`
                                                            : "Select teams"}
                                                    </span>
                                                    <ChevronDown className="size-4 text-[var(--text-muted)]" />
                                                </button>

                                                {teamPickerOpen && (
                                                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-soft-lg)]">
                                                        {teams.map((team) => {
                                                            const selected = selectedTeamIds.includes(team._id);

                                                            return (
                                                                <button
                                                                    key={team._id}
                                                                    type="button"
                                                                    disabled={isSubmitting}
                                                                    onClick={() => toggleTeam(team._id)}
                                                                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                                                >
                                                                    <span className={`flex size-4 items-center justify-center rounded border ${selected ? "border-[#d97757] bg-[#d97757] text-white" : "border-[var(--border-subtle)]"}`}>
                                                                        {selected && <Check className="size-3" />}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {selectedTeamIds.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {selectedTeamIds.map((teamId) => {
                                                            const team = teams.find((item) => item._id === teamId);
                                                            if (!team) return null;

                                                            return (
                                                                <button
                                                                    key={teamId}
                                                                    type="button"
                                                                    disabled={isSubmitting}
                                                                    onClick={() => toggleTeam(teamId)}
                                                                    className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 text-xs font-medium text-[var(--text-secondary)]"
                                                                >
                                                                    {team.name}
                                                                    <X className="size-3" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <Button type="submit" className="form-btn" disabled={isSubmitting}>
                            Upload knowledge source
                        </Button>
                    </form>
                </Form>
            </div>
        </>
    );
};

export default KnowledgeSourceUploadForm;
