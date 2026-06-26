"use client";

import type { ReactNode } from "react";
import { Plus, Upload } from "lucide-react";
import { openNewSourceModal } from "@/components/knowledge/NewSourceModal";

const NewSourceTrigger = ({
    variant = "icon",
    children,
}: {
    variant?: "icon" | "primary";
    children?: ReactNode;
}) => {
    if (variant === "primary") {
        return (
            <button
                type="button"
                onClick={openNewSourceModal}
                className="inline-flex h-9 items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white shadow-[var(--shadow-soft-sm)] transition hover:bg-[#c96849]"
            >
                {children || (
                    <>
                        <Upload className="mr-2 size-4" />
                        Upload new source
                    </>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={openNewSourceModal}
            title="Upload new source"
            className="inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
            <Plus className="size-4" />
            <span className="sr-only">Upload new source</span>
        </button>
    );
};

export default NewSourceTrigger;
