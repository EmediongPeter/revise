'use client';

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { ArrowRight, KeyRound, Loader2, Mail, Sparkles } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthErrorMessage } from "@/components/auth/AuthErrors";
import { EnabledOAuthStrategy, GOOGLE_OAUTH_STRATEGY } from "@/components/auth/oauth";

type AuthStep = "choices" | "email" | "password" | "saml";

const authInputClass =
    "h-[48px] w-full rounded-xl border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-[15px] font-medium text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[#d97757]/35";
const secondaryButtonClass =
    "h-[48px] w-full rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[15px] font-semibold text-[var(--text-primary)] shadow-none hover:bg-[var(--surface-hover)]";
const submitButtonClass =
    "h-[48px] w-full rounded-full bg-[var(--text-primary)] text-[15px] font-semibold text-[var(--text-inverse)] shadow-none hover:bg-[var(--accent-warm-hover)]";
const backButtonClass =
    "cursor-pointer text-[15px] font-semibold text-[var(--text-muted)] underline underline-offset-4 hover:text-[var(--text-primary)]";
const errorClass = "rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm leading-5 text-red-500";

const SignInForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isLoaded, signIn, setActive } = useSignIn();
    const [step, setStep] = useState<AuthStep>("choices");
    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [samlIdentifier, setSamlIdentifier] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthSubmitting, setIsOAuthSubmitting] = useState<string | null>(null);
    const [error, setError] = useState("");

    const requestedRedirectUrl = searchParams.get("redirect_url") || searchParams.get("redirectUrl");
    const redirectUrl = requestedRedirectUrl
        ? `/auth/redirect?redirect_url=${encodeURIComponent(requestedRedirectUrl)}`
        : "/auth/redirect";

    const resetToChoices = () => {
        setStep("choices");
        setError("");
    };

    const handleEmailContinue = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setStep("password");
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isLoaded || !signIn) return;

        setIsSubmitting(true);
        setError("");

        try {
            const result = await signIn.create({
                identifier: emailAddress,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.replace(redirectUrl);
                router.refresh();
                return;
            }

            setError("This sign-in needs an extra verification step. Please use the code sent to your email or try another method.");
        } catch (authError) {
            setError(getAuthErrorMessage(authError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOAuth = async (strategy: EnabledOAuthStrategy) => {
        if (!isLoaded || !signIn) return;

        setError("");
        setIsOAuthSubmitting(strategy);

        try {
            await signIn.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: redirectUrl,
            });
        } catch (authError) {
            setIsOAuthSubmitting(null);
            setError(getAuthErrorMessage(authError));
        }
    };

    const handleSamlSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isLoaded || !signIn) return;

        setIsSubmitting(true);
        setError("");

        try {
            await signIn.authenticateWithRedirect({
                strategy: "enterprise_sso" as never,
                identifier: samlIdentifier,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: redirectUrl,
            } as never);
        } catch (authError) {
            setIsSubmitting(false);
            setError(getAuthErrorMessage(authError));
        }
    };

    if (step === "email") {
        return (
            <form key="email-step" onSubmit={handleEmailContinue} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">What&apos;s your email address?</h2>
                <Input
                    type="email"
                    value={emailAddress}
                    onChange={(event) => setEmailAddress(event.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="Enter your email address..."
                    className={authInputClass}
                />
                <Button type="submit" className={secondaryButtonClass}>
                    Continue with email
                </Button>
                <button type="button" onClick={resetToChoices} className={backButtonClass}>
                    Back to login
                </button>
            </form>
        );
    }

    if (step === "password") {
        return (
            <form key="password-step" onSubmit={handlePasswordSubmit} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Enter your password</h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">{emailAddress}</p>
                <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    autoFocus
                    placeholder="Enter your password..."
                    className={authInputClass}
                />
                {error && <p className={errorClass}>{error}</p>}
                <Button type="submit" className={submitButtonClass} disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Log in"}
                    {!isSubmitting && <ArrowRight className="size-4" />}
                </Button>
                <button type="button" onClick={() => setStep("email")} className={backButtonClass}>
                    Back to email
                </button>
            </form>
        );
    }

    if (step === "saml") {
        return (
            <form key="saml-step" onSubmit={handleSamlSubmit} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Use your company SSO</h2>
                <Input
                    type="email"
                    value={samlIdentifier}
                    onChange={(event) => setSamlIdentifier(event.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                    placeholder="name@company.com"
                    className={authInputClass}
                />
                {error && <p className={errorClass}>{error}</p>}
                <Button type="submit" className={secondaryButtonClass} disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Continue with SAML SSO"}
                </Button>
                <button type="button" onClick={resetToChoices} className={backButtonClass}>
                    Back to login
                </button>
            </form>
        );
    }

    return (
        <div key="choices-step" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3.5">
            <div className="mb-8 flex flex-col items-center">
                <div className="mb-7 flex size-11 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--text-inverse)] shadow-[var(--shadow-soft)]">
                    <Sparkles className="size-5" />
                </div>
                <h1 className="text-[22px] font-semibold leading-tight tracking-normal text-[var(--text-primary)]">Log in to Revise</h1>
            </div>
            <Button
                type="button"
                className="h-[48px] w-full rounded-full bg-[#d97757] text-[15px] font-semibold text-white shadow-none hover:bg-[#c96a4b]"
                disabled={!isLoaded || Boolean(isOAuthSubmitting) || isSubmitting}
                onClick={() => handleOAuth(GOOGLE_OAUTH_STRATEGY)}
            >
                {isOAuthSubmitting === GOOGLE_OAUTH_STRATEGY ? <Loader2 className="size-4 animate-spin" /> : <FaGoogle className="size-4" />}
                Continue with Google
            </Button>
            <Button type="button" className={secondaryButtonClass} onClick={() => setStep("email")}>
                <Mail className="size-4" />
                Continue with email
            </Button>
            <Button type="button" className={secondaryButtonClass} onClick={() => setStep("saml")}>
                <KeyRound className="size-4" />
                Continue with SAML SSO
            </Button>
            {error && <p className={errorClass}>{error}</p>}
            <p className="pt-6 text-center text-[14px] font-medium text-[var(--text-muted)]">
                New to Revise?{" "}
                <Link href="/sign-up" className="font-semibold text-[var(--text-primary)] hover:underline">
                    Create an account
                </Link>
            </p>
        </div>
    );
};

export default SignInForm;
