import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, Mic2, TriangleAlert } from "lucide-react";

const reviewItems = [
    {
        title: "Client tone practice",
        meta: "2 trainees need manager review",
        status: "Review",
        icon: TriangleAlert,
    },
    {
        title: "Agency intern onboarding",
        meta: "Source-backed practice ready",
        status: "Live",
        icon: Mic2,
    },
    {
        title: "Confidentiality policy",
        meta: "Common gap: client file sharing",
        status: "Watch",
        icon: FileText,
    },
];

const HeroSection = ({ workspaceSlug }: { workspaceSlug: string }) => {
    const uploadHref = `/${workspaceSlug}/knowledge/new`;
    const reportsHref = "/reports";

    return (
        <section className="mb-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="dashboard-panel overflow-hidden">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm">
                            <span className="size-2 rounded-full bg-[var(--success)]" />
                            Agency onboarding pilot
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold leading-tight text-[var(--text-primary)] md:text-4xl">
                            See who is ready before they touch real client work.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                            Revise turns SOPs, handbooks, and client workflows into voice role-play. Trainees practice scenarios, get corrected from source material, and managers review readiness.
                        </p>
                    </div>

                    <Link href={uploadHref} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-warm-hover)]">
                        Upload source
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {[
                        { label: "Completion", value: "64%", detail: "7 of 11 assigned sessions" },
                        { label: "Avg. readiness", value: "82%", detail: "Safe for supervised work" },
                        { label: "Risk flags", value: "4", detail: "Need source review" },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 shadow-sm">
                            <p className="text-sm font-medium text-[var(--text-muted)]">{stat.label}</p>
                            <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{stat.value}</p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">{stat.detail}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="dashboard-panel">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">Manager queue</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Sessions and gaps that need attention.</p>
                    </div>
                    <Link href={reportsHref} className="text-sm font-medium text-[var(--text-primary)] hover:underline">
                        View reports
                    </Link>
                </div>

                <div className="space-y-2">
                    {reviewItems.map((item) => (
                        <div key={item.title} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 shadow-sm">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                                <item.icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                                <p className="truncate text-xs text-[var(--text-muted)]">{item.meta}</p>
                            </div>
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
                                {item.status}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
                    <div className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
                        <p className="text-sm leading-5 text-[var(--text-secondary)]">
                            3 trainees are ready for supervised client communication.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;

