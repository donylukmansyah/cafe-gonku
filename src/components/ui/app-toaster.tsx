"use client"

import { CheckCircle2, Info, Loader2, TriangleAlert, X, XCircle } from "lucide-react"
import { Toaster, type ToasterProps } from "sonner"

const toastClassNames: NonNullable<ToasterProps["toastOptions"]>["classNames"] = {
    toast:
        "group border border-white/10 bg-zinc-950/95 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl rounded-2xl px-4 py-3",
    success: "border-primary/35 bg-zinc-950/95 shadow-[0_18px_60px_rgba(53,183,24,0.14)]",
    error: "border-red-500/35 bg-zinc-950/95 shadow-[0_18px_60px_rgba(239,68,68,0.14)]",
    warning: "border-amber-500/35 bg-zinc-950/95 shadow-[0_18px_60px_rgba(245,158,11,0.14)]",
    info: "border-sky-500/35 bg-zinc-950/95 shadow-[0_18px_60px_rgba(14,165,233,0.14)]",
    title: "text-sm font-bold text-zinc-100 tracking-tight",
    description: "text-xs font-medium text-zinc-400",
    icon: "text-primary",
    closeButton:
        "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white",
    actionButton:
        "bg-primary text-black font-black rounded-lg px-3 py-1.5 hover:bg-primary/90",
    cancelButton:
        "bg-white/5 text-zinc-300 font-bold rounded-lg px-3 py-1.5 hover:bg-white/10",
}

const iconClassName = "h-4 w-4"

export function AppToaster(props: ToasterProps) {
    return (
        <Toaster
            theme="dark"
            swipeDirections={["top", "right", "bottom", "left"]}
            toastOptions={{
                classNames: toastClassNames,
                duration: 2600,
            }}
            icons={{
                success: <CheckCircle2 className={iconClassName} strokeWidth={2.5} />,
                error: <XCircle className="h-4 w-4 text-red-400" strokeWidth={2.5} />,
                warning: <TriangleAlert className="h-4 w-4 text-amber-400" strokeWidth={2.5} />,
                info: <Info className="h-4 w-4 text-sky-400" strokeWidth={2.5} />,
                loading: <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={2.5} />,
                close: <X className="h-3.5 w-3.5" strokeWidth={2.5} />,
            }}
            {...props}
        />
    )
}
