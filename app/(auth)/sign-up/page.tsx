import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const SignUpPage = async () => {
    const onboardingStatus = await getOnboardingStatus();

    if (onboardingStatus.authenticated) {
        redirect(onboardingStatus.completed && onboardingStatus.workspaceSlug ? `/${onboardingStatus.workspaceSlug}` : "/onboarding");
    }

    return (
        <AuthShell mode="sign-up">
            <SignUpForm />
        </AuthShell>
    );
};

export default SignUpPage;
