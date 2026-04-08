"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PdfExportButton() {
    return (
        <Button 
            onClick={() => window.print()}
            className="h-10 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold text-xs gap-2 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hide-on-print"
        >
            <Printer className="w-4 h-4" />
            Export PDF / Print
        </Button>
    );
}
