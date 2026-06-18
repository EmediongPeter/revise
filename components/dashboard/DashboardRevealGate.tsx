'use client';

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import FullPageLoader from "@/components/FullPageLoader";
import { DASHBOARD_REVEAL_KEY, ONBOARDING_COMPLETED_KEY } from "@/lib/onboarding";

const subscribeToOnboarding = (callback: () => void) => {
    window.addEventListener("storage", callback);
    window.addEventListener(ONBOARDING_COMPLETED_KEY, callback);

    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(ONBOARDING_COMPLETED_KEY, callback);
    };
};

const getOnboardingSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
};

const DashboardRevealGate = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const shellRef = useRef<HTMLDivElement>(null);
    const ready = useSyncExternalStore(subscribeToOnboarding, getOnboardingSnapshot, () => false);

    useEffect(() => {
        if (!ready) {
            router.replace("/onboarding");
        }
    }, [ready, router]);

    useEffect(() => {
        if (!ready || !shellRef.current) return;

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
    }, [ready]);

    if (!ready) {
        return <FullPageLoader label="Preparing workspace" />;
    }

    return <div ref={shellRef}>{children}</div>;
};

export default DashboardRevealGate;
