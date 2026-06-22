import { redirect } from "next/navigation";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

export default async function NewKnowledgeRedirectPage() {
    const result = await getWorkspaceTeamData();

    if (!result.success) {
        redirect("/onboarding");
    }

    redirect(`/${result.data.activeWorkspace.slug}/knowledge/new`);
}
