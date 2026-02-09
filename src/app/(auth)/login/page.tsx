"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn, authClient } from "@/lib/auth-client"
import { loginSchema, type LoginInput } from "@/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Coffee, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react"

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/admin"
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Check session
    const { data: sessionData, isPending } = authClient.useSession()

    // Redirect if already logged in
    if (!isPending && sessionData) {
        const role = (sessionData.user as any).role
        if (role === "ADMIN") router.push("/admin")
        else if (role === "KITCHEN") router.push("/kitchen")
        else router.push("/")
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginInput) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn.email({
                email: data.email,
                password: data.password,
            })

            if (result.error) {
                setError(result.error.message || "Login gagal. Periksa email dan password.")
                return
            }

            const { data: session } = await authClient.getSession()

            if (!session) {
                router.push(callbackUrl)
                router.refresh()
                return
            }

            const userRole = (session.user as any).role

            if (callbackUrl && callbackUrl !== "/admin" && callbackUrl !== "/kitchen" && callbackUrl !== "/login") {
                router.push(callbackUrl)
            } else {
                if (userRole === "ADMIN") {
                    router.push("/admin")
                } else if (userRole === "KITCHEN") {
                    router.push("/kitchen")
                } else {
                    router.push("/")
                }
            }

            router.refresh()
        } catch (err) {
            setError("Terjadi kesalahan. Silakan coba lagi.")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

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

                <div className="w-full max-w-md space-y-10 relative z-10">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex flex-col items-center justify-center mb-4 text-center">
                        <div className="w-24 h-24 bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center mb-8 border border-white/10 shadow-2xl relative">
                            <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
                            <Coffee className="w-12 h-12 text-primary relative z-10" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Cafe Gonku</h1>
                        <p className="text-zinc-500 font-medium">Sign in to manage your space</p>
                    </div>

                    <div className="relative">
                        {/* Subtle background glow for the card */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-[2.5rem] blur-2xl opacity-30" />

                        <Card className="bg-zinc-900/40 backdrop-blur-3xl border-white/10 shadow-3xl rounded-[2.5rem] relative overflow-hidden border-t-white/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

                            <CardHeader className="space-y-2 text-center pb-8 pt-10">
                                <CardTitle className="text-3xl font-black tracking-tight text-white leading-none">Welcome Back</CardTitle>
                                <CardDescription className="text-zinc-500 font-medium">
                                    Trusted management for your cafe operations
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="px-8 pb-10">
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    {error && (
                                        <div className="p-4 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center px-1">
                                            <Label htmlFor="email" className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Email Identity</Label>
                                            {errors.email && <span className="text-[10px] font-black text-red-500 uppercase">Invalid</span>}
                                        </div>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@cafegonku.com"
                                            {...register("email")}
                                            disabled={isLoading}
                                            className="h-14 bg-white/[0.03] border-white/5 text-white placeholder:text-zinc-700 focus-visible:ring-primary/20 focus-visible:border-primary/40 rounded-2xl transition-all duration-300 text-base"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center px-1">
                                            <Label htmlFor="password" className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Secret Access</Label>
                                            {errors.password && <span className="text-[10px] font-black text-red-500 uppercase">Required</span>}
                                        </div>
                                        <div className="relative group">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                {...register("password")}
                                                disabled={isLoading}
                                                className="h-14 bg-white/[0.03] border-white/5 text-white placeholder:text-zinc-700 focus-visible:ring-primary/20 focus-visible:border-primary/40 rounded-2xl transition-all duration-300 pr-12 text-base"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors cursor-pointer"
                                                disabled={isLoading}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-5 h-5" />
                                                ) : (
                                                    <Eye className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black text-base shadow-[0_20px_40px_-15px_rgba(46,254,60,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(46,254,60,0.25)] transition-all duration-300 rounded-2xl mt-4 group overflow-hidden relative cursor-pointer"
                                        disabled={isLoading}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
                                        {isLoading ? (
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="uppercase tracking-[0.2em] text-xs">Verifying</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <span>Authorize Access</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
                            System version 1.0.4-stable
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex items-center justify-center bg-[#050505]">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
