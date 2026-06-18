'use client';

import { useEffect } from "react";

const AuthPageState = () => {
    useEffect(() => {
        document.documentElement.dataset.authPage = "true";
        document.documentElement.dataset.sidebarCollapsed = "true";

        return () => {
            delete document.documentElement.dataset.authPage;
            delete document.documentElement.dataset.sidebarCollapsed;
        };
    }, []);

    return null;
};

export default AuthPageState;
