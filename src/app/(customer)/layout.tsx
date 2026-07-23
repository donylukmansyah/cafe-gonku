import { Outfit } from "next/font/google";
import { AppToaster } from "@/components/ui/app-toaster";

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800", "900"],
    variable: "--font-outfit",
});

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${outfit.variable} font-sans min-h-screen bg-[#070709] text-white selection:bg-primary selection:text-black`}>
            {/* Background Glows */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-screen -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-md mx-auto min-h-screen bg-[#070709] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-x border-white/5 relative">
                {children}
            </div>
            <AppToaster position="top-center" />
        </div>
    );
}
