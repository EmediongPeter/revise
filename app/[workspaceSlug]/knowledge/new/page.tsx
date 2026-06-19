import { notFound, redirect } from "next/navigation";
import NewKnowledgeSourcePageContent from "@/components/knowledge/NewKnowledgeSourcePageContent";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

export default async function WorkspaceNewKnowledgeSourcePage({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) {
    const [{ workspaceSlug }, onboardingStatus] = await Promise.all([params, getOnboardingStatus()]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <NewKnowledgeSourcePageContent workspaceSlug={workspaceSlug} />;
}
