"use client"

import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, UtensilsCrossed } from "lucide-react"

export default function KitchenPage() {
    const { data: session, isPending } = useSession()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut()
        router.push("/login")
        router.refresh()
    }

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const user = session?.user as { role?: string } | undefined
    if (!session || (user?.role !== "KITCHEN" && user?.role !== "ADMIN")) {
        router.push("/login")
        return null
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(46,254,60,0.3)]">
                        <UtensilsCrossed className="w-5 h-5 text-black" />
                    </div>
                    <span className="font-bold text-lg">Kitchen Display</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-zinc-400">
                        {session.user.name} ({session.user.email})
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </nav>

            <main className="p-8">
                <div className="text-center py-20">
                    <h1 className="text-2xl font-bold text-white mb-2">Kitchen Dashboard</h1>
                    <p className="text-zinc-500">
                        Order queue will appear here.
                    </p>
                </div>
            </main>
        </div>
    )
}
