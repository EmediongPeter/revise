import AuthPageState from "@/components/auth/AuthPageState";

const AuthLayout = ({ children }: { children: React.ReactNode }) => (
    <>
        <AuthPageState />
        {children}
    </>
);

export default AuthLayout;
