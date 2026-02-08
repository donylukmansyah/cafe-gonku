import { Rubik } from "next/font/google";
import "@/app/globals.css";
import { Toaster } from "sonner";

const rubik = Rubik({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-rubik",
});

export default function CustomerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${rubik.variable} font-sans min-h-screen bg-black text-white selection:bg-primary selection:text-black`}>
            <div className="max-w-md mx-auto min-h-screen bg-zinc-950 shadow-2xl relative">
                {children}
            </div>
            <Toaster position="top-center" richColors />
        </div>
    );
}
