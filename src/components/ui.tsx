import React from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function Container({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-6xl px-4">{children}</div>;
}

export function Card({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] shadow-sm sm:rounded-2xl",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function CardHeader({
    title,
    subtitle,
    right,
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800 p-4 sm:flex-nowrap sm:items-center sm:gap-4 sm:p-5">
            <div className="min-w-0 flex-1">
                <div className="break-words text-base font-semibold sm:text-lg">{title}</div>
                {subtitle ? (
                    <div className="mt-1 break-words text-xs text-zinc-400 sm:text-sm">{subtitle}</div>
                ) : null}
            </div>
            {right ? <div className="relative shrink-0">{right}</div> : null}
        </div>
    );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn("min-w-0 p-4 sm:p-5", className)}>{children}</div>;
}

export function Button({
    children,
    variant = "primary",
    type = "button",
    className,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "fuchsia";
}) {
    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-white text-zinc-900 hover:bg-zinc-200",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "bg-transparent text-zinc-200 hover:bg-zinc-800",
        fuchsia: "bg-fuchsia-500 text-white hover:bg-fuchsia-400",
    } as const;

    return (
        <button
            type={type}
            className={cn(base, variants[variant], className)}
            {...rest}
        >
            {children}
        </button>
    );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cn(
                "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20",
                props.className,
            )}
        />
    );
}

export function Textarea(
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
    return (
        <textarea
            {...props}
            className={cn(
                "w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20",
                props.className,
            )}
        />
    );
}

export function Badge({
    children,
    tone = "neutral",
}: {
    children: React.ReactNode;
    tone?: "neutral" | "safe" | "adult";
}) {
    const map = {
        neutral: "border-zinc-700 bg-zinc-900 text-zinc-200",
        safe: "border-emerald-900/60 bg-emerald-950/50 text-emerald-200",
        adult: "border-rose-900/60 bg-rose-950/50 text-rose-200",
    } as const;

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs",
                map[tone],
            )}
        >
            {children}
        </span>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-xl bg-zinc-800/60",
                className,
            )}
        />
    );
}

export function CompanionCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-blue-900/40 bg-gradient-to-b from-blue-950/60 to-blue-950/30">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
                <div className="flex gap-2 pt-1">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                </div>
            </div>
        </div>
    );
}

export function SidebarCompanionSkeleton() {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-zinc-800 p-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}
