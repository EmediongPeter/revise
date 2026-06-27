import { notFound, redirect } from "next/navigation";
import { PricingTable } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2, WalletCards } from "lucide-react";
import Link from "next/link";
import { getOnboardingStatus } from "@/lib/actions/onboarding.actions";

const WorkspaceSubscriptionsPage = async ({
    params,
}: {
    params: Promise<{ workspaceSlug: string }>;
}) => {
    const [{ workspaceSlug }, onboardingStatus] = await Promise.all([params, getOnboardingStatus()]);
    const clerkBillingEnabled = process.env.NEXT_PUBLIC_CLERK_BILLING_ENABLED === "true";

    if (!onboardingStatus.completed) {
        redirect("/onboarding");
    }

    if (onboardingStatus.workspaceSlug !== workspaceSlug) {
        notFound();
    }

    return (
        <div className="container wrapper py-10">
            <div className="mb-10 flex flex-col items-center text-center">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Plans</p>
                <h1 className="mb-4 text-4xl font-semibold">Choose your Revise plan</h1>
                <p className="text-muted-foreground max-w-2xl">
                    Upgrade this workspace for more training blueprints, longer practice sessions, and team-ready onboarding workflows.
                </p>
            </div>

            {clerkBillingEnabled ? (
                <div className="clerk-pricing-container">
                    <PricingTable />
                </div>
            ) : (
                <section className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft-sm)]">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-[#d97757]/15 text-[#d97757]">
                            <WalletCards className="size-5" />
                        </div>
                        <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">Billing is being prepared</h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                            Revise is currently running without Clerk Billing enabled. This workspace can keep using the current plan while billing is configured.
                        </p>
                        <Link
                            href={`/${workspaceSlug}/settings`}
                            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-warm-hover)]"
                        >
                            Review workspace settings
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Current access</p>
                        <div className="mt-5 space-y-4">
                            {["Prepare training blueprints", "Run future practice sessions", "Invite teammates when your workspace is ready"].map((item) => (
                                <div key={item} className="flex items-start gap-3 text-sm font-medium text-[var(--text-secondary)]">
                                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#d97757]" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default WorkspaceSubscriptionsPage;
