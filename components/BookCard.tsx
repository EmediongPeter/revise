import Link from "next/link";
import {BookCardProps} from "@/types";
import Image from "next/image";
import {ArrowUpRight, Mic2} from "lucide-react";

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
    return (
        <Link href={`/books/${slug}`}>
            <article className="book-card">
                <figure className="book-card-figure">
                    <div className="book-card-cover-wrapper">
                        <Image src={coverURL} alt={title} width={133} height={200} className="book-card-cover" />
                        <div className="absolute left-3 top-3 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/90 px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] shadow-sm backdrop-blur">
                            Module
                        </div>
                    </div>

                    <figcaption className="book-card-meta">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="book-card-title">{title}</h3>
                                <p className="book-card-author">{author || "Company training source"}</p>
                            </div>
                            <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]" />
                        </div>
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
                            <Mic2 className="size-3.5 text-[var(--text-primary)]" />
                            Voice practice ready
                        </div>
                    </figcaption>
                </figure>
            </article>
        </Link>
    )
}
export default BookCard
