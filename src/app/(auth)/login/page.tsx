import { Suspense } from "react"
import { Coffee, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { requireGuest } from "@/lib/server-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface LoginPageProps {
    searchParams: Promise<{
        callbackUrl?: string
    }>
}

async function LoginContent({ searchParamsPromise }: { searchParamsPromise: Promise<{ callbackUrl?: string }> }) {
    const resolvedSearchParams = await searchParamsPromise
    const callbackUrl = resolvedSearchParams?.callbackUrl || "/admin"

    // Server-side check inside Suspense for Next 16 Cache Components compatibility.
    await requireGuest(callbackUrl)

    return <LoginForm callbackUrl={callbackUrl} />
}

function LoginFormSkeleton() {
    return (
        <div className="w-full max-w-md space-y-10 relative z-10 animate-pulse">
            <div className="relative">
                {/* Subtle background glow for the card */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/5 via-blue-500/5 to-primary/5 rounded-[2.5rem] blur-2xl opacity-20" />

                <Card className="bg-zinc-900/40 backdrop-blur-3xl border-white/10 shadow-3xl rounded-[2.5rem] relative overflow-hidden border-t-white/10">
                    <CardHeader className="space-y-3 text-center pb-8 pt-10">
                        {/* Title Skeleton */}
                        <Skeleton className="h-8 w-48 bg-zinc-800 mx-auto rounded-lg" />
                        {/* Subtitle Skeleton */}
                        <Skeleton className="h-4 w-64 bg-zinc-800/50 mx-auto rounded-lg" />
                    </CardHeader>

                    <CardContent className="px-8 pb-10 space-y-6">
                        {/* Email Field Skeleton */}
                        <div className="space-y-2.5">
                            <Skeleton className="h-3.5 w-24 bg-zinc-800/50 rounded" />
                            <Skeleton className="h-14 w-full bg-zinc-800/30 rounded-2xl border border-white/5" />
                        </div>

                        {/* Password Field Skeleton */}
                        <div className="space-y-2.5">
                            <Skeleton className="h-3.5 w-24 bg-zinc-800/50 rounded" />
                            <Skeleton className="h-14 w-full bg-zinc-800/30 rounded-2xl border border-white/5" />
                        </div>

                        {/* Button Skeleton */}
                        <Skeleton className="h-14 w-full bg-primary/20 rounded-2xl mt-4" />
                    </CardContent>
                </Card>
            </div>

            {/* Version Footer Skeleton */}
            <div className="text-center">
                <Skeleton className="h-3 w-40 bg-zinc-800/50 mx-auto rounded" />
            </div>
        </div>
    )
}

export default function LoginPage({ searchParams }: LoginPageProps) {
    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-[#050505] selection:bg-primary/30">
            {/* Left Side - Visual (Desktop Only) */}
            <div className="hidden lg:flex flex-col items-center justify-center relative bg-zinc-950 overflow-hidden border-r border-white/[0.02]">
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-40" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-20 animate-pulse duration-[4000ms]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

                <div className="relative z-10 text-center space-y-8 max-w-lg px-8">
                    <div className="mx-auto w-28 h-28 bg-zinc-900/50 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/5 shadow-2xl relative group transition-all duration-500 hover:scale-105">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Coffee className="w-14 h-14 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(53,183,24,0.5)]" />
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                            Cafe Gonku
                        </h1>
                        <p className="text-xl text-zinc-400 leading-relaxed font-medium">
                            Platform manajemen cafe modern yang efisien. Kelola pesanan, meja, dan menu dalam satu dashboard.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-8">
                        <div className="flex flex-col items-center gap-2">
                            <div className="px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fast Order</div>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <div className="flex flex-col items-center gap-2">
                            <div className="px-4 py-2 bg-white/5 rounded-full border border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Realtime Analytics</div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-zinc-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Secure Admin Portal &copy; 2026</span>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="min-h-screen flex items-center justify-center p-6 bg-[#050505] relative overflow-hidden">
                {/* Ambient Glows - Toned Down */}
                <div className="absolute top-[5%] right-[5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none animate-pulse duration-[5000ms]" />
                <div className="absolute bottom-[5%] left-[5%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none animate-pulse delay-1000 duration-[6000ms]" />

                <Suspense fallback={<LoginFormSkeleton />}>
                    <LoginContent searchParamsPromise={searchParams} />
                </Suspense>
            </div>
        </div>
    )
}
