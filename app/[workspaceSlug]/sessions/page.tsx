import { notFound, redirect } from "next/navigation";
import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { Mic2 } from "lucide-react";

const WorkspaceSessionsPage = async ({
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
            eyebrow="Practice sessions"
            title="Practice history"
            description="Review trainee conversations, transcripts, source-backed corrections, and coaching outcomes."
            icon={Mic2}
            items={[
                {
                    title: "Session transcripts",
                    description: "Voice and text practice sessions will be stored against this workspace only.",
                },
                {
                    title: "Correction log",
                    description: "Track moments where a trainee gave a risky, incomplete, or non-compliant answer.",
                },
                {
                    title: "Source evidence",
                    description: "Every correction should point back to the workspace source that justified it.",
                },
            ]}
        />
    );
};

export default WorkspaceSessionsPage;
