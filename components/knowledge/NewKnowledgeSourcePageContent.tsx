import { redirect } from "next/navigation";
import KnowledgeSourceUploadForm from "@/components/knowledge/KnowledgeSourceUploadForm";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

const NewKnowledgeSourcePageContent = async ({ workspaceSlug }: { workspaceSlug: string }) => {
    const result = await getWorkspaceTeamData();

    if (!result.success) {
        redirect("/onboarding");
    }

    return (
        <main className="new-book">
            <section className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Upload source</p>
                <h1 className="page-title-xl">Add company knowledge Revise can train from.</h1>
                <p className="subtitle">
                    Upload a PDF, TXT, or Markdown source, then scope it to the whole workspace or specific teams.
                </p>
            </section>

            <KnowledgeSourceUploadForm
                teams={result.data.teams}
                workspaceSlug={workspaceSlug}
                knowledgeUploadPrefix={result.data.knowledgeUploadPrefix}
            />
        </main>
    );
};

export default NewKnowledgeSourcePageContent;
