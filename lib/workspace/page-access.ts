import "server-only";

import { notFound, redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

export const assertWorkspacePageAccess = async (
    params: Promise<{ workspaceSlug: string }>,
) => {
    const [{ workspaceSlug }, onboardingStatus] = await Promise.all([
        params,
        getOnboardingStatus(),
    ]);

    if (!onboardingStatus.completed) redirect("/onboarding");
    if (onboardingStatus.workspaceSlug !== workspaceSlug) notFound();

    return { workspaceSlug, onboardingStatus };
};
