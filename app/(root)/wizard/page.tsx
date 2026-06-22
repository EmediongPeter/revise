import { redirect } from "next/navigation";
import ActivationWizardClient from "@/components/wizard/ActivationWizardClient";
import { getActivationWizardState } from "@/lib/actions/wizard.actions";

export default async function WizardPage() {
    const result = await getActivationWizardState();

    if (!result.success) {
        redirect("/onboarding");
    }

    return <ActivationWizardClient initialState={result.data} />;
}
