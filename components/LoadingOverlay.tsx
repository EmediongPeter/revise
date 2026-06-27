'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({
    title = "Synthesizing Your Book",
    description = "Please wait while we process your PDF and prepare your voice training module.",
}: {
    title?: string;
    description?: string;
}) => {
    return (
        <div className="loading-wrapper">
            <div className="loading-shadow-wrapper bg-[var(--surface-elevated)] shadow-soft-lg">
                <div className="loading-shadow">
                    <Loader2 className="loading-animation w-12 h-12 text-[var(--text-primary)]" />
                    <h2 className="loading-title">{title}</h2>
                    <p className="text-[#777] text-center max-w-xs">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
