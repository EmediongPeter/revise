import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { UsersRound } from "lucide-react";

export default function TraineesPage() {
    return (
        <DashboardPlaceholder
            eyebrow="Trainees"
            title="People in training"
            description="Invite interns and junior staff, assign modules, and track who is ready for supervised work."
            icon={UsersRound}
            primaryAction={{ label: "Invite trainee", href: "/trainees" }}
            items={[
                {
                    title: "Invite links",
                    description: "Managers should be able to send a single link that drops a trainee into assigned voice practice.",
                },
                {
                    title: "Readiness state",
                    description: "Each trainee needs a clear state: not started, practicing, needs review, or ready.",
                },
                {
                    title: "Manager review",
                    description: "Flag risky answers and misunderstood policies before a new hire touches client work.",
                },
            ]}
        />
    );
}
