import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const SignInPage = async () => {
    const onboardingStatus = await getOnboardingStatus();

    if (onboardingStatus.authenticated) {
        redirect(onboardingStatus.completed && onboardingStatus.workspaceSlug ? `/${onboardingStatus.workspaceSlug}` : "/onboarding");
    }

    return (
        <AuthShell mode="sign-in">
            <Suspense fallback={<div className="h-[360px] rounded-xl bg-[var(--surface-elevated)]" />}>
                <SignInForm />
            </Suspense>
        </AuthShell>
    );
};

export default SignInPage;
