import ThemeToggle from "@/components/ThemeToggle";

const AuthShell = ({
    children,
}: {
    children: React.ReactNode;
    mode: "sign-in" | "sign-up";
}) => {
    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)] px-5 py-10 text-[var(--text-primary)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(217,119,87,0.13),transparent_28%),linear-gradient(180deg,color-mix(in_srgb,var(--text-primary)_5%,transparent),transparent_34%)]" />
            <div className="absolute right-5 top-5 z-20">
                <ThemeToggle compact />
            </div>
            <section className="relative z-10 flex w-full max-w-[360px] flex-col items-center text-center">
                {children}
            </section>
        </main>
    );
};

export default AuthShell;
