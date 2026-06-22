import { notFound, redirect } from "next/navigation";
import KnowledgeSourceLibrary from "@/components/knowledge/KnowledgeSourceLibrary";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

export default async function WorkspaceKnowledgePage({
    params,
    searchParams,
}: {
    params: Promise<{ workspaceSlug: string }>;
    searchParams: Promise<{
        q?: string;
        status?: string;
        scope?: string;
        teamId?: string;
        sourceType?: string;
    }>;
}) {
    const [{ workspaceSlug }, filters, onboardingStatus] = await Promise.all([params, searchParams, getOnboardingStatus()]);

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return <KnowledgeSourceLibrary workspaceSlug={workspaceSlug} filters={filters} />;
}
