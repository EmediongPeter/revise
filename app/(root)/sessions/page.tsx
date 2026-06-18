import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { Mic2 } from "lucide-react";

export default function SessionsPage() {
    return (
        <DashboardPlaceholder
            eyebrow="Voice sessions"
            title="Practice history"
            description="Review voice role-play sessions, transcripts, source-backed corrections, and coaching outcomes."
            icon={Mic2}
            items={[
                {
                    title: "Session transcripts",
                    description: "Store the trainee and trainer conversation so managers can review exactly what happened.",
                },
                {
                    title: "Correction log",
                    description: "Track moments where the trainee gave a risky, incomplete, or non-compliant answer.",
                },
                {
                    title: "Source evidence",
                    description: "Every correction should link back to the company source section that justified it.",
                },
            ]}
        />
    );
}
