import { notFound, redirect } from "next/navigation";
import TrainingBlueprintDetailPage from "@/components/training/TrainingBlueprintDetailPage";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const WorkspaceTrainingBlueprintPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string; planId: string }>;
}) => {
    const [{ workspaceSlug, planId }, onboardingStatus] = await Promise.all([params, getOnboardingStatus()]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <TrainingBlueprintDetailPage workspaceSlug={workspaceSlug} planId={planId} />;
};

export default WorkspaceTrainingBlueprintPage;
