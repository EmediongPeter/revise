import React from 'react'
import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import {getAllBooks} from "@/lib/actions/book.actions";
import Search from "@/components/Search";
import Link from "next/link";
import {ArrowUpRight, ClipboardCheck, FileText, MessageSquareText, UsersRound} from "lucide-react";

const Page = async ({ searchParams }: { searchParams: Promise<{ query?: string }> }) => {
    const { query } = await searchParams;

    const bookResults = await getAllBooks(query)
    const books = bookResults.success ? bookResults.data ?? [] : []
    const totalSegments = books.reduce((acc, book) => acc + (book.totalSegments || 0), 0);

    return (
        <main className="wrapper container">
            <HeroSection />

            <section className="mb-8 grid gap-3 md:grid-cols-4">
                {[
                    { label: "Training modules", value: books.length, icon: ClipboardCheck },
                    { label: "Source segments", value: totalSegments, icon: FileText },
                    { label: "Voice sessions", value: "Ready", icon: MessageSquareText },
                    { label: "Trainees", value: "Invite next", icon: UsersRound },
                ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
                        <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-blue-50 text-[var(--accent-warm)]">
                            <item.icon className="size-4" />
                        </div>
                        <p className="text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">{item.label}</p>
                    </div>
                ))}
            </section>

            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-warm)]">Workspace</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Training modules</h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Each module is powered by uploaded company material and can be practiced by voice.</p>
                </div>
                <Search />
            </div>

            {books.length > 0 ? (
                <div className="library-books-grid">
                    {books.map((book) => (
                        <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
                    ))}
                </div>
            ) : (
                <section className="rounded-2xl border border-dashed border-[var(--border-medium)] bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-[var(--accent-warm)]">
                        <FileText className="size-5" />
                    </div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Create your first training module</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
                        Start with one onboarding PDF, SOP, or internal guide. Revise will turn it into a voice practice experience for new hires.
                    </p>
                    <Link href="/books/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--accent-warm)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-warm-hover)]">
                        Create module
                        <ArrowUpRight className="size-4" />
                    </Link>
                </section>
            )}
        </main>
    )
}

export default Page
