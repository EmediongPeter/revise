import { notFound, redirect } from "next/navigation";
import ActivationWizardClient from "@/components/wizard/ActivationWizardClient";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { getActivationWizardState } from "@/lib/actions/wizard.actions";

const WorkspaceWizardPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, onboardingStatus, result] = await Promise.all([
        params,
        getOnboardingStatus(),
        getActivationWizardState(),
    ]);

    if (!onboardingStatus.completed || !result.success) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <ActivationWizardClient initialState={result.data} />;
};

export default WorkspaceWizardPage;
