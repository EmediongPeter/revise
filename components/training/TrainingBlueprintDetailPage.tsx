import { notFound } from "next/navigation";
import TrainingBlueprintDetailClient from "@/components/training/TrainingBlueprintDetailClient";
import { getTrainingPlanDetail } from "@/lib/actions/training.actions";

const TrainingBlueprintDetailPage = async ({
    planId,
    workspaceSlug,
}: {
    planId: string;
    workspaceSlug: string;
}) => {
    const result = await getTrainingPlanDetail(planId);

    if (!result.success) {
        notFound();
    }

    const plan = result.data;

    return <TrainingBlueprintDetailClient key={`${plan._id}-${plan.updatedAt}`} plan={plan} workspaceSlug={workspaceSlug} />;
};

export default TrainingBlueprintDetailPage;
