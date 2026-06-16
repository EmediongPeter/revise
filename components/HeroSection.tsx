import Link from 'next/link'
import {ArrowRight, CheckCircle2, FileText, Mic2, UsersRound} from 'lucide-react'

const HeroSection = () => {
    const stats = [
        { label: "Training modules", value: "3" },
        { label: "Avg. readiness", value: "82%" },
        { label: "Open reviews", value: "4" },
    ];

    return (
        <section className="wrapper mb-8 md:mb-10">
            <div className="library-hero-card">
                <div className="library-hero-content">
                    <div className="library-hero-text">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-white px-3 py-1 text-sm font-medium text-[var(--text-secondary)] shadow-sm">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Onboarding workspace
                        </div>
                        <h1 className="library-hero-title">Train new hires from the docs you already have.</h1>
                        <p className="library-hero-description">
                            Upload SOPs, handbooks, and client workflows. Revise turns them into voice role-play sessions with transcripts, scoring, and manager-ready feedback.
                        </p>
                        <Link href="/books/new" className="library-cta-primary mt-2 flex items-center justify-center">
                            <span>Create training module</span>
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>

                    <div className="library-hero-illustration-desktop">
                        <div className="w-full max-w-[430px] rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-[var(--shadow-soft-md)]">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-muted)]">Active module</p>
                                    <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Agency intern onboarding</h2>
                                </div>
                                <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Live</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                                        <p className="text-xl font-semibold text-[var(--text-primary)]">{stat.value}</p>
                                        <p className="mt-1 text-xs leading-4 text-[var(--text-muted)]">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 space-y-2">
                                {[
                                    { icon: FileText, title: "Company SOP imported", meta: "32 source sections" },
                                    { icon: Mic2, title: "Client communication role-play", meta: "Voice practice ready" },
                                    { icon: UsersRound, title: "2 trainees need review", meta: "Manager feedback queued" },
                                ].map((item) => (
                                    <div key={item.title} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-3">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-[var(--accent-warm)]">
                                            <item.icon className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{item.meta}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="library-hero-illustration">
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-secondary)] shadow-sm">
                            Role-play, score, and review in one flow.
                        </div>
                    </div>

                    <div className="library-steps-card min-w-[260px] max-w-[290px] z-10 shadow-soft-md">
                        <ul className="space-y-4">
                            <li className="library-step-item">
                                <div className="library-step-number"><FileText className="size-4" /></div>
                                <div className="flex flex-col">
                                    <h3 className="library-step-title">Upload docs</h3>
                                    <p className="library-step-description">Add SOPs, policies, or workflows.</p>
                                </div>
                            </li>
                            <li className="library-step-item">
                                <div className="library-step-number"><Mic2 className="size-4" /></div>
                                <div className="flex flex-col">
                                    <h3 className="library-step-title">Practice by voice</h3>
                                    <p className="library-step-description">Run realistic intern scenarios.</p>
                                </div>
                            </li>
                            <li className="library-step-item">
                                <div className="library-step-number"><CheckCircle2 className="size-4" /></div>
                                <div className="flex flex-col">
                                    <h3 className="library-step-title">Review readiness</h3>
                                    <p className="library-step-description">See gaps before real work starts.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroSection
