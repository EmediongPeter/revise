'use client';

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { ArrowRight, KeyRound, Loader2, Mail, Sparkles } from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { toast } from "sonner";
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

const SignUpForm = () => {
    const router = useRouter();
    const { isLoaded, signUp, setActive } = useSignUp();
    const [step, setStep] = useState<AuthStep>("choices");
    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [samlIdentifier, setSamlIdentifier] = useState("");
    const [code, setCode] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOAuthSubmitting, setIsOAuthSubmitting] = useState<string | null>(null);

    const showAuthError = (message: string) => {
        toast.error(message, { duration: 5000 });
    };

    const resetToChoices = () => {
        setStep("choices");
    };

    const completeSignUp = async (sessionId: string | null) => {
        if (!sessionId || !setActive) {
            showAuthError("Your account was created, but we could not start a session. Please sign in.");
            return;
        }

        await setActive({ session: sessionId });
        router.push("/onboarding");
        router.refresh();
    };

    const handleEmailContinue = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStep("password");
    };

    const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isLoaded || !signUp) return;

        setIsSubmitting(true);

        try {
            const result = await signUp.create({
                emailAddress,
                password,
            });

            if (result.status === "complete") {
                await completeSignUp(result.createdSessionId);
                return;
            }

            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPendingVerification(true);
        } catch (authError) {
            showAuthError(getAuthErrorMessage(authError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerification = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isLoaded || !signUp) return;

        setIsSubmitting(true);

        try {
            const result = await signUp.attemptEmailAddressVerification({ code });

            if (result.status === "complete") {
                await completeSignUp(result.createdSessionId);
                return;
            }

            showAuthError("We could not complete verification yet. Check the code and try again.");
        } catch (authError) {
            showAuthError(getAuthErrorMessage(authError));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOAuth = async (strategy: EnabledOAuthStrategy) => {
        if (!isLoaded || !signUp) return;

        setIsOAuthSubmitting(strategy);

        try {
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/onboarding",
            });
        } catch (authError) {
            setIsOAuthSubmitting(null);
            showAuthError(getAuthErrorMessage(authError));
        }
    };

    const handleSamlSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isLoaded || !signUp) return;

        setIsSubmitting(true);

        try {
            await signUp.authenticateWithRedirect({
                strategy: "enterprise_sso" as never,
                identifier: samlIdentifier,
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/onboarding",
            } as never);
        } catch (authError) {
            setIsSubmitting(false);
            showAuthError(getAuthErrorMessage(authError));
        }
    };

    if (pendingVerification) {
        return (
            <div key="verify-step" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Verify your email</h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">Enter the code sent to {emailAddress}.</p>
                <form onSubmit={handleVerification} className="w-full space-y-4">
                    <Input
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        autoFocus
                        placeholder="123456"
                        className="h-[48px] w-full rounded-xl border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-center text-[17px] font-semibold tracking-[0.3em] text-[var(--text-primary)] shadow-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[#d97757]/35"
                    />
                    <Button type="submit" className={submitButtonClass} disabled={!isLoaded || isSubmitting}>
                        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Verify and continue"}
                        {!isSubmitting && <ArrowRight className="size-4" />}
                    </Button>
                </form>
            </div>
        );
    }

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
                    Back to signup
                </button>
            </form>
        );
    }

    if (step === "password") {
        return (
            <form key="password-step" onSubmit={handlePasswordSubmit} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-4">
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)]">Create a password</h2>
                <p className="text-sm font-medium text-[var(--text-muted)]">{emailAddress}</p>
                <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    autoFocus
                    placeholder="At least 8 characters..."
                    className={authInputClass}
                />
                <div id="clerk-captcha" data-cl-theme="auto" data-cl-size="flexible" />
                <Button type="submit" className={submitButtonClass} disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
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
                <Button type="submit" className={secondaryButtonClass} disabled={!isLoaded || isSubmitting}>
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Continue with SAML SSO"}
                </Button>
                <button type="button" onClick={resetToChoices} className={backButtonClass}>
                    Back to signup
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
                <h1 className="text-[22px] font-semibold leading-tight tracking-normal text-[var(--text-primary)]">Create your workspace</h1>
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
            <p className="px-4 pt-6 text-center text-[14px] font-medium leading-6 text-[var(--text-muted)]">
                By signing up, you agree to our <span>Terms of Service</span> and{" "}
                <span>Data Processing Agreement</span>.
            </p>
            <p className="text-center text-[14px] font-medium text-[var(--text-muted)]">
                Already have an account?{" "}
                <Link href="/sign-in" className="font-semibold text-[var(--text-primary)] hover:underline">
                    Log in
                </Link>
            </p>
        </div>
    );
};

export default SignUpForm;
