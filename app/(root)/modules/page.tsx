import BookCard from "@/components/BookCard";
import Search from "@/components/Search";
import { getAllBooks } from "@/lib/actions/book.actions";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, FileText } from "lucide-react";

export default async function ModulesPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
    const { query } = await searchParams;
    const bookResults = await getAllBooks(query);
    const modules = bookResults.success ? bookResults.data ?? [] : [];

    return (
        <main className="wrapper container">
            <section className="dashboard-page-header">
                <div>
                    <p className="dashboard-eyebrow">Training modules</p>
                    <h1 className="dashboard-title">Voice practice modules</h1>
                    <p className="dashboard-description">
                        Build scenario-based training from company documents. Each module becomes a source-backed practice room for interns and junior staff.
                    </p>
                </div>
                <Link href="/knowledge/new" className="dashboard-primary-action">
                    <FileText className="size-4" />
                    Upload source
                </Link>
            </section>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3 shadow-sm">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <ClipboardCheck className="size-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{modules.length} modules</p>
                    <p className="text-xs text-[var(--text-muted)]">Generated from company sources</p>
                    </div>
                </div>
                <Search />
            </div>

            {modules.length > 0 ? (
                <div className="library-books-grid">
                    {modules.map((module) => (
                        <BookCard key={module._id} title={module.title} author={module.author} coverURL={module.coverURL} slug={module.slug} />
                    ))}
                </div>
            ) : (
                <section className="rounded-2xl border border-dashed border-[var(--border-medium)] bg-[var(--surface-elevated)] p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                        <FileText className="size-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">No modules yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                        Upload one onboarding source. Revise will suggest voice practice modules from the material.
                    </p>
                    <Link href="/knowledge/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--text-inverse)] shadow-sm transition hover:bg-[var(--accent-warm-hover)]">
                        Upload source
                        <ArrowUpRight className="size-4" />
                    </Link>
                </section>
            )}
        </main>
    );
}

