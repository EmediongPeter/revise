import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface DashboardPlaceholderProps {
    eyebrow: string;
    title: string;
    description: string;
    icon: LucideIcon;
    primaryAction?: {
        label: string;
        href: string;
    };
    items: {
        title: string;
        description: string;
    }[];
}

const DashboardPlaceholder = ({
    eyebrow,
    title,
    description,
    icon: Icon,
    primaryAction,
    items,
}: DashboardPlaceholderProps) => {
    return (
        <main className="wrapper container">
            <section className="dashboard-page-header">
                <div>
                    <p className="dashboard-eyebrow">{eyebrow}</p>
                    <h1 className="dashboard-title">{title}</h1>
                    <p className="dashboard-description">{description}</p>
                </div>
                {primaryAction && (
                    <Link href={primaryAction.href} className="dashboard-primary-action">
                        <Icon className="size-4" />
                        {primaryAction.label}
                    </Link>
                )}
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="dashboard-panel">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm">
                        <Icon className="size-5" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">Designed for the MVP workflow</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                        This section is part of the Revise manager dashboard. The UI is scaffolded now so the product can grow into the correct workflow without drifting back into a generic document chat app.
                    </p>
                </div>

                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.title} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{item.description}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default DashboardPlaceholder;
