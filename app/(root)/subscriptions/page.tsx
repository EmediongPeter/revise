import { PricingTable } from "@clerk/nextjs";

export default function SubscriptionsPage() {
  return (
    <div className="container wrapper py-10">
      <div className="flex flex-col items-center text-center mb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-warm)]">Plans</p>
        <h1 className="text-4xl font-semibold mb-4">Choose your Revise plan</h1>
        <p className="text-muted-foreground max-w-2xl">
          Upgrade to add more training modules, longer voice practice sessions, and team-ready onboarding workflows.
        </p>
      </div>

      <div className="clerk-pricing-container">
        <PricingTable />
      </div>
    </div>
  );
}
