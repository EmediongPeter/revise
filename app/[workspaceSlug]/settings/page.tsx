import { notFound, redirect } from "next/navigation";
import WorkspaceSettingsClient from "@/components/settings/WorkspaceSettingsClient";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

const WorkspaceSettingsPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, onboardingStatus, result] = await Promise.all([
        params,
        getOnboardingStatus(),
        getWorkspaceTeamData(),
    ]);

    if (!onboardingStatus.completed || !result.success) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <WorkspaceSettingsClient initialData={result.data} />;
};

export default WorkspaceSettingsPage;
