'use client';

import { ClerkProvider } from "@clerk/nextjs";
import { useTheme } from "next-themes";

const buildClerkAppearance = (isDark: boolean) => ({
    variables: {
        colorPrimary: "#d97757",
        colorText: isDark ? "#fafafa" : "#09090b",
        colorTextSecondary: isDark ? "#a1a1aa" : "#71717a",
        colorBackground: isDark ? "#0a0a0a" : "#ffffff",
        colorInputBackground: isDark ? "#0a0a0a" : "#ffffff",
        colorInputText: isDark ? "#fafafa" : "#09090b",
        colorNeutral: isDark ? "#a1a1aa" : "#71717a",
        borderRadius: "0.875rem",
        fontFamily: "var(--font-mona-sans)",
    },
    elements: {
        avatarBox: "size-9",
        cardBox: "border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-soft-lg)]",
        navbar: "bg-[var(--bg-secondary)]",
        navbarButton: "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        navbarButton__active: "bg-[var(--surface-hover)] text-[var(--text-primary)]",
        userProfileNavbar: "bg-[var(--bg-secondary)]",
        userProfileNavbarButton: "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        userProfileNavbarButton__active: "bg-[var(--surface-hover)] text-[var(--text-primary)]",
        userProfileModalCloseButton: "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        userProfilePageTitle: "text-[var(--text-primary)]",
        userProfileSectionPrimaryButton: "text-[#d97757] hover:text-[#c96a4b]",
        userPreviewMainIdentifier: "text-[var(--text-primary)]",
        userPreviewSecondaryIdentifier: "text-[var(--text-muted)]",
        modalBackdrop: "bg-black/55 backdrop-blur-sm",
        modalContent: "bg-[var(--surface-elevated)] text-[var(--text-primary)]",
        userButtonPopoverCard: "border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft-lg)]",
        userButtonPopoverActionButton: "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
        userButtonPopoverFooter: "hidden",
        footer: "hidden",
        profileSectionPrimaryButton: "bg-[#d97757] text-white hover:bg-[#c96a4b]",
        formButtonPrimary: "bg-[#d97757] text-white hover:bg-[#c96a4b]",
        formFieldInput: "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)]",
    },
    captcha: {
        theme: "auto" as const,
        size: "flexible" as const,
    },
});

const ClerkThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    return (
        <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/auth/redirect"
            signUpFallbackRedirectUrl="/onboarding"
            appearance={buildClerkAppearance(isDark)}
        >
            {children}
        </ClerkProvider>
    );
};

export default ClerkThemeProvider;
