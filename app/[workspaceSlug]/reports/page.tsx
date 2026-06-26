import { notFound, redirect } from "next/navigation";
import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { BarChart3 } from "lucide-react";

const WorkspaceReportsPage = async ({
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
            eyebrow="Reports"
            title="Readiness and compliance"
            description="See completion, confidence, missed policies, risky answers, and common knowledge gaps for this workspace."
            icon={BarChart3}
            items={[
                {
                    title: "Readiness score",
                    description: "A simple manager-facing score should summarize whether a trainee is ready for supervised work.",
                },
                {
                    title: "Common gaps",
                    description: "Surface repeated misunderstandings so managers can improve docs or run a focused live session.",
                },
                {
                    title: "Proof of training",
                    description: "Exportable records can become a future wedge for compliance-heavy teams.",
                },
            ]}
        />
    );
};

export default WorkspaceReportsPage;
