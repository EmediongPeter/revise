import OnboardingExperience from "@/components/onboarding/OnboardingExperience";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";
import { redirect } from "next/navigation";

const OnboardingPage = async () => {
    const onboardingStatus = await getOnboardingStatus();

    if (onboardingStatus.completed) {
        redirect("/");
    }

    return <OnboardingExperience />;
};

export default OnboardingPage;
