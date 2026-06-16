import UploadForm from "@/components/UploadForm";

const Page = () => {
    return (
        <main className="new-book">
            <section className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-warm)]">Create module</p>
                <h1 className="page-title-xl">Turn onboarding material into voice practice.</h1>
                <p className="subtitle">Upload a PDF handbook, SOP, or workflow guide. Revise will prepare it for scenario-based training sessions.</p>
            </section>

            <UploadForm />
        </main>
    )
}

export default Page
