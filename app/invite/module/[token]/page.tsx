import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptModuleInvite } from "@/lib/actions/practice.actions";

const ModuleInvitePage = async ({
    params,
}: {
    params: Promise<{ token: string }>;
}) => {
    const [{ token }, { userId }] = await Promise.all([params, auth()]);
    const invitePath = `/invite/module/${token}`;

    if (!userId) {
        redirect(`/sign-in?redirect_url=${encodeURIComponent(invitePath)}`);
    }

    const result = await acceptModuleInvite(token);

    if (result.success) {
        redirect(result.data.practiceHref);
    }

    return (
        <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
            <section className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-soft-lg)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Practice invite</p>
                <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">We could not accept this invite</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{result.error}</p>
                <Link
                    href="/sign-in"
                    className="mt-5 inline-flex h-10 items-center rounded-full bg-[#d97757] px-4 text-sm font-semibold text-white"
                >
                    Sign in with another account
                </Link>
            </section>
        </main>
    );
};

export default ModuleInvitePage;
