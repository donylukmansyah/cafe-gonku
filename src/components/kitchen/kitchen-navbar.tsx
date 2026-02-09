"use client";

import { Button } from "@/components/ui/button";
import {
    LogOut,
    UtensilsCrossed,
    RefreshCw,
    Volume2,
    VolumeX,
    Wifi,
    PlayCircle,
} from "lucide-react";

interface KitchenNavbarProps {
    userName: string;
    soundEnabled: boolean;
    onSoundToggle: () => void;
    onRefresh: () => void;
    onLogout: () => void;
    onTestSound?: () => void;
}

export function KitchenNavbar({
    userName,
    soundEnabled,
    onSoundToggle,
    onRefresh,
    onLogout,
    onTestSound,
}: KitchenNavbarProps) {
    return (
        <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center justify-between max-w-[1800px] mx-auto">
                {/* Logo & Title */}
                <div className="flex items-center gap-3 group">
                    <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(46,254,60,0.3)] group-hover:scale-105 transition-transform duration-300">
                        <UtensilsCrossed className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h1 className="font-black text-xl text-white tracking-tight uppercase">Dashboard Dapur</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Live Order Queue
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Connection Status */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <Wifi className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-bold text-primary">Live</span>
                    </div>

                    {/* Sound Toggle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onSoundToggle}
                        className="w-10 h-10 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white cursor-pointer"
                    >
                        {soundEnabled ? (
                            <Volume2 className="w-4 h-4" />
                        ) : (
                            <VolumeX className="w-4 h-4" />
                        )}
                    </Button>

                    {/* Test Sound Button (Helper to unlock audio) */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onTestSound}
                        title="Test Notifikasi Suara"
                        className="w-10 h-10 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white cursor-pointer"
                    >
                        <PlayCircle className="w-4 h-4" />
                    </Button>

                    {/* Refresh */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onRefresh}
                        className="w-10 h-10 bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>

                    {/* User Badge */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-medium text-zinc-300">{userName}</span>
                    </div>

                    {/* Logout */}
                    <Button
                        variant="outline"
                        onClick={onLogout}
                        className="h-10 px-4 bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </nav>
    );
}
