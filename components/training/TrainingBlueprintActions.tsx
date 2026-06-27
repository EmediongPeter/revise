"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, CheckCircle2, Eye } from "lucide-react";
import { archiveTrainingPlan, markTrainingPlanReady } from "@/lib/actions/training.actions";
import type { TrainingPlanStatus } from "@/types";

const TrainingBlueprintActions = ({
    planId,
    workspaceSlug,
    status,
    compact = false,
}: {
    planId: string;
    workspaceSlug: string;
    status: TrainingPlanStatus;
    compact?: boolean;
}) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const href = `/${workspaceSlug}/modules/${planId}`;

    const markReady = () => {
        startTransition(async () => {
            const result = await markTrainingPlanReady(planId);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Blueprint marked ready.");
            router.refresh();
        });
    };

    const archive = () => {
        startTransition(async () => {
            const result = await archiveTrainingPlan(planId);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Blueprint archived.");
            router.push(`/${workspaceSlug}/modules`);
            router.refresh();
        });
    };

    if (compact) {
        return (
            <div className="flex items-center justify-end gap-1.5">
                <Link
                    href={href}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                    <Eye className="size-3.5" />
                    Review
                </Link>
                {status !== "ready" && status !== "archived" && (
                    <button
                        type="button"
                        onClick={markReady}
                        disabled={isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#d97757] px-3 text-xs font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-40"
                    >
                        <CheckCircle2 className="size-3.5" />
                        Ready
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {status !== "ready" && status !== "archived" && (
                <button
                    type="button"
                    onClick={markReady}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-40"
                >
                    <CheckCircle2 className="size-4" />
                    Mark ready
                </button>
            )}
            {status !== "archived" && (
                <button
                    type="button"
                    onClick={archive}
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                    <Archive className="size-4" />
                    Archive
                </button>
            )}
        </div>
    );
};

export default TrainingBlueprintActions;
