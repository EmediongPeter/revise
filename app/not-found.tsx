import Link from "next/link";
import { SearchX, Sparkles } from "lucide-react";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col bg-[var(--bg-primary)] px-5 text-[var(--text-primary)]">
            <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-5">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--text-primary)] text-[var(--text-inverse)]">
                        <Sparkles className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">Revise</span>
                </Link>
            </header>

            <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center pb-20 text-center">
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)]">
                    <SearchX className="size-5" />
                </div>
                <p className="dashboard-eyebrow">404</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--text-primary)] sm:text-4xl">
                    Page not found
                </h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                    This page is not available in the current workspace.
                </p>
                <Link href="/" className="dashboard-primary-action mt-7">
                    Return home
                </Link>
            </section>
        </main>
    );
}
