'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { gsap } from "gsap";
import { ArrowRight, Camera, Check, FileText, Link2, Upload, X } from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";
import { SiGoogledrive, SiNotion, SiSlack } from "react-icons/si";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FullPageLoader from "@/components/FullPageLoader";
import { completeOnboarding, connectGoogleDrive } from "@/lib/actions/onboarding.actions";
import {
    DASHBOARD_REVEAL_KEY,
    defaultOnboardingProfile,
    industries,
    integrations,
    OnboardingProfile,
    slugifyWorkspace,
    trainingGoals,
} from "@/lib/onboarding";

type StepId = "welcome" | "workspace" | "profile" | "training" | "source" | "invite" | "integrations" | "updates";

type ExtendedProfile = OnboardingProfile & {
    displayName: string;
    profileImageName: string;
    updates: boolean;
    onboardingTips: boolean;
    otherTrainingGoal: string;
    uploadedSourceName: string;
};

const steps: { id: StepId; skippable: boolean }[] = [
    { id: "welcome", skippable: false },
    { id: "workspace", skippable: false },
    { id: "profile", skippable: false },
    { id: "training", skippable: false },
    { id: "source", skippable: true },
    { id: "invite", skippable: true },
    { id: "integrations", skippable: true },
    { id: "updates", skippable: true },
];

const profileDefaults: ExtendedProfile = {
    ...defaultOnboardingProfile,
    displayName: "",
    profileImageName: "",
    updates: false,
    onboardingTips: false,
    otherTrainingGoal: "",
    uploadedSourceName: "",
};

const integrationIcons = {
    "Google Drive": SiGoogledrive,
    Notion: SiNotion,
    Slack: SiSlack,
    SharePoint: FaMicrosoft,
};

const suggestedRoles = ["Founder", "HR lead", "Operations manager", "Team lead", "Trainer"];

const splitDisplayName = (value: string) => {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");

    return { firstName, lastName };
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[13px] font-medium text-[var(--text-muted)]">{children}</span>
);

const TextInput = ({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) => (
    <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3.5 text-[15px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#d97757]/70 focus:ring-3 focus:ring-[#d97757]/10"
    />
);

const Chip = ({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: string;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-medium transition",
            active
                ? "border-[#d97757]/55 bg-[#d97757]/12 text-[var(--text-primary)]"
                : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]",
        )}
    >
        {children}
    </button>
);

const ToggleRow = ({
    title,
    description,
    checked,
    onClick,
}: {
    title: string;
    description: string;
    checked: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-4 text-left last:border-b-0"
    >
        <span>
            <span className="block text-[15px] font-semibold text-[var(--text-primary)]">{title}</span>
            <span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">{description}</span>
        </span>
        <span
            className={cn(
                "relative h-6 w-11 shrink-0 rounded-full border transition",
                checked ? "border-[#d97757] bg-[#d97757]" : "border-[var(--border-subtle)] bg-[var(--surface-hover)]",
            )}
        >
            <span
                className={cn(
                    "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow transition",
                    checked ? "left-[22px]" : "left-1",
                )}
            />
        </span>
    </button>
);

const OnboardingExperience = () => {
    const router = useRouter();
    const { user } = useUser();
    const [stepIndex, setStepIndex] = useState(0);
    const [profile, setProfile] = useState<ExtendedProfile>(profileDefaults);
    const [isFinishing, setIsFinishing] = useState(false);
    const [isConnectingDrive, setIsConnectingDrive] = useState(false);
    const [profileHintVisible, setProfileHintVisible] = useState(false);
    const stepRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const currentStep = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;
    const taskRequirements: Partial<Record<StepId, string>> = {
        source: "Upload a source to continue, or skip this step for now.",
        invite: "Add at least one email to continue, or skip this step for now.",
        integrations: "Connect Google Drive to continue, or skip this step for now.",
        updates: "Choose your update preferences, or skip this step for now.",
    };
    const taskRequirement = taskRequirements[currentStep.id];

    useEffect(() => {
        document.documentElement.dataset.sidebarCollapsed = "true";
    }, []);

    useEffect(() => {
        if (currentStep.id !== "profile") {
            setProfileHintVisible(false);
            return;
        }

        setProfileHintVisible(true);
        const timeout = window.setTimeout(() => setProfileHintVisible(false), 5000);

        return () => window.clearTimeout(timeout);
    }, [currentStep.id]);

    useEffect(() => {
        if (!stepRef.current) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                ".onboarding-step-content",
                { autoAlpha: 0, y: 12 },
                { autoAlpha: 1, y: 0, duration: 0.32, ease: "power3.out" },
            );
        }, stepRef);

        return () => ctx.revert();
    }, [stepIndex]);

    const updateProfile = (patch: Partial<ExtendedProfile>) => {
        setProfile((current) => ({ ...current, ...patch }));
    };

    const canContinue = useMemo(() => {
        if (currentStep.id === "workspace") {
            return profile.workspaceName.trim().length > 1 && profile.workspaceSlug.trim().length > 1;
        }

        if (currentStep.id === "profile") {
            return (
                profile.displayName.trim().length > 1 &&
                profile.role.trim().length > 1 &&
                profile.industry.trim().length > 1
            );
        }

        if (currentStep.id === "training") {
            return profile.trainingGoals.length > 0 || profile.otherTrainingGoal.trim().length > 1;
        }

        if (currentStep.id === "source") {
            return profile.uploadedSourceName.trim().length > 0;
        }

        if (currentStep.id === "invite") {
            return profile.inviteEmails.trim().length > 0;
        }

        if (currentStep.id === "integrations") {
            return profile.googleDriveConnected;
        }

        return true;
    }, [currentStep.id, profile]);

    const toggleGoal = (goal: string) => {
        updateProfile({
            trainingGoals: profile.trainingGoals.includes(goal)
                ? profile.trainingGoals.filter((item) => item !== goal)
                : [...profile.trainingGoals, goal],
        });
    };

    const handleGoogleDriveConnection = async () => {
        setIsConnectingDrive(true);

        const result = await connectGoogleDrive();

        setIsConnectingDrive(false);

        if (!result.success) {
            toast.error(result.error || "Could not connect Google Drive yet.");
            return;
        }

        updateProfile({ googleDriveConnected: true });
        toast.success("Google Drive is connected.");
    };

    const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        try {
            await user.setProfileImage({ file });
            await user.reload();
            updateProfile({ profileImageName: file.name });
            toast.success("Profile photo updated.");
        } catch (error) {
            console.error("Failed to update profile photo", error);
            toast.error("Failed to update profile photo. Please try again.");
        }
    };

    const finish = async () => {
        const { firstName, lastName } = splitDisplayName(profile.displayName);
        const nextProfile = {
            ...profile,
            displayName: profile.displayName.trim(),
            workspaceName: profile.workspaceName.trim(),
            workspaceSlug: slugifyWorkspace(profile.workspaceSlug || profile.workspaceName),
            role: profile.role.trim(),
        };

        setIsFinishing(true);

        if (user && (firstName || lastName)) {
            try {
                await user.update({
                    firstName: firstName || undefined,
                    lastName: lastName || undefined,
                });
                await user.reload();
            } catch (error) {
                console.error("Failed to update Clerk profile name", error);
                toast.error("We could not update your account name in Clerk. Check that first and last name editing is enabled.");
                setIsFinishing(false);
                return;
            }
        }

        const goals = [
            ...nextProfile.trainingGoals,
            ...(nextProfile.otherTrainingGoal.trim() ? [nextProfile.otherTrainingGoal.trim()] : []),
        ];

        const result = await completeOnboarding({
            displayName: nextProfile.displayName,
            workspaceName: nextProfile.workspaceName,
            workspaceSlug: nextProfile.workspaceSlug,
            industry: nextProfile.industry,
            role: nextProfile.role,
            trainingGoals: goals,
            inviteEmails: nextProfile.inviteEmails,
            googleDriveConnected: nextProfile.googleDriveConnected,
            uploadedSourceName: nextProfile.uploadedSourceName,
        });

        if (!result.success) {
            setIsFinishing(false);
            toast.error(result.error || "Failed to create your workspace. Please try again.");
            return;
        }

        window.sessionStorage.setItem(DASHBOARD_REVEAL_KEY, "true");

        const workspaceSlug = result.data?.workspaceSlug || nextProfile.workspaceSlug;

        router.replace(`/${workspaceSlug}`);
    };

    const next = () => {
        if (!canContinue) return;
        if (isLastStep) {
            finish();
            return;
        }

        setStepIndex((current) => current + 1);
    };

    const skip = () => {
        if (isLastStep) {
            finish();
            return;
        }
        setStepIndex((current) => current + 1);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        updateProfile({ uploadedSourceName: file.name });
    };

    return (
        <main className="fixed inset-0 z-[95] overflow-y-auto bg-[var(--bg-primary)] text-[var(--text-primary)]">
            {isFinishing && <FullPageLoader label="Preparing workspace" />}

            <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-5 sm:px-8">
                <div ref={stepRef} className="flex flex-1 items-center justify-center py-8">
                    <div className="onboarding-step-content w-full max-w-[560px]">
                        {currentStep.id === "welcome" && (
                            <div className="text-center">
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-4xl">
                                    Set up your training workspace.
                                </h1>
                                <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[var(--text-muted)]">
                                    Revise turns company documents into voice practice, readiness checks, and manager reports.
                                </p>
                            </div>
                        )}

                        {currentStep.id === "workspace" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Create a workspace</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    This is where your sources, training modules, trainees, and reports will live.
                                </p>

                                <div className="mt-8 space-y-5">
                                    <label className="block">
                                        <FieldLabel>Workspace name</FieldLabel>
                                        <TextInput
                                            value={profile.workspaceName}
                                            onChange={(value) =>
                                                updateProfile({
                                                    workspaceName: value,
                                                    workspaceSlug: slugifyWorkspace(value),
                                                })
                                            }
                                            placeholder="Acme Operations"
                                        />
                                    </label>
                                    <label className="block">
                                        <FieldLabel>Workspace URL</FieldLabel>
                                        <div className="mt-2 flex h-11 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] transition focus-within:border-[#d97757]/70 focus-within:ring-3 focus-within:ring-[#d97757]/10">
                                            <span className="flex items-center border-r border-[var(--border-subtle)] px-3.5 text-sm font-medium text-[var(--text-muted)]">
                                                revise.app/
                                            </span>
                                            <input
                                                value={profile.workspaceSlug}
                                                onChange={(event) => updateProfile({ workspaceSlug: slugifyWorkspace(event.target.value) })}
                                                className="min-w-0 flex-1 bg-transparent px-3.5 text-[15px] font-medium text-[var(--text-primary)] outline-none"
                                            />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {currentStep.id === "profile" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Set up your profile</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Tell Revise who is setting up training for this workspace.
                                </p>

                                <div className="mt-7 grid gap-5">
                                    <div className="flex items-center gap-4">
                                        <input
                                            ref={profileImageInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleProfileImageChange}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            className="group relative flex size-14 shrink-0 items-center justify-center overflow-visible rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                                            onClick={() => profileImageInputRef.current?.click()}
                                            onMouseEnter={() => setProfileHintVisible(true)}
                                            onMouseLeave={() => setProfileHintVisible(false)}
                                        >
                                            {user?.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={user.imageUrl} alt="" className="size-full rounded-full object-cover" />
                                            ) : (
                                                <Camera className="size-5" />
                                            )}
                                            <span
                                                className={cn(
                                                    "pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-10 w-max max-w-42 -translate-x-1/2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft-md)] transition",
                                                    profileHintVisible ? "opacity-100" : "opacity-0",
                                                )}
                                            >
                                                Add profile photo
                                            </span>
                                        </button>
                                        <label className="min-w-0 flex-1">
                                            <FieldLabel>Name</FieldLabel>
                                            <TextInput
                                                value={profile.displayName}
                                                onChange={(value) => updateProfile({ displayName: value })}
                                                placeholder="Your name"
                                            />
                                        </label>
                                    </div>

                                    <label className="block">
                                        <FieldLabel>Role</FieldLabel>
                                        <TextInput
                                            value={profile.role}
                                            onChange={(value) => updateProfile({ role: value })}
                                            placeholder="Operations manager"
                                        />
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {suggestedRoles.map((role) => (
                                                <Chip key={role} active={profile.role === role} onClick={() => updateProfile({ role })}>
                                                    {role}
                                                </Chip>
                                            ))}
                                        </div>
                                    </label>

                                    <div>
                                        <FieldLabel>Industry</FieldLabel>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {industries.map((industry) => (
                                                <Chip key={industry} active={profile.industry === industry} onClick={() => updateProfile({ industry })}>
                                                    {industry}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep.id === "training" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                                    What are you training people for?
                                </h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Revise will use this to suggest scenarios and dashboard defaults.
                                </p>

                                <div className="mt-7 flex flex-wrap gap-2">
                                    {[...trainingGoals, "Not sure yet"].map((goal) => (
                                        <Chip key={goal} active={profile.trainingGoals.includes(goal)} onClick={() => toggleGoal(goal)}>
                                            {goal}
                                        </Chip>
                                    ))}
                                </div>

                                <label className="mt-5 block">
                                    <FieldLabel>Something else</FieldLabel>
                                    <TextInput
                                        value={profile.otherTrainingGoal}
                                        onChange={(value) => updateProfile({ otherTrainingGoal: value })}
                                        placeholder="ex: Quality assurance reviews"
                                    />
                                </label>
                            </div>
                        )}

                        {currentStep.id === "source" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Upload your first source</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Start with one SOP, handbook, or workflow. Revise will later turn it into practice scenarios.
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-7 flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-medium)] bg-[var(--surface-elevated)] p-6 text-center transition hover:border-[#d97757]/70 hover:bg-[#d97757]/8"
                                >
                                    <Upload className="size-7 text-[#d97757]" />
                                    <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
                                        {profile.uploadedSourceName || "Choose a PDF, SOP, handbook, or workflow"}
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">PDF, DOCX, or TXT</p>
                                </button>

                                {profile.uploadedSourceName && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                            updateProfile({ uploadedSourceName: "" });
                                        }}
                                        className="mt-3 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    >
                                        <X className="size-4" />
                                        Remove file
                                    </button>
                                )}
                            </div>
                        )}

                        {currentStep.id === "invite" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Invite trainees</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Invite interns or junior staff now, or come back to this after your first training module is ready.
                                </p>

                                <label className="mt-7 block">
                                    <FieldLabel>Email invitations</FieldLabel>
                                    <textarea
                                        value={profile.inviteEmails}
                                        onChange={(event) => updateProfile({ inviteEmails: event.target.value })}
                                        placeholder="email@gmail.com, teammate@company.com"
                                        className="mt-2 min-h-28 w-full resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3.5 py-3 text-[15px] font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[#d97757]/70 focus:ring-3 focus:ring-[#d97757]/10"
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                                >
                                    <Link2 className="size-4" />
                                    Copy invite link
                                </button>
                            </div>
                        )}

                        {currentStep.id === "integrations" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Connect your tools</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Start with Google Drive so managers can import training sources from where work already lives.
                                </p>

                                <div className="mt-7 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                                    {integrations.map((integration) => {
                                        const Icon = integrationIcons[integration.name as keyof typeof integrationIcons] || FileText;
                                        const available = integration.name === "Google Drive";
                                        return (
                                            <button
                                                key={integration.name}
                                                type="button"
                                                onClick={() => available && !profile.googleDriveConnected && handleGoogleDriveConnection()}
                                                disabled={!available || isConnectingDrive || profile.googleDriveConnected}
                                                className={cn(
                                                    "flex w-full items-center gap-4 p-4 text-left transition first:rounded-t-2xl last:rounded-b-2xl",
                                                    available && !profile.googleDriveConnected ? "hover:bg-[var(--surface-hover)]" : "cursor-not-allowed opacity-55",
                                                )}
                                            >
                                                <span className="flex size-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
                                                    <Icon className="size-5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{integration.name}</span>
                                                        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                                                            {profile.googleDriveConnected && available
                                                                ? "Connected"
                                                                : isConnectingDrive && available
                                                                  ? "Connecting"
                                                                  : integration.status}
                                                        </span>
                                                    </span>
                                                    <span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">{integration.description}</span>
                                                </span>
                                                {available && profile.googleDriveConnected && <Check className="size-5 text-[var(--text-primary)]" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {currentStep.id === "updates" && (
                            <div>
                                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Subscribe to updates</h1>
                                <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                                    Keep the workspace owner informed as Revise improves.
                                </p>

                                <div className="mt-7 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4">
                                    <ToggleRow
                                        title="Product updates"
                                        description="New training, reporting, and source import features."
                                        checked={profile.updates}
                                        onClick={() => updateProfile({ updates: !profile.updates })}
                                    />
                                    <ToggleRow
                                        title="Onboarding tips"
                                        description="Short emails to help your team reach the first training session faster."
                                        checked={profile.onboardingTips}
                                        onClick={() => updateProfile({ onboardingTips: !profile.onboardingTips })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="mx-auto grid w-full max-w-[560px] grid-cols-[1fr_auto_1fr] items-center gap-4 pb-2 pt-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                            disabled={stepIndex === 0}
                            className="h-10 rounded-full px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-0"
                        >
                            Back
                        </button>
                        {currentStep.skippable && (
                            <button
                                type="button"
                                onClick={skip}
                                className="h-10 rounded-full px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                Skip
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {steps.map((step, index) => (
                            <span
                                key={step.id}
                                aria-hidden="true"
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    index === stepIndex ? "w-7 bg-[var(--text-primary)]" : "w-1.5 bg-[var(--border-medium)]",
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={next}
                            disabled={!canContinue}
                            title={!canContinue && taskRequirement ? taskRequirement : undefined}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--text-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)] transition hover:bg-[var(--accent-warm-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isLastStep ? "Finish" : "Continue"}
                            <ArrowRight className="size-4" />
                        </button>
                    </div>
                </footer>
                {taskRequirement && !canContinue && (
                    <p className="mx-auto max-w-[560px] pb-3 text-center text-xs font-medium text-[var(--text-muted)]">
                        {taskRequirement}
                    </p>
                )}
            </section>
        </main>
    );
};

export default OnboardingExperience;
