import { notFound, redirect } from "next/navigation";
import TrainingBlueprintLibrary from "@/components/training/TrainingBlueprintLibrary";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const WorkspaceModulesPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, onboardingStatus] = await Promise.all([params, getOnboardingStatus()]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <TrainingBlueprintLibrary workspaceSlug={workspaceSlug} />;
};

export default WorkspaceModulesPage;
