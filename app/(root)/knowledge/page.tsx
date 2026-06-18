import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { BookOpenCheck } from "lucide-react";

export default function KnowledgePage() {
    return (
        <DashboardPlaceholder
            eyebrow="Sources"
            title="Company source library"
            description="Manage the SOPs, policies, handbooks, and workflows that power source-backed voice training."
            icon={BookOpenCheck}
            primaryAction={{ label: "Upload source", href: "/books/new" }}
            items={[
                {
                    title: "Source ingestion",
                    description: "Uploaded PDFs are parsed into searchable sections so role-play corrections can point back to company material.",
                },
                {
                    title: "Citation metadata",
                    description: "The next backend pass should store section titles, pages, and source references for manager-ready correction evidence.",
                },
                {
                    title: "Knowledge gaps",
                    description: "Reports will show which source sections confuse trainees most often.",
                },
            ]}
        />
    );
}
