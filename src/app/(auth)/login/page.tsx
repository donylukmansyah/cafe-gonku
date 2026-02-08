"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn, authClient } from "@/lib/auth-client"
import { loginSchema, type LoginInput } from "@/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Coffee } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get("callbackUrl") || "/admin"
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const { data: sessionData, isPending } = authClient.useSession()

    // Redirect if already logged in
    // This prevents authenticated users from seeing the login page
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

            // 2. Fetch session to get User Role
            const { data: session } = await authClient.getSession()

            if (!session) {
                router.push(callbackUrl)
                router.refresh()
                return
            }

            const userRole = (session.user as any).role

            // 3. Redirect based on Role
            if (callbackUrl && callbackUrl !== "/admin" && callbackUrl !== "/kitchen" && callbackUrl !== "/login") {
                router.push(callbackUrl)
            } else {
                if (userRole === "ADMIN") {
                    router.push("/admin")
                } else if (userRole === "KITCHEN") {
                    router.push("/kitchen")
                } else {
                    console.warn("Unknown user role:", userRole)
                    router.push("/") // Default fallback
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
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-black">
            {/* Left Side - Visual (Desktop Only) */}
            <div className="hidden lg:flex flex-col items-center justify-center relative bg-zinc-900 overflow-hidden border-r border-zinc-800">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-zinc-900 to-zinc-950" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse" />

                <div className="relative z-10 text-center space-y-6 max-w-lg px-8">
                    <div className="mx-auto w-24 h-24 bg-zinc-950 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-[0_0_30px_rgba(46,254,60,0.15)] mb-8">
                        <Coffee className="w-12 h-12 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
                        Cafe Gonku
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Platform manajemen cafe modern yang efisien. Kelola pesanan, meja, dan menu dalam satu dashboard terintegrasi.
                    </p>
                </div>

                <div className="absolute bottom-8 left-0 right-0 text-center text-zinc-600 text-sm">
                    &copy; 2026 Cafe Gonku System
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="min-h-screen flex items-center justify-center p-8 bg-black relative overflow-hidden">
                {/* Mobile/Form Background Ambient Glow */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="w-full max-w-md space-y-8 relative z-10">
                    {/* Mobile Logo (Visible only on mobile) */}
                    <div className="lg:hidden flex flex-col items-center justify-center mb-8 text-center">
                        <div className="w-20 h-20 bg-zinc-900/80 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_40px_-10px_rgba(46,254,60,0.3)] ring-1 ring-white/5">
                            <Coffee className="w-10 h-10 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Cafe Gonku</h1>
                        <p className="text-zinc-500 text-sm">Sign in to manage your space</p>
                    </div>

                    <Card className="bg-zinc-900/30 backdrop-blur-xl border-white/5 shadow-2xl shadow-black/50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        <CardHeader className="space-y-1 text-center lg:text-left relative z-10">
                            <CardTitle className="text-2xl font-bold tracking-tight text-white">Welcome Back</CardTitle>
                            <CardDescription className="text-zinc-500">
                                Enter your credentials to access the workspace
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm font-medium text-red-400 bg-red-950/20 border border-red-900/50 rounded-xl flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-zinc-400 font-medium">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@cafegonku.com"
                                        {...register("email")}
                                        disabled={isLoading}
                                        className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary/20 focus-visible:border-primary/50 rounded-xl transition-all"
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-400 flex items-center justify-center lg:justify-start gap-1">
                                            <span className="w-1 h-1 rounded-full bg-red-400" />
                                            {errors.email?.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-zinc-400 font-medium">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        {...register("password")}
                                        disabled={isLoading}
                                        className="h-11 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary/20 focus-visible:border-primary/50 rounded-xl transition-all"
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-red-400 flex items-center justify-center lg:justify-start gap-1">
                                            <span className="w-1 h-1 rounded-full bg-red-400" />
                                            {errors.password?.message}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(46,254,60,0.2)] hover:shadow-[0_0_30px_rgba(46,254,60,0.4)] transition-all rounded-xl mt-2"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
