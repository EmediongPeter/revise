import { redirect } from "next/navigation";
import WorkspaceSettingsClient from "@/components/settings/WorkspaceSettingsClient";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

export default async function SettingsPage() {
    const result = await getWorkspaceTeamData();

    if (!result.success) {
        redirect("/onboarding");
    }

    return <WorkspaceSettingsClient initialData={result.data} />;
}
