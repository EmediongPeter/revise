'use client';

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { DASHBOARD_REVEAL_KEY } from "@/lib/onboarding";

const DashboardRevealGate = ({ children }: { children: React.ReactNode }) => {
    const shellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!shellRef.current) return;

        const shouldReveal = window.sessionStorage.getItem(DASHBOARD_REVEAL_KEY) === "true";
        if (!shouldReveal) return;

        window.sessionStorage.removeItem(DASHBOARD_REVEAL_KEY);

        const ctx = gsap.context(() => {
            gsap.set(shellRef.current, {
                autoAlpha: 0,
                y: 28,
                scale: 0.8,
                transformOrigin: "50% 12%",
            });
            gsap.to(shellRef.current, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 1.05,
                ease: "expo.out",
            });
            gsap.fromTo(
                ".dashboard-reveal-item",
                { autoAlpha: 0, y: 20 },
                { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08, delay: 0.22, ease: "power3.out" },
            );
        }, shellRef);

        return () => ctx.revert();
    }, []);

    return <div ref={shellRef}>{children}</div>;
};

export default DashboardRevealGate;
