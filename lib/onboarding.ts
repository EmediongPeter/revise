export const ONBOARDING_COMPLETED_KEY = "revise.onboarding.completed";
export const ONBOARDING_PROFILE_KEY = "revise.onboarding.profile";
export const DASHBOARD_REVEAL_KEY = "revise.dashboard.reveal";
export const WORKSPACE_KEY = "revise.workspace";

export type OnboardingProfile = {
    workspaceName: string;
    workspaceSlug: string;
    industry: string;
    role: string;
    trainingGoals: string[];
    inviteEmails: string;
    googleDriveConnected: boolean;
};

export const defaultOnboardingProfile: OnboardingProfile = {
    workspaceName: "Agency onboarding",
    workspaceSlug: "agency-onboarding",
    industry: "Agency",
    role: "Operations manager",
    trainingGoals: ["Client communication"],
    inviteEmails: "",
    googleDriveConnected: false,
};

export const industries = ["Agency", "Restaurant", "Clinic", "Warehouse", "Call center", "Other"];

export const roles = ["Founder/Owner", "HR/People Ops", "Operations manager", "Team lead", "Trainer"];

export const trainingGoals = [
    "Client communication",
    "Internal SOPs",
    "Sales scripts",
    "Compliance/policies",
    "Safety procedures",
    "Customer support",
];

export const integrations = [
    {
        name: "Google Drive",
        status: "Available",
        description: "Import SOPs, handbooks, and training docs from the place your team already uses.",
    },
    {
        name: "Notion",
        status: "Coming soon",
        description: "Sync internal knowledge pages into training sources.",
    },
    {
        name: "Slack",
        status: "Coming soon",
        description: "Send practice reminders and manager alerts where the team already works.",
    },
    {
        name: "SharePoint",
        status: "Coming soon",
        description: "Bring policy libraries and operational documents into Revise.",
    },
];

export const slugifyWorkspace = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || defaultOnboardingProfile.workspaceSlug;
