import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
    return (
        <DashboardPlaceholder
            eyebrow="Reports"
            title="Readiness and compliance"
            description="See completion, confidence, missed policies, risky answers, and common knowledge gaps across the team."
            icon={BarChart3}
            items={[
                {
                    title: "Readiness score",
                    description: "A simple manager-facing score should summarize whether a trainee is ready for supervised work.",
                },
                {
                    title: "Common gaps",
                    description: "Surface repeated misunderstandings so managers can improve docs or run a focused live session.",
                },
                {
                    title: "Proof of training",
                    description: "Exportable records can become a future wedge for compliance-heavy teams.",
                },
            ]}
        />
    );
}
