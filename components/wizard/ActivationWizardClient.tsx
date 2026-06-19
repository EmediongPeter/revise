'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
    ArrowRight,
    Check,
    ChevronDown,
    Circle,
    FileText,
    Flag,
    Gauge,
    RotateCcw,
    Settings,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    completeWizardStep,
    skipActivationWizard,
    type ActivationWizardState,
    type WizardSection,
    type WizardStep,
} from "@/lib/actions/wizard.actions";

const manualStepIds = new Set(["trainer", "reports", "invite", "integrations", "teams"]);

const sectionIcons = {
    "quick-start": FileText,
    tune: Settings,
    measure: Gauge,
    optional: Sparkles,
};

const StepCard = ({
    step,
    onComplete,
    pending,
}: {
    step: WizardStep;
    onComplete: (step: WizardStep) => void;
    pending: boolean;
}) => {
    const canMarkDone = manualStepIds.has(step.id) && !step.completed;

    return (
        <article
            className={cn(
                "overflow-hidden rounded-lg border bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-sm)]",
                step.completed ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--border-subtle)]",
            )}
        >
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <span
                    className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        step.completed ? "bg-emerald-500 text-white" : "text-[var(--text-muted)]",
                    )}
                >
                    {step.completed ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
                </span>
                <ChevronDown className="size-4 text-[var(--text-muted)]" />
                <h3 className="min-w-0 flex-1 text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                {step.autoCompleted && (
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600">
                        Synced
                    </span>
                )}
            </div>
            <div className="space-y-3 px-7 py-4">
                <p className="text-sm leading-6 text-[var(--text-muted)]">{step.description}</p>
                <div className="flex flex-wrap gap-2">
                    <Link href={step.href} className="dashboard-secondary-action h-9">
                        {step.actionLabel}
                        <ArrowRight className="size-4" />
                    </Link>
                    {canMarkDone && (
                        <button
                            type="button"
                            disabled={pending}
                            onClick={() => onComplete(step)}
                            className="dashboard-primary-action h-9 disabled:pointer-events-none disabled:opacity-60"
                        >
                            Mark done
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

const SectionBlock = ({
    section,
    onComplete,
    pending,
}: {
    section: WizardSection;
    onComplete: (step: WizardStep) => void;
    pending: boolean;
}) => {
    const completed = section.steps.filter((step) => step.completed).length;
    const Icon = sectionIcons[section.id];

    return (
        <section className="border-t border-[var(--border-subtle)] pt-5">
            <div className="mb-3 flex items-center gap-3">
                <Icon className="size-4 text-[var(--text-muted)]" />
                <h2 className="flex-1 text-sm font-semibold text-[var(--text-primary)]">{section.title}</h2>
                <p className="text-right text-sm font-medium text-[var(--text-primary)]">
                    {completed} / {section.steps.length}
                    <span className="block text-xs text-[var(--text-muted)]">done</span>
                </p>
            </div>
            <div className="space-y-3">
                {section.steps.map((step) => (
                    <StepCard key={step.id} step={step} onComplete={onComplete} pending={pending} />
                ))}
            </div>
        </section>
    );
};

const ActivationWizardClient = ({ initialState }: { initialState: ActivationWizardState }) => {
    const router = useRouter();
    const [state, setState] = useState(initialState);
    const [isPending, startTransition] = useTransition();

    const completeStep = (step: WizardStep) => {
        startTransition(async () => {
            try {
                const result = await completeWizardStep(step.id);

                if (!result.success) {
                    toast.error(result.error);
                    return;
                }

                setState(result.data);

                if (result.data.completed) {
                    toast.success("Revise setup is complete.");
                    router.push(`/${result.data.workspaceSlug}`);
                    router.refresh();
                    return;
                }

                toast.success(`${step.title} marked done.`);
            } catch (error) {
                console.error(error);
                toast.error("Could not update setup progress.");
            }
        });
    };

    const skipWizard = () => {
        startTransition(async () => {
            try {
                const result = await skipActivationWizard();

                if (!result.success) {
                    toast.error(result.error);
                    return;
                }

                toast.success("You can continue setup from the sidebar anytime.");
                router.push(`/${result.data.workspaceSlug}`);
                router.refresh();
            } catch (error) {
                console.error(error);
                toast.error("Could not skip setup right now.");
            }
        });
    };

    return (
        <main className="wrapper container">
            <section className="dashboard-page-header">
                <div>
                    <p className="dashboard-eyebrow">Get started</p>
                    <h1 className="dashboard-title">Getting started with Revise</h1>
                    <p className="dashboard-description">
                        Build the first useful training loop for {state.workspaceName}: source-backed modules, practice, and readiness reporting.
                    </p>
                </div>
                <button
                    type="button"
                    disabled={isPending}
                    onClick={skipWizard}
                    className="dashboard-secondary-action"
                >
                    <RotateCcw className="size-4" />
                    Skip for now
                </button>
            </section>

            <section className="mb-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft-sm)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div
                        className="grid size-20 shrink-0 place-items-center rounded-full text-sm font-semibold text-[var(--text-primary)]"
                        style={{
                            background: `conic-gradient(#d97757 ${state.percent * 3.6}deg, var(--border-subtle) 0deg)`,
                        }}
                    >
                        <span className="grid size-16 place-items-center rounded-full bg-[var(--surface-elevated)]">
                            {state.percent}%
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            {state.completed ? "Setup complete" : "Build your first training loop"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                            {state.completed
                                ? "Your workspace has the core Revise flow in place."
                                : state.nextStep
                                  ? `Up next: ${state.nextStep.title}`
                                  : "Finish the remaining optional items when they become useful."}
                        </p>
                    </div>
                    <Link href={`/${state.workspaceSlug}`} className="dashboard-primary-action">
                        Continue to dashboard
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </section>

            <div className="space-y-8">
                {state.sections.map((section) => (
                    <SectionBlock key={section.id} section={section} onComplete={completeStep} pending={isPending} />
                ))}
            </div>

            <section className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-start gap-3">
                    <Flag className="mt-0.5 size-4 text-[var(--text-muted)]" />
                    <p className="text-sm leading-6 text-[var(--text-muted)]">
                        Required progress reaches 100% when Revise has a source, a module, a practice path, trainer preferences, and a reporting view.
                        Optional items stay available for teams that need deeper setup.
                    </p>
                </div>
            </section>
        </main>
    );
};

export default ActivationWizardClient;
