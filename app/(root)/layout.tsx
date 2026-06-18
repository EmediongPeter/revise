import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const RootAppLayout = async ({ children }: { children: React.ReactNode }) => {
    const onboardingStatus = await getOnboardingStatus();

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    return children;
};

export default RootAppLayout;
