"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock3, MessageSquareText, Send, Square } from "lucide-react";
import {
    completePracticeSession,
    expirePracticeSession,
    sendPracticeMessage,
    startPracticeSession,
    type PracticeRoomData,
} from "@/lib/actions/practice.actions";

const formatTime = (date?: string) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
};

const formatRemainingTime = (seconds: number) => {
    const minutes = Math.floor(Math.max(0, seconds) / 60);
    const remainder = Math.max(0, seconds) % 60;

    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

const PracticeRoomClient = ({
    initialRoom,
}: {
    initialRoom: PracticeRoomData;
}) => {
    const [room, setRoom] = useState(initialRoom);
    const [message, setMessage] = useState("");
    const [remainingSeconds, setRemainingSeconds] = useState(() =>
        initialRoom.session
            ? Math.max(0, Math.floor((new Date(initialRoom.session.expiresAt).getTime() - Date.now()) / 1000))
            : initialRoom.assignment.sessionDurationMinutes * 60,
    );
    const [isPending, startTransition] = useTransition();
    const expirationHandled = useRef(false);
    const activeScenario = room.scenarios[Math.min(room.session?.currentScenarioIndex || 0, room.scenarios.length - 1)];
    const sessionMessages = room.session?.messages || [];
    const hasStarted = Boolean(room.session);
    const isComplete = room.session?.status === "completed" || room.session?.status === "needs_review";
    const progress = room.assignment.progressPercent || Math.round((room.assignment.completedScenarioCount / Math.max(room.assignment.totalScenarioCount, 1)) * 100);
    const statusLabel = useMemo(() => {
        if (room.session?.completionReason === "time_expired") return "Time ended";
        if (room.session?.completionReason === "trainee_ended") return "Submitted";
        if (isComplete) return "Complete";
        if (hasStarted) return "Practicing";
        return "Ready to start";
    }, [hasStarted, isComplete, room.session?.completionReason]);

    useEffect(() => {
        if (!room.session || room.session.status !== "active") return;

        const updateRemaining = () => {
            const next = Math.max(
                0,
                Math.floor((new Date(room.session!.expiresAt).getTime() - Date.now()) / 1000),
            );
            setRemainingSeconds(next);

            if (next === 0 && !expirationHandled.current) {
                expirationHandled.current = true;
                startTransition(async () => {
                    const result = await expirePracticeSession(room.assignment._id);
                    if (result.success) {
                        setRoom(result.data);
                        toast.info("The practice time has ended.");
                    }
                });
            }
        };

        updateRemaining();
        const interval = window.setInterval(updateRemaining, 1000);
        return () => window.clearInterval(interval);
    }, [room.assignment._id, room.session]);

    const start = () => {
        startTransition(async () => {
            const result = await startPracticeSession(room.assignment._id);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            setRoom(result.data);
            setRemainingSeconds(result.data.assignment.sessionDurationMinutes * 60);
        });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const content = message.trim();
        if (!content) return;

        setMessage("");
        startTransition(async () => {
            const result = await sendPracticeMessage({ assignmentId: room.assignment._id, message: content });

            if (!result.success) {
                toast.error(result.error);
                setMessage(content);
                return;
            }

            setRoom(result.data);
        });
    };

    const endSession = () => {
        startTransition(async () => {
            const result = await completePracticeSession(room.assignment._id);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            setRoom(result.data);
            toast.info("Practice sent for review.");
        });
    };

    return (
        <main className="flex h-[calc(100vh-4.5rem)] min-h-[720px] flex-col bg-[var(--bg-primary)]">
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Link
                        href={`/${room.workspaceSlug}/modules`}
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">AI trainer room</p>
                        <h1 className="truncate text-lg font-semibold text-[var(--text-primary)]">{room.module.title}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 text-xs font-semibold text-[var(--text-secondary)]">
                        <Clock3 className="size-3.5" />
                        {hasStarted ? formatRemainingTime(remainingSeconds) : `${room.assignment.sessionDurationMinutes} min`}
                    </span>
                    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-[#fff2ec] px-3 text-xs font-semibold text-[#b85f42]">
                        <MessageSquareText className="size-3.5" />
                        {statusLabel}
                    </span>
                </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
                <aside className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 xl:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Module progress</p>
                    <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                        <div className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                            <span>{room.assignment.completedScenarioCount}/{room.assignment.totalScenarioCount} scenarios</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-[var(--border-subtle)]">
                            <div className="h-full rounded-full bg-[#d97757]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                        </div>
                    </div>

                    <div className="mt-5 space-y-2">
                        {room.scenarios.map((scenario, index) => {
                            const active = activeScenario?._id === scenario._id;
                            const done = index < room.assignment.completedScenarioCount || isComplete;

                            return (
                                <div
                                    key={scenario._id}
                                    className={`rounded-xl border px-3 py-3 ${
                                        active
                                            ? "border-[#d97757] bg-[#fff2ec]"
                                            : "border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500 text-white" : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"}`}>
                                            {done ? <CheckCircle2 className="size-3.5" /> : <span className="text-[11px] font-bold">{index + 1}</span>}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold leading-5 text-[var(--text-primary)]">{scenario.title}</span>
                                            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{active ? "Current scenario" : done ? "Completed" : "Queued"}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                <section className="flex min-h-0 flex-col">
                    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Current scenario</p>
                        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{activeScenario?.title || "Practice complete"}</h2>
                        {activeScenario && (
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{activeScenario.situation}</p>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin] [scrollbar-color:var(--border-medium)_transparent]">
                        {!hasStarted ? (
                            <div className="flex h-full items-center justify-center">
                                <div className="max-w-xl text-center">
                                    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#fff2ec] text-[#d97757]">
                                        <MessageSquareText className="size-7" />
                                    </div>
                                    <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">Your AI trainer will lead this session</h2>
                                    <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                                        You will move through the module scenarios in one guided conversation. Answer naturally; the trainer will probe, coach, and advance the session.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={start}
                                        disabled={isPending}
                                        className="mt-6 inline-flex h-11 cursor-pointer items-center rounded-full bg-[#d97757] px-5 text-sm font-semibold text-white transition hover:bg-[#c96849] disabled:opacity-60"
                                    >
                                        {isPending ? "Starting..." : "Start practice"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto flex max-w-3xl flex-col gap-4">
                                {sessionMessages.map((item, index) => (
                                    <div key={`${item.createdAt}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                            item.role === "user"
                                                ? "bg-[#d97757] text-white"
                                                : "border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                                        }`}>
                                            <p className="whitespace-pre-wrap">{item.content}</p>
                                            <p className={`mt-2 text-[10px] ${item.role === "user" ? "text-white/70" : "text-[var(--text-muted)]"}`}>{formatTime(item.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasStarted && !isComplete && (
                        <form onSubmit={submit} className="border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                            <div className="mx-auto flex max-w-3xl items-end gap-3">
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Type your response to the AI trainer..."
                                    className="min-h-14 flex-1 resize-none rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--border-medium)]"
                                />
                                <button
                                    type="submit"
                                    disabled={isPending || !message.trim()}
                                    className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#d97757] text-white transition hover:bg-[#c96849] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Send className="size-5" />
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <aside className="hidden border-l border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 lg:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Session notes</p>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Objective</h3>
                            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{room.module.objective || "Practice the required knowledge for this module."}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Session</h3>
                            <dl className="mt-3 space-y-3 text-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-[var(--text-muted)]">Time remaining</dt>
                                    <dd className="font-semibold tabular-nums text-[var(--text-primary)]">
                                        {hasStarted ? formatRemainingTime(remainingSeconds) : `${room.assignment.sessionDurationMinutes}:00`}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <dt className="text-[var(--text-muted)]">Scenarios</dt>
                                    <dd className="font-semibold text-[var(--text-primary)]">{room.assignment.totalScenarioCount}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {hasStarted && !isComplete && (
                        <button
                            type="button"
                            onClick={endSession}
                            disabled={isPending}
                            className="mt-5 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-60"
                        >
                            <Square className="size-3.5" />
                            End for review
                        </button>
                    )}
                </aside>
            </div>
        </main>
    );
};

export default PracticeRoomClient;
