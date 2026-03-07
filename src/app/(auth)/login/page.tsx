import { Suspense } from "react"
import { Loader2, Coffee, ShieldCheck } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { requireGuest } from "@/lib/server-auth"

interface LoginPageProps {
    searchParams: Promise<{
        callbackUrl?: string
    }>
}

async function LoginContent({ searchParamsPromise }: { searchParamsPromise: Promise<{ callbackUrl?: string }> }) {
    const resolvedSearchParams = await searchParamsPromise
    const callbackUrl = resolvedSearchParams?.callbackUrl || "/admin"

    // Server-side check: if logged in, redirect to appropriate dashboard automatically
    // This prevents the login screen from ever rendering for authenticated users
    await requireGuest()

    return <LoginForm callbackUrl={callbackUrl} />
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
                        <Coffee className="w-14 h-14 text-primary relative z-10 drop-shadow-[0_0_15px_rgba(46,254,60,0.5)]" />
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

                <Suspense fallback={
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                }>
                    <LoginContent searchParamsPromise={searchParams} />
                </Suspense>
            </div>
        </div>
    )
}
