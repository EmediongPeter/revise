'use client';

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
    Bell,
    CreditCard,
    HelpCircle,
    LogOut,
    MessageSquareText,
    Monitor,
    Moon,
    Settings,
    ShieldCheck,
    Sun,
    UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const getDisplayName = (user: ReturnType<typeof useUser>["user"]) => {
    const name = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    if (name.trim()) return name;

    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) return email.split("@")[0];

    return "Account owner";
};

const getEmail = (user: ReturnType<typeof useUser>["user"]) => user?.primaryEmailAddress?.emailAddress || "No email added";

const ThemeOption = ({
    value,
    current,
    icon: Icon,
    label,
    onSelect,
}: {
    value: "light" | "system" | "dark";
    current?: string;
    icon: typeof Sun;
    label: string;
    onSelect: (value: "light" | "system" | "dark") => void;
}) => (
    <button
        type="button"
        aria-label={`${label} theme`}
        title={`${label} theme`}
        onClick={() => onSelect(value)}
        className={cn(
            "inline-flex size-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
            current === value && "bg-[var(--surface-hover)] text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]",
        )}
    >
        <Icon className="size-4" />
    </button>
);

const UserMenu = () => {
    const { user } = useUser();
    const { openUserProfile, signOut } = useClerk();
    const { theme, setTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const displayName = getDisplayName(user);
    const email = getEmail(user);

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const openAccount = () => {
        setOpen(false);
        openUserProfile();
    };

    const handleSignOut = async () => {
        setOpen(false);
        await signOut({ redirectUrl: "/" });
    };

    return (
        <div className="relative mt-3">
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-2 text-left shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] cursor-pointer"
            >
                <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--text-primary)]">
                    {user?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                        <UserRound className="size-5" />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">Admin</span>
                </span>
            </button>

            {open && (
                <div
                    ref={menuRef}
                    role="menu"
                    className="absolute bottom-[calc(100%+10px)] left-0 z-[140] w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft-lg)]"
                >
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
                        <button
                            type="button"
                            onClick={openAccount}
                            className="min-w-0 text-left"
                        >
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{displayName}</p>
                            <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">{email}</p>
                        </button>
                        <button
                            type="button"
                            aria-label="Manage account"
                            title="Manage account"
                            onClick={openAccount}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Settings className="size-4" />
                        </button>
                    </div>

                    <div className="p-2">
                        <button type="button" role="menuitem" onClick={openAccount} className="user-menu-item">
                            <ShieldCheck className="size-4" />
                            <span>Manage account</span>
                        </button>
                        <Link href="/settings" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
                            <Settings className="size-4" />
                            <span>Workspace settings</span>
                        </Link>
                        <Link href="/subscriptions" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
                            <CreditCard className="size-4" />
                            <span>Billing</span>
                        </Link>

                        <div className="my-1 h-px bg-[var(--border-subtle)]" />

                        <div className="flex items-center justify-between rounded-xl px-3 py-2">
                            <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                                <Monitor className="size-4 text-[var(--text-muted)]" />
                                <span>Theme</span>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-0.5">
                                <ThemeOption value="light" current={theme} icon={Sun} label="Light" onSelect={setTheme} />
                                <ThemeOption value="system" current={theme} icon={Monitor} label="System" onSelect={setTheme} />
                                <ThemeOption value="dark" current={theme} icon={Moon} label="Dark" onSelect={setTheme} />
                            </div>
                        </div>

                        <div className="my-1 h-px bg-[var(--border-subtle)]" />

                        <Link href="/settings" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
                            <Bell className="size-4" />
                            <span>Product updates</span>
                        </Link>
                        <Link href="/settings" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
                            <HelpCircle className="size-4" />
                            <span>Help center</span>
                        </Link>
                        <Link href="/settings" role="menuitem" className="user-menu-item" onClick={() => setOpen(false)}>
                            <MessageSquareText className="size-4" />
                            <span>Send feedback</span>
                        </Link>

                        <div className="my-1 h-px bg-[var(--border-subtle)]" />

                        <button type="button" role="menuitem" onClick={handleSignOut} className="user-menu-item">
                            <LogOut className="size-4" />
                            <span>Log out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
