"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { prepareTrainingBlueprintDraft } from "@/lib/actions/training.actions";

const TrainingBlueprintButton = ({
    sourceIds,
    workspaceSlug,
    disabled,
    className = "dashboard-primary-action disabled:pointer-events-none disabled:opacity-40",
    children = "Prepare training blueprint",
}: {
    sourceIds: string[];
    workspaceSlug: string;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}) => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        startTransition(async () => {
            const loadingToast = toast.loading("Preparing blueprint draft...");
            const result = await prepareTrainingBlueprintDraft({ sourceIds });

            toast.dismiss(loadingToast);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success("Training blueprint ready", {
                description: result.data.title,
                duration: 12000,
                action: {
                    label: "View",
                    onClick: () => router.push(`/${workspaceSlug}/modules/${result.data._id}`),
                },
            });
            router.push(`/${workspaceSlug}/modules/${result.data._id}`);
            router.refresh();
        });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isPending}
            className={className}
        >
            <Sparkles className="size-4" />
            {isPending ? "Preparing..." : children}
        </button>
    );
};

export default TrainingBlueprintButton;
