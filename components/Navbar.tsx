'use client';

import Link from "next/link";
import {usePathname} from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {cn} from "@/lib/utils";
import {FileText, LayoutDashboard, Sparkles} from "lucide-react";

const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "New module", href: "/books/new" },
    { label: "Pricing", href: "/subscriptions" },
]

const Navbar = () => {
    const pathName = usePathname();
    const { user } = useUser();

    return (
        <header className="w-full fixed z-50 border-b border-[var(--border-subtle)] bg-[rgba(247,248,251,0.86)] backdrop-blur-xl">
            <div className="wrapper navbar-height py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--accent-warm)] text-white shadow-[0_8px_24px_rgba(37,99,235,0.22)]">
                        <Sparkles className="size-4" />
                    </div>
                    <span className="logo-text">Revise</span>
                </Link>

                <nav className="w-fit flex items-center gap-2 sm:gap-3">
                    {navItems.map(({ label, href }) => {
                        const isActive = pathName === href || (href !== '/' && pathName.startsWith(href));

                        return (
                            <Link href={href} key={label} className={cn('nav-link-base', isActive ? 'nav-link-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')}>
                                {label === "Dashboard" && <LayoutDashboard className="size-4 sm:hidden" />}
                                {label === "New module" && <FileText className="size-4 sm:hidden" />}
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sr-only sm:hidden">{label}</span>
                            </Link>
                        )
                    })}

                    <div className="ml-2 flex items-center">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="rounded-lg bg-[var(--accent-warm)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-warm-hover)]">
                                    Sign in
                                </button>
                            </SignInButton>
                        </SignedOut>
                        <SignedIn>
                            <div className="nav-user-link rounded-full border border-[var(--border-subtle)] bg-white px-2 py-1 shadow-sm">
                                <UserButton />
                                {user?.firstName && (
                                    <Link href="/subscriptions" className="nav-user-name">
                                        {user.firstName}
                                    </Link>
                                )}
                            </div>
                        </SignedIn>
                    </div>
                </nav>
            </div>
        </header>
    )
}

export default Navbar
