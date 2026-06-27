"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Edit3, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { updateTrainingBlueprint } from "@/lib/actions/training.actions";
import type { UpdateTrainingBlueprintInput } from "@/lib/actions/training.actions";

type EditableField = Exclude<keyof UpdateTrainingBlueprintInput, "planId">;

const EditableBlueprintSection = ({
    planId,
    title,
    field,
    value,
    mode = "list",
}: {
    planId: string;
    title: string;
    field: EditableField;
    value: string[] | string | undefined;
    mode?: "list" | "text";
}) => {
    const [editing, setEditing] = useState(false);
    const [items, setItems] = useState<string[]>(Array.isArray(value) ? value : []);
    const [text, setText] = useState(typeof value === "string" ? value : "");
    const [isPending, startTransition] = useTransition();
    const visibleItems = items.filter(Boolean);

    const cancel = () => {
        setItems(Array.isArray(value) ? value : []);
        setText(typeof value === "string" ? value : "");
        setEditing(false);
    };

    const save = () => {
        startTransition(async () => {
            const payload: UpdateTrainingBlueprintInput = {
                planId,
                [field]: mode === "text" ? text : items,
            };
            const result = await updateTrainingBlueprint(payload);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(`${title} updated.`);
            setEditing(false);
        });
    };

    return (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        disabled
                        title="AI regeneration will be wired in the next AI pass"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-2.5 text-xs font-semibold text-[var(--text-muted)] opacity-60"
                    >
                        <RotateCcw className="size-3.5" />
                        Regenerate
                    </button>
                    {editing ? (
                        <>
                            <button
                                type="button"
                                onClick={cancel}
                                disabled={isPending}
                                className="inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
                            >
                                <X className="size-4" />
                                <span className="sr-only">Cancel</span>
                            </button>
                            <button
                                type="button"
                                onClick={save}
                                disabled={isPending}
                                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#d97757] px-3 text-xs font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-50"
                            >
                                <Save className="size-3.5" />
                                {isPending ? "Saving" : "Save"}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Edit3 className="size-3.5" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {editing ? (
                mode === "text" ? (
                    <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        className="min-h-28 w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                    />
                ) : (
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <textarea
                                    value={item}
                                    onChange={(event) => {
                                        const next = [...items];
                                        next[index] = event.target.value;
                                        setItems(next);
                                    }}
                                    className="min-h-12 flex-1 resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}
                                    className="mt-1 inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-red-50 hover:text-red-600"
                                >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">Remove</span>
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setItems([...items, ""])}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Plus className="size-3.5" />
                            Add item
                        </button>
                    </div>
                )
            ) : mode === "text" ? (
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {text || "Nothing captured yet."}
                </p>
            ) : visibleItems.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">Nothing captured yet.</p>
            ) : (
                <ul className="space-y-2">
                    {visibleItems.map((item) => (
                        <li
                            key={item}
                            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]"
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default EditableBlueprintSection;
