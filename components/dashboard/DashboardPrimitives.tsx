import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const PageHeader = ({
    eyebrow,
    title,
    description,
    actions,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) => (
    <section className="dashboard-page-header">
        <div>
            <p className="dashboard-eyebrow">{eyebrow}</p>
            <h1 className="dashboard-title">{title}</h1>
            {description && <p className="dashboard-description">{description}</p>}
        </div>
        {actions && <div className="dashboard-header-actions">{actions}</div>}
    </section>
);

export const MetricCard = ({
    label,
    value,
    detail,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    detail?: string;
    icon: LucideIcon;
}) => (
    <div className="metric-card">
        <div className="metric-card-icon">
            <Icon className="size-4" />
        </div>
        <p className="metric-card-value">{value}</p>
        <p className="metric-card-label">{label}</p>
        {detail && <p className="metric-card-detail">{detail}</p>}
    </div>
);

export const StatusBadge = ({
    children,
    tone = "neutral",
}: {
    children: React.ReactNode;
    tone?: "neutral" | "success" | "warning" | "info";
}) => <span className={cn("status-badge", `status-badge-${tone}`)}>{children}</span>;

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: { label: string; href: string };
}) => (
    <section className="empty-state">
        <div className="empty-state-icon">
            <Icon className="size-5" />
        </div>
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        {action && (
            <Link href={action.href} className="dashboard-primary-action mt-5">
                {action.label}
            </Link>
        )}
    </section>
);
