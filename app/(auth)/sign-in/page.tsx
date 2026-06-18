import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";

const SignInPage = () => (
    <AuthShell mode="sign-in">
        <Suspense fallback={<div className="h-[360px] rounded-xl bg-[var(--surface-elevated)]" />}>
            <SignInForm />
        </Suspense>
    </AuthShell>
);

export default SignInPage;
