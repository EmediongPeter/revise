'use client';

import {CheckCircle2, Clock3, Mic, MicOff, ShieldCheck} from "lucide-react";
import useVapi from "@/hooks/useVapi";
import {IBook} from "@/types";
import Image from "next/image";
import Transcript from "@/components/Transcript";
import {toast} from "sonner";

import {useRouter} from "next/navigation";
import {useEffect} from "react";

const VapiControls = ({ book }: { book: IBook }) => {
    const { status, isActive, messages, currentMessage, currentUserMessage, duration, start, stop, clearError, limitError, isBillingError, maxDurationSeconds } = useVapi(book)
    const router = useRouter();

    useEffect(() => {
        if (limitError) {
            toast.error(limitError);
            if (isBillingError) {
                router.push("/subscriptions");
            } else {
                router.push("/");
            }
            clearError();
        }
    }, [isBillingError, limitError, router, clearError]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusDisplay = () => {
        switch (status) {
            case 'connecting': return { label: 'Connecting...', color: 'vapi-status-dot-connecting' };
            case 'starting': return { label: 'Starting...', color: 'vapi-status-dot-starting' };
            case 'listening': return { label: 'Listening', color: 'vapi-status-dot-listening' };
            case 'thinking': return { label: 'Thinking...', color: 'vapi-status-dot-thinking' };
            case 'speaking': return { label: 'Speaking', color: 'vapi-status-dot-speaking' };
            default: return { label: 'Ready', color: 'vapi-status-dot-ready' };
        }
    };

    const statusDisplay = getStatusDisplay();

    return (
        <>
            <div className="max-w-5xl mx-auto flex flex-col gap-6">
                <div className="vapi-header-card">
                    <div className="vapi-cover-wrapper">
                        <Image
                            src={book.coverURL || "/images/book-placeholder.png"}
                            alt={book.title}
                            width={120}
                            height={180}
                            className="vapi-cover-image !w-[120px] !h-auto"
                            priority
                        />
                        <div className="vapi-mic-wrapper relative">
                            {isActive && (status === 'speaking' || status === 'thinking') && (
                                <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                            )}
                            <button
                                onClick={isActive ? stop : start}
                                disabled={status === 'connecting'}
                                className={`vapi-mic-btn shadow-md !w-[60px] !h-[60px] z-10 ${isActive ? 'vapi-mic-btn-active' : 'vapi-mic-btn-inactive'}`}
                            >
                                {isActive ? (
                                    <Mic className="size-7 text-white" />
                                ) : (
                                    <MicOff className="size-7 text-[var(--text-primary)]" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 flex-1">
                        <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-warm)]">Voice practice</p>
                            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] mb-1">
                                {book.title}
                            </h1>
                            <p className="text-[var(--text-muted)] font-medium">Source owner: {book.author}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="vapi-status-indicator">
                                <span className={`vapi-status-dot ${statusDisplay.color}`} />
                                <span className="vapi-status-text">{statusDisplay.label}</span>
                            </div>

                            <div className="vapi-status-indicator">
                                <ShieldCheck className="size-4 text-[var(--accent-warm)]" />
                                <span className="vapi-status-text">Grounded in uploaded docs</span>
                            </div>

                            <div className="vapi-status-indicator">
                                <Clock3 className="size-4 text-[var(--accent-warm)]" />
                                <span className="vapi-status-text">
                                    {formatDuration(duration)}/{formatDuration(maxDurationSeconds)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="vapi-transcript-wrapper">
                        <div className="transcript-container min-h-[420px]">
                            <Transcript
                                messages={messages}
                                currentMessage={currentMessage}
                                currentUserMessage={currentUserMessage}
                            />
                        </div>
                    </div>
                    <aside className="space-y-3">
                        {[
                            "Answer in your own words.",
                            "Ask for a scenario when you want practice.",
                            "Revise will correct you using the uploaded source.",
                        ].map((item) => (
                            <div key={item} className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                <p className="text-sm leading-5 text-[var(--text-secondary)]">{item}</p>
                            </div>
                        ))}
                    </aside>
                </div>
            </div>
        </>
    )
}
export default VapiControls
