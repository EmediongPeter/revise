import { redirect } from "next/navigation";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const SignUpPage = async ({
    searchParams,
}: {
    searchParams: Promise<{ redirect_url?: string; redirectUrl?: string }>;
}) => {
    const [{ redirect_url, redirectUrl }, onboardingStatus] = await Promise.all([searchParams, getOnboardingStatus()]);
    const requestedRedirect = redirect_url || redirectUrl;

    if (onboardingStatus.authenticated) {
        if (requestedRedirect?.startsWith("/invite/")) redirect(requestedRedirect);
        redirect(onboardingStatus.completed && onboardingStatus.workspaceSlug ? `/${onboardingStatus.workspaceSlug}` : "/onboarding");
    }

    return (
        <AuthShell mode="sign-up">
            <Suspense fallback={<div className="h-[360px] rounded-xl bg-[var(--surface-elevated)]" />}>
                <SignUpForm />
            </Suspense>
        </AuthShell>
    );
};

export default SignUpPage;
