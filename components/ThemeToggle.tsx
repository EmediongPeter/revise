'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <button
            type="button"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={
                compact
                    ? 'inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                    : 'inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 text-[13px] font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
            }
        >
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
            {!compact && (
                <>
                    <span className="hidden dark:inline">Light mode</span>
                    <span className="dark:hidden">Dark mode</span>
                </>
            )}
        </button>
    );
};

export default ThemeToggle;
