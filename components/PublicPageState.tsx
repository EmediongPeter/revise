'use client';

import { useEffect } from "react";

const PublicPageState = () => {
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

export default PublicPageState;
