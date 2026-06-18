import DashboardPlaceholder from "@/components/DashboardPlaceholder";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <DashboardPlaceholder
            eyebrow="Settings"
            title="Workspace controls"
            description="Configure the agency workspace, trainer behavior, source rules, and future team permissions."
            icon={Settings}
            items={[
                {
                    title: "Trainer behavior",
                    description: "Define how strict the AI trainer should be when coaching trainees through company scenarios.",
                },
                {
                    title: "Source rules",
                    description: "Control whether the trainer may answer generally or must stay strictly inside uploaded company material.",
                },
                {
                    title: "Team access",
                    description: "Future roles should separate managers, reviewers, and trainees.",
                },
            ]}
        />
    );
}
