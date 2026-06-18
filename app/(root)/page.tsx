import HeroSection from "@/components/HeroSection";
import BookCard from "@/components/BookCard";
import {getAllBooks} from "@/lib/actions/book.actions";
import Search from "@/components/Search";
import Link from "next/link";
import { EmptyState, MetricCard, PageHeader } from "@/components/dashboard/DashboardPrimitives";
import {
    BookOpenCheck,
    ClipboardCheck,
    FileText,
    MessageSquareText,
    TriangleAlert,
    UsersRound
} from "lucide-react";

const Page = async ({ searchParams }: { searchParams: Promise<{ query?: string }> }) => {
    const { query } = await searchParams;

    const bookResults = await getAllBooks(query)
    const books = bookResults.success ? bookResults.data ?? [] : []
    const totalSegments = books.reduce((acc, book) => acc + (book.totalSegments || 0), 0);

    return (
        <main className="wrapper container">
            <PageHeader
                eyebrow="Overview"
                title="Training operations"
                description="Track modules, readiness, trainee risk, and source-backed voice practice for your onboarding workspace."
                actions={
                    <>
                    <Link href="/trainees" className="dashboard-secondary-action">
                        <UsersRound className="size-4" />
                        Invite trainee
                    </Link>
                    <Link href="/books/new" className="dashboard-primary-action">
                        <FileText className="size-4" />
                        Upload source
                    </Link>
                    </>
                }
            />

            <HeroSection />

            <section className="mb-8 grid gap-3 md:grid-cols-4">
                {[
                    { label: "Training modules", value: books.length, icon: ClipboardCheck },
                    { label: "Source chunks", value: totalSegments, icon: BookOpenCheck },
                    { label: "Voice sessions", value: "Ready", icon: MessageSquareText },
                    { label: "Open risks", value: "4", icon: TriangleAlert },
                ].map((item) => (
                    <MetricCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
                ))}
            </section>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Workspace</p>
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
                <EmptyState
                    icon={FileText}
                    title="Upload your first company source"
                    description="Start with one onboarding PDF, SOP, or internal guide. Revise will prepare it for voice practice and suggested training modules."
                    action={{ label: "Upload source", href: "/books/new" }}
                />
            )}
        </main>
    )
}

export default Page
