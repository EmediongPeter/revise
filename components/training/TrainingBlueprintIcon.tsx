import {
    BookOpenCheck,
    BriefcaseBusiness,
    ClipboardCheck,
    Flag,
    GraduationCap,
    Headphones,
    Lightbulb,
    ListChecks,
    NotebookText,
    PackageCheck,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingUp,
    type LucideIcon,
} from "lucide-react";

export const trainingIconColors = [
    "#d97757",
    "#64748b",
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#eab308",
    "#f97316",
    "#ef4444",
    "#9333ea",
];

export const trainingIconOptions: Array<{ key: string; label: string; icon: LucideIcon }> = [
    { key: "clipboard", label: "Checklist", icon: ClipboardCheck },
    { key: "target", label: "Target", icon: Target },
    { key: "book", label: "Knowledge", icon: BookOpenCheck },
    { key: "notebook", label: "Notebook", icon: NotebookText },
    { key: "tasks", label: "Tasks", icon: ListChecks },
    { key: "sparkles", label: "Custom", icon: Sparkles },
    { key: "sales", label: "Sales", icon: TrendingUp },
    { key: "support", label: "Support", icon: Headphones },
    { key: "compliance", label: "Compliance", icon: ShieldCheck },
    { key: "training", label: "Training", icon: GraduationCap },
    { key: "briefcase", label: "Work", icon: BriefcaseBusiness },
    { key: "operations", label: "Operations", icon: PackageCheck },
    { key: "flag", label: "Priority", icon: Flag },
    { key: "idea", label: "Idea", icon: Lightbulb },
];

export const trainingEmojiOptions = ["✅", "🎯", "📘", "🧠", "🚀", "💬", "🧩", "⚡", "🏁", "🛡️", "⭐", "🔥"];

export const getTrainingIconOption = (iconKey?: string) =>
    trainingIconOptions.find((option) => option.key === iconKey) || trainingIconOptions[0];

export const TrainingBlueprintIcon = ({
    iconKey = "clipboard",
    iconColor = trainingIconColors[0],
    className = "size-5",
}: {
    iconKey?: string;
    iconColor?: string;
    className?: string;
}) => {
    if (iconKey.startsWith("emoji:")) {
        return (
            <span className={className} aria-hidden="true">
                {iconKey.replace("emoji:", "")}
            </span>
        );
    }

    const Icon = getTrainingIconOption(iconKey).icon;
    return <Icon className={className} style={{ color: iconColor }} />;
};
