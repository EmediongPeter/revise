'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import {
    BarChart3,
    BookOpenCheck,
    Check,
    ChevronDown,
    ChevronLeft,
    ClipboardCheck,
    Copy,
    HelpCircle,
    LayoutDashboard,
    LogOut,
    Menu,
    Mic2,
    MoreHorizontal,
    PanelLeft,
    Plus,
    Search,
    Settings,
    Sparkles,
    Upload,
    UserPlus,
    UsersRound,
    WalletCards,
    X,
} from "lucide-react";
import { FormEvent, PointerEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const SIDEBAR_COLLAPSED_KEY = "revise.sidebar.collapsed";
const SIDEBAR_WIDTH_KEY = "revise.sidebar.width";
const WORKSPACE_KEY = "revise.workspace";
const ACTIVE_TEAM_KEY = "revise.activeTeam";
const DEFAULT_SIDEBAR_WIDTH = 272;
const MIN_SIDEBAR_WIDTH = 236;
const MAX_SIDEBAR_WIDTH = 320;
const VIEWPORT_GUTTER = 12;
const WORKSPACE_MENU_WIDTH = 360;
const TEAM_MENU_WIDTH = 280;
const TEAM_MENU_HEIGHT = 318;

type WorkspaceState = {
    name: string;
    slug: string;
};

const defaultWorkspace: WorkspaceState = {
    name: "Agency onboarding",
    slug: "agency-onboarding",
};

const teams = [
    { name: "Client success", accent: "bg-[#d97757]" },
    { name: "Operations", accent: "bg-zinc-400" },
];

const primaryNavItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Sources", href: "/knowledge", icon: BookOpenCheck },
    { label: "Training modules", href: "/modules", icon: ClipboardCheck },
    { label: "Trainees", href: "/trainees", icon: UsersRound },
    { label: "Practice sessions", href: "/sessions", icon: Mic2 },
    { label: "Reports", href: "/reports", icon: BarChart3 },
];

const setupNavItems = [
    { label: "Import sources", href: "/books/new", icon: Upload },
    { label: "Invite people", href: "/trainees", icon: UserPlus },
];

const secondaryNavItems = [
    { label: "Usage", href: "/reports", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Billing", href: "/subscriptions", icon: WalletCards },
    { label: "Help", href: "/settings", icon: HelpCircle },
];

const clampSidebarWidth = (width: number) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));

const createStorageStore = (key: string, fallback: string) => {
    const getSnapshot = () => {
        if (typeof window === "undefined") return fallback;
        return window.localStorage.getItem(key) ?? fallback;
    };

    const subscribe = (callback: () => void) => {
        if (typeof window === "undefined") return () => {};

        const handleStorage = (event: StorageEvent) => {
            if (event.key === key) callback();
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener(key, callback);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener(key, callback);
        };
    };

    const setValue = (value: string) => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(key, value);
        window.dispatchEvent(new Event(key));
    };

    return {
        useValue: () => useSyncExternalStore(subscribe, getSnapshot, () => fallback),
        setValue,
    };
};

const collapsedStore = createStorageStore(SIDEBAR_COLLAPSED_KEY, "false");
const widthStore = createStorageStore(SIDEBAR_WIDTH_KEY, String(DEFAULT_SIDEBAR_WIDTH));
const workspaceStore = createStorageStore(WORKSPACE_KEY, JSON.stringify(defaultWorkspace));
const activeTeamStore = createStorageStore(ACTIVE_TEAM_KEY, teams[0].name);

const readWorkspace = (value: string): WorkspaceState => {
    try {
        const workspace = JSON.parse(value) as Partial<WorkspaceState>;
        return {
            name: workspace.name?.trim() || defaultWorkspace.name,
            slug: workspace.slug?.trim() || defaultWorkspace.slug,
        };
    } catch {
        return defaultWorkspace;
    }
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || defaultWorkspace.slug;

const isActivePath = (pathName: string, href: string) => {
    if (href === "/") return pathName === "/";
    if (href === "/modules") return pathName === "/modules" || pathName.startsWith("/books");
    return pathName === href || pathName.startsWith(`${href}/`);
};

const navLinkClass = (active: boolean) =>
    cn(
        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition",
        active
            ? "border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft-sm)]"
            : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
    );

const MenuItem = ({
    children,
    icon: Icon,
    shortcut,
    onClick,
}: {
    children: string;
    icon: typeof Settings;
    shortcut?: string;
    onClick?: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
        <Icon className="size-4 shrink-0 text-[var(--text-muted)]" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{children}</span>
        {shortcut && <span className="text-xs text-[var(--text-muted)]">{shortcut}</span>}
    </button>
);

const WorkspaceMenu = ({
    workspace,
    activeTeam,
    onWorkspaceChange,
    onTeamChange,
    onOpenChange,
}: {
    workspace: WorkspaceState;
    activeTeam: string;
    onWorkspaceChange: (workspace: WorkspaceState) => void;
    onTeamChange: (team: string) => void;
    onOpenChange?: (open: boolean) => void;
}) => {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(workspace.name);
    const [slug, setSlug] = useState(workspace.slug);
    const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: WORKSPACE_MENU_WIDTH });
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setOpen(false);
            onOpenChange?.(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [onOpenChange]);

    const toggleMenu = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        const width = Math.min(WORKSPACE_MENU_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);

        if (rect) {
            setMenuPosition({
                left: Math.min(Math.max(VIEWPORT_GUTTER, rect.left), window.innerWidth - width - VIEWPORT_GUTTER),
                top: rect.bottom + 8,
                width,
            });
        }

        setOpen((current) => {
            const nextOpen = !current;
            onOpenChange?.(nextOpen);
            return nextOpen;
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextWorkspace = {
            name: name.trim() || defaultWorkspace.name,
            slug: slugify(slug || name),
        };

        onWorkspaceChange(nextWorkspace);
        setName(nextWorkspace.name);
        setSlug(nextWorkspace.slug);
        setEditing(false);
    };

    return (
        <div className="relative mb-4">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleMenu}
                className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-full px-1 hover:border py-2 text-left transition hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none"
            >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d97757] text-sm font-semibold text-white">
                    {workspace.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{workspace.name}</p>
                </div>
                <ChevronDown className={cn("size-4 text-[var(--text-muted)] transition", open && "rotate-180")} />
            </button>

            {open && (
                <div
                    ref={menuRef}
                    className="fixed z-[130] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-soft-lg)]"
                    style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
                >
                    {editing ? (
                        <form onSubmit={handleSubmit} className="space-y-3 p-2">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)]">Workspace name</label>
                                <input
                                    value={name}
                                    onChange={(event) => {
                                        setName(event.target.value);
                                        setSlug(slugify(event.target.value));
                                    }}
                                    className="mt-1 h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--text-muted)]">URL</label>
                                <div className="mt-1 flex h-9 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                                    <span className="flex items-center border-r border-[var(--border-subtle)] px-3 text-xs text-[var(--text-muted)]">
                                        revise.app/
                                    </span>
                                    <input
                                        value={slug}
                                        onChange={(event) => setSlug(slugify(event.target.value))}
                                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="h-9 flex-1 rounded-lg border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-secondary)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-9 flex-1 rounded-lg bg-[var(--text-primary)] text-sm font-semibold text-[var(--text-inverse)]"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <div className="px-3 py-2">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{workspace.name}</p>
                                <p className="truncate text-xs text-[var(--text-muted)]">revise.app/{workspace.slug}</p>
                            </div>
                            <div className="my-1 h-px bg-[var(--border-subtle)]" />
                            <MenuItem icon={Settings} shortcut="G then S" onClick={() => setEditing(true)}>
                                Workspace settings
                            </MenuItem>
                            <MenuItem icon={UserPlus}>Invite and manage members</MenuItem>
                            <MenuItem icon={Copy}>Copy workspace URL</MenuItem>
                            <div className="my-1 h-px bg-[var(--border-subtle)]" />
                            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                Teams
                            </div>
                            {teams.map((team) => (
                                <button
                                    key={team.name}
                                    type="button"
                                    onClick={() => onTeamChange(team.name)}
                                    className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                                >
                                    <span className={cn("size-2.5 rounded-full", team.accent)} />
                                    <span className="flex-1 text-left">{team.name}</span>
                                    {activeTeam === team.name && <Check className="size-4 text-[var(--text-primary)]" />}
                                </button>
                            ))}
                            <button
                                type="button"
                                className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                <Plus className="size-4 text-[var(--text-muted)]" />
                                Add team
                            </button>
                            <div className="my-1 h-px bg-[var(--border-subtle)]" />
                            <MenuItem icon={LogOut}>Log out</MenuItem>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const TeamSection = ({
    activeTeam,
    onTeamChange,
    onOpenChange,
}: {
    activeTeam: string;
    onTeamChange: (team: string) => void;
    onOpenChange?: (open: boolean) => void;
}) => {
    const [teamMenuOpen, setTeamMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{
        left: number;
        top?: number;
        bottom?: number;
        width: number;
    }>({ left: 0, top: 0, width: TEAM_MENU_WIDTH });
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            setTeamMenuOpen(false);
            onOpenChange?.(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [onOpenChange]);

    const positionTeamMenu = (rect: DOMRect) => {
        const menuWidth = Math.min(TEAM_MENU_WIDTH, window.innerWidth - VIEWPORT_GUTTER * 2);
        const menuHeight = Math.min(TEAM_MENU_HEIGHT, window.innerHeight - VIEWPORT_GUTTER * 2);
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
        const left = Math.min(
            Math.max(VIEWPORT_GUTTER, rect.left + VIEWPORT_GUTTER),
            window.innerWidth - menuWidth - VIEWPORT_GUTTER,
        );

        if (spaceBelow >= menuHeight) {
            setMenuPosition({ left, top: rect.bottom + 6, width: menuWidth });
            return;
        }

        setMenuPosition({
            left,
            bottom: Math.max(VIEWPORT_GUTTER, window.innerHeight - rect.top + 6),
            width: menuWidth,
        });
    };

    const openTeamMenu = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) positionTeamMenu(rect);
        setTeamMenuOpen((current) => {
            const nextOpen = !current;
            onOpenChange?.(nextOpen);
            return nextOpen;
        });
    };

    const handleTeamContextMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        positionTeamMenu(rect);
        setTeamMenuOpen(true);
        onOpenChange?.(true);
    };

    return (
        <div className="mt-4">
            <div className="mb-1 flex items-center justify-between px-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Team</p>
                <button
                    type="button"
                    className="rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                    <Plus className="size-3.5" />
                </button>
            </div>
            <div className="relative">
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={openTeamMenu}
                    onContextMenu={handleTeamContextMenu}
                    className="flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                    <span className="size-2.5 rounded-full bg-[#d97757]" />
                    <span className="flex-1 truncate text-left">{activeTeam}</span>
                    <MoreHorizontal className="size-4 text-[var(--text-muted)]" />
                </button>
                {teamMenuOpen && (
                    <div
                        ref={menuRef}
                        className="fixed z-[120] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-soft-lg)]"
                        style={{
                            left: menuPosition.left,
                            top: menuPosition.top,
                            bottom: menuPosition.bottom,
                            width: menuPosition.width,
                            maxHeight: `calc(100vh - ${VIEWPORT_GUTTER * 2}px)`,
                        }}
                    >
                        <MenuItem icon={Sparkles} shortcut="Alt F">
                            Favorite
                        </MenuItem>
                        <MenuItem icon={Settings}>Team settings</MenuItem>
                        <MenuItem icon={Copy}>Copy team URL</MenuItem>
                        <MenuItem icon={BookOpenCheck}>Open archive</MenuItem>
                        <div className="my-1 h-px bg-[var(--border-subtle)]" />
                        {teams.map((team) => (
                            <button
                                key={team.name}
                                type="button"
                                onClick={() => {
                                    onTeamChange(team.name);
                                    setTeamMenuOpen(false);
                                    onOpenChange?.(false);
                                }}
                                className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                <span className={cn("size-2.5 rounded-full", team.accent)} />
                                <span className="flex-1 text-left">{team.name}</span>
                                {activeTeam === team.name && <Check className="size-4" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-1 space-y-1 pl-5">
                <Link href="/modules" className={navLinkClass(false)}>
                    <ClipboardCheck className="size-4 shrink-0" />
                    <span className="truncate">Training plans</span>
                </Link>
                <Link href="/sessions" className={navLinkClass(false)}>
                    <Mic2 className="size-4 shrink-0" />
                    <span className="truncate">Practice queue</span>
                </Link>
            </div>
        </div>
    );
};

const SidebarContent = ({
    onNavigate,
}: {
    onNavigate?: () => void;
}) => {
    const pathName = usePathname();
    const { user } = useUser();
    const workspace = readWorkspace(workspaceStore.useValue());
    const activeTeam = activeTeamStore.useValue();
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
    const [teamMenuOpen, setTeamMenuOpen] = useState(false);
    const [scrollState, setScrollState] = useState({
        visible: false,
        top: 0,
        height: 0,
        scrollable: false,
        viewportTop: 0,
    });
    const sidebarMenuOpen = workspaceMenuOpen || teamMenuOpen;

    const handleWorkspaceChange = (nextWorkspace: WorkspaceState) => {
        workspaceStore.setValue(JSON.stringify(nextWorkspace));
    };

    const handleTeamChange = (team: string) => {
        activeTeamStore.setValue(team);
    };

    const updateScrollThumb = useCallback((visible: boolean) => {
        const node = scrollRef.current;
        if (!node) return;

        const trackHeight = node.clientHeight;
        const scrollableAmount = node.scrollHeight - node.clientHeight;
        const viewportTop = node.getBoundingClientRect().top;

        if (scrollableAmount <= 0) {
            setScrollState({ visible: false, top: 0, height: 0, scrollable: false, viewportTop });
            return;
        }

        const thumbHeight = Math.max(28, Math.min(88, (node.clientHeight / node.scrollHeight) * trackHeight));
        const thumbTop = (node.scrollTop / scrollableAmount) * (trackHeight - thumbHeight);

        setScrollState({
            visible,
            top: thumbTop,
            height: thumbHeight,
            scrollable: true,
            viewportTop,
        });
    }, []);

    const showScrollThumb = () => {
        if (scrollHideTimer.current) clearTimeout(scrollHideTimer.current);
        updateScrollThumb(true);
    };

    const scheduleScrollThumbHide = () => {
        if (scrollHideTimer.current) clearTimeout(scrollHideTimer.current);
        scrollHideTimer.current = setTimeout(() => updateScrollThumb(false), 650);
    };

    const handleSidebarScroll = () => {
        showScrollThumb();
        scheduleScrollThumbHide();
    };

    useEffect(() => {
        updateScrollThumb(false);
        const handleResize = () => updateScrollThumb(false);
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            if (scrollHideTimer.current) clearTimeout(scrollHideTimer.current);
        };
    }, [updateScrollThumb]);

    return (
        <div className="relative flex h-full flex-col overflow-visible">
            <div
                ref={scrollRef}
                onScroll={handleSidebarScroll}
                onMouseEnter={showScrollThumb}
                onMouseLeave={scheduleScrollThumbHide}
                onWheel={sidebarMenuOpen ? (event) => event.preventDefault() : undefined}
                onTouchMove={sidebarMenuOpen ? (event) => event.preventDefault() : undefined}
                className={cn("sidebar-scroll min-h-0 flex-1 pr-1", sidebarMenuOpen ? "overflow-hidden" : "overflow-y-auto")}
            >
                <div className="pb-32">
                    <WorkspaceMenu
                        workspace={workspace}
                        activeTeam={activeTeam}
                        onWorkspaceChange={handleWorkspaceChange}
                        onTeamChange={handleTeamChange}
                        onOpenChange={setWorkspaceMenuOpen}
                    />

                    <div className="mb-3">
                        <button
                            type="button"
                            className="inline-flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 text-[13px] text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Search className="size-4" />
                            Search
                        </button>
                    </div>

                    <Link
                        href="/books/new"
                        onClick={onNavigate}
                        className="mb-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[#d97757] px-3 text-[13px] font-semibold text-white shadow-[var(--shadow-soft-sm)] transition hover:bg-[#c96849]"
                    >
                        <Upload className="size-4" />
                        Upload source
                    </Link>

                    <nav className="flex flex-col gap-1">
                        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Manage
                        </p>
                        {primaryNavItems.map(({ label, href, icon: Icon }) => {
                            const active = isActivePath(pathName, href);

                            return (
                                <Link href={href} onClick={onNavigate} key={label} className={navLinkClass(active)}>
                                    <Icon className="size-4 shrink-0" />
                                    <span className="truncate">{label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <TeamSection activeTeam={activeTeam} onTeamChange={handleTeamChange} onOpenChange={setTeamMenuOpen} />

                    <nav className="mt-4 flex flex-col gap-1">
                        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            Try
                        </p>
                        {setupNavItems.map(({ label, href, icon: Icon }) => (
                            <Link href={href} onClick={onNavigate} key={label} className={navLinkClass(isActivePath(pathName, href))}>
                                <Icon className="size-4 shrink-0" />
                                <span>{label}</span>
                            </Link>
                        ))}
                    </nav>

                    <nav className="mt-4 border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-1">
                        {secondaryNavItems.map(({ label, href, icon: Icon }) => {
                            const active = isActivePath(pathName, href);

                            return (
                                <Link href={href} onClick={onNavigate} key={label} className={navLinkClass(active)}>
                                    <Icon className="size-4 shrink-0" />
                                    <span>{label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {scrollState.scrollable && !sidebarMenuOpen && (
                <div
                    className={cn(
                        "pointer-events-none absolute -right-[11px] z-10 w-[3px] rounded-full bg-[#d97757] shadow-[0_0_10px_rgba(217,119,87,0.35)] transition-opacity duration-200",
                        scrollState.visible ? "opacity-90" : "opacity-0",
                    )}
                    style={{
                        top: scrollState.top + 8,
                        height: scrollState.height,
                    }}
                />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-35 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent" />

            <div className="relative z-10 bg-[var(--bg-primary)] pt-3">
                <ThemeToggle />

                <SignedOut>
                    <SignInButton mode="modal">
                        <button className="mt-3 flex h-9 w-full items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-[13px] font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)]">
                            Sign in
                        </button>
                    </SignInButton>
                </SignedOut>
                <SignedIn>
                    <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2 shadow-[var(--shadow-soft-sm)]">
                        <div className="flex min-w-0 items-center gap-2">
                            <UserButton />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                    {user?.firstName || "Manager"}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">Admin</p>
                            </div>
                        </div>
                    </div>
                </SignedIn>
            </div>
        </div>
    );
};

const Navbar = () => {
    const pathName = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [railHintVisible, setRailHintVisible] = useState(false);
    const collapsed = collapsedStore.useValue() === "true";
    const persistedWidth = Number(widthStore.useValue());
    const sidebarWidth = clampSidebarWidth(Number.isFinite(persistedWidth) ? persistedWidth : DEFAULT_SIDEBAR_WIDTH);
    const dragStart = useRef<{ x: number; width: number } | null>(null);
    const dragMoved = useRef(false);

    useEffect(() => {
        document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
        document.documentElement.dataset.sidebarCollapsed = String(collapsed);
    }, [collapsed, sidebarWidth]);

    const setCollapsed = (nextCollapsed: boolean) => {
        collapsedStore.setValue(String(nextCollapsed));
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable;

            if (isTyping || event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) return;

            event.preventDefault();
            setCollapsed(!collapsed);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [collapsed]);

    const handleResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        dragStart.current = { x: event.clientX, width: sidebarWidth };
        dragMoved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        if (!dragStart.current) return;
        if (Math.abs(event.clientX - dragStart.current.x) > 3) dragMoved.current = true;
        const nextWidth = clampSidebarWidth(dragStart.current.width + event.clientX - dragStart.current.x);
        widthStore.setValue(String(nextWidth));
    };

    const handleResizePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
        dragStart.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    if (pathName.startsWith("/onboarding")) return null;

    return (
        <>
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 hidden h-screen border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2.5 transition-transform duration-200 ease-out lg:block",
                    collapsed ? "pointer-events-none -translate-x-full" : "translate-x-0",
                )}
                style={{ width: sidebarWidth }}
            >
                <SidebarContent />
                <button
                    type="button"
                    aria-label="Resize sidebar"
                    onMouseEnter={() => setRailHintVisible(true)}
                    onMouseLeave={() => setRailHintVisible(false)}
                    onPointerDown={handleResizePointerDown}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    className="group absolute -right-1 top-0 z-[60] h-full w-2 cursor-col-resize bg-transparent transition hover:bg-[#d97757]/35"
                />
                <button
                    type="button"
                    aria-label="Collapse sidebar"
                    onMouseEnter={() => setRailHintVisible(true)}
                    onMouseLeave={() => setRailHintVisible(false)}
                    onClick={() => setCollapsed(true)}
                    className="absolute -right-3 top-1/2 z-[70] flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] shadow-[var(--shadow-soft-sm)] transition hover:border-[#d97757]/50 hover:text-[var(--text-primary)]"
                >
                    <ChevronLeft className="size-3.5" />
                </button>
                <div
                    className={cn(
                        "pointer-events-none absolute left-[calc(100%+18px)] top-1/2 z-[140] -translate-y-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--text-primary)] shadow-[var(--shadow-soft-lg)] transition-opacity",
                        railHintVisible ? "opacity-100" : "opacity-0",
                    )}
                >
                    <p className="whitespace-nowrap">Drag to resize</p>
                    <div className="flex items-center gap-3">
                        <span className="whitespace-nowrap">Click to collapse</span>
                        <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                            [
                        </kbd>
                    </div>
                </div>
            </aside>

            {collapsed && (
                <button
                    type="button"
                    aria-label="Open sidebar"
                    onClick={() => setCollapsed(false)}
                    className="fixed left-4 top-4 z-50 hidden size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] lg:inline-flex"
                >
                    <PanelLeft className="size-4" />
                </button>
            )}

            <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 px-4 backdrop-blur-xl lg:hidden">
                <button
                    type="button"
                    aria-label="Open navigation"
                    onClick={() => setIsOpen(true)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft-sm)]"
                >
                    <Menu className="size-4" />
                </button>

                <Link href="/" className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--text-primary)] text-[var(--text-inverse)]">
                        <Sparkles className="size-4" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Revise</span>
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        href="/books/new"
                        className="inline-flex size-9 items-center justify-center rounded-lg bg-[#d97757] text-white"
                    >
                        <Upload className="size-4" />
                        <span className="sr-only">Upload source</span>
                    </Link>
                    <ThemeToggle compact />
                </div>
            </header>

            {isOpen && (
                <div className="fixed inset-0 z-[80] lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 w-[min(86vw,320px)] border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 shadow-2xl">
                        <div className="mb-4 flex justify-end">
                            <button
                                type="button"
                                aria-label="Close navigation"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <SidebarContent onNavigate={() => setIsOpen(false)} />
                    </aside>
                </div>
            )}
        </>
    );
};

export default Navbar;
