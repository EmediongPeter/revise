import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const isSafeInternalRedirect = (value?: string): value is string => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return false;
    if (value === "/") return false;
    if (value.startsWith("/sign-in") || value.startsWith("/sign-up") || value.startsWith("/auth/redirect")) return false;

    return true;
};

const AuthRedirectPage = async ({
    searchParams,
}: {
    searchParams: Promise<{ redirect_url?: string; redirectUrl?: string }>;
}) => {
    const [{ redirect_url, redirectUrl }, onboardingStatus] = await Promise.all([
        searchParams,
        getOnboardingStatus(),
    ]);

    if (!onboardingStatus.authenticated) {
        redirect("/sign-in");
    }

    const requestedRedirect = redirect_url || redirectUrl;

    if (isSafeInternalRedirect(requestedRedirect)) {
        redirect(requestedRedirect);
    }

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (!onboardingStatus.workspaceSlug) {
        redirect("/onboarding");
    }

    redirect(`/${onboardingStatus.workspaceSlug}`);
};

export default AuthRedirectPage;
