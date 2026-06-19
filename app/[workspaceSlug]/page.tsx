import { notFound, redirect } from "next/navigation";
import DashboardHome from "@/components/dashboard/DashboardHome";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { getActivationWizardState } from "@/lib/actions/wizard.actions";

const WorkspaceDashboardPage = async ({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceSlug: string }>;
    searchParams: Promise<{ query?: string }>;
}) => {
    const [{ workspaceSlug }, { query }] = await Promise.all([params, searchParams]);
    const onboardingStatus = await getOnboardingStatus();

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    const wizardState = await getActivationWizardState();

    if (wizardState.success && !wizardState.data.completed && !wizardState.data.skipped) {
        redirect("/wizard?utm_first_workspace=true");
    }

    return <DashboardHome query={query} />;
};

export default WorkspaceDashboardPage;
