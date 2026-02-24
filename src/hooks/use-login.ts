import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient, signIn } from "@/lib/auth-client"
import { LoginInput } from "@/validations/auth"

export function useLogin(callbackUrl: string = "/admin") {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const togglePasswordVisibility = () => setShowPassword(!showPassword)

    const handleLogin = async (data: LoginInput) => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await signIn.email({
                email: data.email,
                password: data.password,
            })

            if (result.error) {
                setError(result.error.message || "Login gagal. Periksa email dan password.")
                return false
            }

            const { data: session } = await authClient.getSession()

            if (!session) {
                router.push(callbackUrl)
                router.refresh()
                return true
            }

            const userRole = (session.user as any).role

            // Handle custom callback URL or default role-based routing
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
            return true
        } catch (err) {
            setError("Terjadi kesalahan sistem. Silakan coba lagi.")
            console.error(err)
            return false
        } finally {
            setIsLoading(false)
        }
    }

    return {
        error,
        isLoading,
        showPassword,
        togglePasswordVisibility,
        handleLogin,
    }
}
