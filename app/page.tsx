import Link from "next/link";
import { Sparkles } from "lucide-react";
import PublicPageState from "@/components/PublicPageState";
import ThemeToggle from "@/components/ThemeToggle";

const LandingPage = () => (
    <main className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <PublicPageState />
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)]">
                    <Sparkles className="size-4" />
                </span>
                <span className="text-sm font-semibold">Revise</span>
            </Link>
            <div className="w-fit">
                <ThemeToggle compact />
            </div>
        </header>

        <section className="flex flex-1 items-center justify-center px-5 pb-20 pt-10 text-center">
            <div className="mx-auto max-w-xl">
                <h1 className="text-4xl font-semibold leading-tight tracking-normal text-[var(--text-primary)] sm:text-5xl">
                    Turn company knowledge into practice-ready training.
                </h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--text-muted)]">
                    Create a workspace, upload one source, and start building voice-ready onboarding modules.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link href="/sign-up" className="inline-flex h-11 items-center justify-center rounded-full bg-[#d97757] px-6 text-sm font-semibold text-white transition hover:bg-[#c96a4b]">
                        Create workspace
                    </Link>
                    <Link href="/sign-in" className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-6 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]">
                        Log in
                    </Link>
                </div>
            </div>
        </section>
    </main>
);

export default LandingPage;
