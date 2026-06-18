import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

const SignUpPage = () => (
    <AuthShell mode="sign-up">
        <SignUpForm />
    </AuthShell>
);

export default SignUpPage;
