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
                "rounded-2xl border-[3px] border-zinc-400 bg-blue-400/25 shadow-sm",
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
        <div className="flex items-start justify-between gap-4 border-b border-zinc-400 p-5">
            <div>
                <div className="text-lg font-semibold">{title}</div>
                {subtitle ? (
                    <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
                ) : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
    );
}

export function CardBody({ children }: { children: React.ReactNode }) {
    return <div className="p-5">{children}</div>;
}

export function Button({
    children,
    variant = "primary",
    type = "button",
    className,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
}) {
    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-white text-zinc-900 hover:bg-zinc-200",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "bg-transparent text-zinc-200 hover:bg-zinc-800",
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
