"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/validations/auth"
import { useLogin } from "@/hooks/use-login"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react"

export function LoginForm({ callbackUrl = "/admin" }: { callbackUrl?: string }) {
    const {
        error,
        isLoading,
        showPassword,
        togglePasswordVisibility,
        handleLogin
    } = useLogin(callbackUrl)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginInput) => {
        await handleLogin(data)
    }

    return (
        <div className="w-full max-w-md space-y-10 relative z-10">
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
                                    autoComplete="email"
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
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        {...register("password")}
                                        disabled={isLoading}
                                        className="h-14 bg-white/[0.03] border-white/5 text-white placeholder:text-zinc-700 focus-visible:ring-primary/20 focus-visible:border-primary/40 rounded-2xl transition-all duration-300 pr-12 text-base"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onClick={togglePasswordVisibility}
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
                                className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black text-base shadow-[0_20px_40px_-15px_rgba(53,183,24,0.15)] hover:shadow-[0_25px_50px_-12px_rgba(53,183,24,0.25)] transition-all duration-300 rounded-2xl mt-4 group overflow-hidden relative cursor-pointer"
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
    )
}
