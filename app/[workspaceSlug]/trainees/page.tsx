import { notFound, redirect } from "next/navigation";
import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { UsersRound } from "lucide-react";

const WorkspaceTraineesPage = async ({
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

    return (
        <DashboardPlaceholder
            eyebrow="Trainees"
            title="People in training"
            description="Invite employees, assign blueprints, and track who is ready for supervised work."
            icon={UsersRound}
            primaryAction={{ label: "Invite trainee", href: `/${workspaceSlug}/trainees` }}
            items={[
                {
                    title: "Workspace-scoped roster",
                    description: "Trainees in this workspace stay separate from every other company workspace.",
                },
                {
                    title: "Assignment readiness",
                    description: "Each person will eventually show assigned blueprints, practice progress, and manager review status.",
                },
                {
                    title: "Proof of training",
                    description: "Session evidence and readiness history will feed reports without mixing workspace data.",
                },
            ]}
        />
    );
};

export default WorkspaceTraineesPage;
