"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/features/auth/auth-client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SidebarLogoutButton() {
    const router = useRouter()

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
        router.refresh()
    }

    return (
        <Button
            variant="outline"
            className="w-full border-zinc-700 bg-transparent text-zinc-300 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 transition-colors cursor-pointer"
            onClick={handleLogout}
        >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
        </Button>
    )
}
