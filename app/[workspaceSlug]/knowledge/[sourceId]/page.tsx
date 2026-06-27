import { notFound, redirect } from "next/navigation";
import KnowledgeSourceDetailPage from "@/components/knowledge/KnowledgeSourceDetailPage";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

export default async function WorkspaceKnowledgeSourceDetailRoute({
    params,
}: {
    params: Promise<{ workspaceSlug: string; sourceId: string }>;
}) {
    const [{ workspaceSlug, sourceId }, onboardingStatus] = await Promise.all([params, getOnboardingStatus()]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <KnowledgeSourceDetailPage sourceId={sourceId} workspaceSlug={workspaceSlug} />;
}
