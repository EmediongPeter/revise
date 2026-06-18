export const getAuthErrorMessage = (error: unknown) => {
    if (
        typeof error === "object" &&
        error !== null &&
        "errors" in error &&
        Array.isArray((error as { errors?: unknown[] }).errors)
    ) {
        const firstError = (error as { errors: { longMessage?: string; message?: string }[] }).errors[0];
        return firstError?.longMessage || firstError?.message || "Something went wrong. Please try again.";
    }

    if (error instanceof Error) return error.message;

    return "Something went wrong. Please try again.";
};
