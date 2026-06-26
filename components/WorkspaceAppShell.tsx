"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import NewSourceModal, { openNewSourceModal } from "@/components/knowledge/NewSourceModal";
import { getWorkspaceTeamData } from "@/lib/actions/workspace.actions";

const publicRoutePrefixes = ["/sign-in", "/sign-up", "/sso-callback", "/onboarding"];
const rootAppRoutes = new Set([
    "knowledge",
    "modules",
    "trainees",
    "sessions",
    "reports",
    "settings",
    "subscriptions",
    "wizard",
    "books",
]);
const workspaceAppSections = new Set(["knowledge", "modules", "trainees", "sessions", "reports", "settings", "subscriptions", "wizard"]);

const isRootAppRoute = (segment?: string) => Boolean(segment && rootAppRoutes.has(segment));

const WorkspaceAppShell = ({ children }: { children: React.ReactNode }) => {
    const pathName = usePathname();
    const [activeWorkspaceSlug, setActiveWorkspaceSlug] = useState<string>();
    const segments = useMemo(() => pathName.split("/").filter(Boolean), [pathName]);
    const [firstSegment, secondSegment] = segments;
    const isPublicRoute =
        pathName === "/" ||
        publicRoutePrefixes.some((prefix) => pathName === prefix || pathName.startsWith(`${prefix}/`));
    const isWorkspaceSection = workspaceAppSections.has(secondSegment);
    const isPotentialWorkspaceHome = segments.length === 1 && !isRootAppRoute(firstSegment);
    const shouldUseShell =
        !isPublicRoute &&
        (isRootAppRoute(firstSegment) ||
            isWorkspaceSection ||
            (isPotentialWorkspaceHome && firstSegment === activeWorkspaceSlug));

    useEffect(() => {
        let mounted = true;

        if (!shouldUseShell) return;

        getWorkspaceTeamData().then((result) => {
            if (!mounted || !result.success) return;
            setActiveWorkspaceSlug(result.data.activeWorkspace.slug);
        });

        return () => {
            mounted = false;
        };
    }, [shouldUseShell, pathName]);

    useEffect(() => {
        if (!shouldUseShell) return;

        let firstKeyAt = 0;

        const handleShortcut = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTyping =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.tagName === "SELECT" ||
                target?.isContentEditable;

            const key = event.key.toLowerCase();
            const now = Date.now();
            const isMac = navigator.platform.toLowerCase().includes("mac");
            const newSourceChord = key === "s" && event.altKey && (isMac ? event.metaKey : event.ctrlKey);

            if (!isTyping && newSourceChord) {
                event.preventDefault();
                openNewSourceModal();
                return;
            }

            if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

            if (key === "n") {
                firstKeyAt = now;
                return;
            }

            if (key === "s" && now - firstKeyAt < 900) {
                event.preventDefault();
                openNewSourceModal();
            }
        };

        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [shouldUseShell]);

    if (!shouldUseShell) return children;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] lg:h-screen lg:overflow-hidden lg:p-2 lg:pl-1">
            <section className="min-h-screen overflow-visible bg-[var(--bg-primary)] lg:flex lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-2xl lg:bg-[var(--surface-elevated)]">
                <div className="w-full min-w-0 lg:h-full lg:overflow-y-auto lg:[scrollbar-width:thin] lg:[scrollbar-color:color-mix(in_srgb,var(--text-muted)_40%,transparent)_transparent] [&_.container.wrapper]:max-w-none [&_.container.wrapper]:px-4 [&_.container.wrapper]:sm:px-6 [&_.new-book]:max-w-none [&_.new-book]:px-4 [&_.new-book]:sm:px-6 lg:[&_.container.wrapper]:min-h-0 lg:[&_.container.wrapper]:px-7 lg:[&_.container.wrapper]:pb-8 lg:[&_.container.wrapper]:pt-7 lg:[&_.dashboard-description]:text-[15px] lg:[&_.dashboard-page-header]:mb-5 lg:[&_.dashboard-title]:!text-[28px] lg:[&_.metric-card]:rounded-xl lg:[&_.metric-card]:p-4 lg:[&_.new-book]:min-h-0 lg:[&_.new-book]:px-7 lg:[&_.new-book]:pb-8 lg:[&_.new-book]:pt-7 lg:[&_.wrapper.container]:min-h-0 lg:[&_.wrapper.container]:px-7 lg:[&_.wrapper.container]:pb-8 lg:[&_.wrapper.container]:pt-7">
                    {children}
                </div>
            </section>
            <NewSourceModal workspaceSlug={isWorkspaceSection ? firstSegment : activeWorkspaceSlug} />
        </div>
    );
};

export default WorkspaceAppShell;
