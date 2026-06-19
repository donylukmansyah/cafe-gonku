"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, ArrowRight } from "lucide-react";
import { PeriodMode } from "@/hooks/use-owner-analytics";

interface DateFilterProps {
  mode: PeriodMode;
  setMode: (mode: PeriodMode) => void;
  days: string;
  setDays: (days: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
}

export function DateFilter({
  mode,
  setMode,
  days,
  setDays,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: DateFilterProps) {
  
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
        {mode === "preset" ? (
            <Select 
                value={days} 
                onValueChange={(val) => {
                    if (val === "custom") {
                        setMode("custom");
                    } else {
                        setDays(val);
                    }
                }}
            >
                <SelectTrigger className="h-10 w-full sm:w-48 bg-zinc-900/50 border-white/10 rounded-xl focus:ring-primary/20 hover:bg-zinc-800/80 transition-all font-bold text-zinc-300 text-xs cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                    <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent position="popper" align="end" className="bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                    <SelectItem value="1" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary py-2.5">Hari Ini</SelectItem>
                    <SelectItem value="7" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary py-2.5">7 Hari Terakhir</SelectItem>
                    <SelectItem value="30" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary py-2.5">30 Hari Terakhir</SelectItem>
                    <SelectItem value="custom" className="rounded-lg text-xs focus:bg-primary/20 focus:text-primary py-2.5 font-bold text-zinc-100">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-3 h-3 text-primary" />
                            Pilih Tanggal..
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        ) : (
            <div className="flex flex-col sm:flex-row items-center bg-zinc-900/50 p-1.5 rounded-[1rem] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.03)] backdrop-blur-sm">
                
                {/* Visual Fake Input 1 */}
                <div className="relative group flex items-center bg-zinc-950 rounded-lg border border-white/5 overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 pl-3">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500 group-focus-within:text-primary mr-2" />
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 md:w-[130px] w-full bg-transparent text-white text-xs focus:outline-none placeholder-zinc-600 font-medium cursor-pointer"
                    />
                </div>

                <div className="px-3 flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                </div>

                {/* Visual Fake Input 2 */}
                <div className="relative group flex items-center bg-zinc-950 rounded-lg border border-white/5 overflow-hidden transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 pl-3">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500 group-focus-within:text-primary mr-2" />
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="h-8 md:w-[130px] w-full bg-transparent text-white text-xs focus:outline-none placeholder-zinc-600 font-medium cursor-pointer"
                    />
                </div>

                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                        setMode("preset");
                        setStartDate("");
                        setEndDate("");
                    }}
                    className="ml-2 h-8 px-3 rounded-lg text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-all mr-1"
                >
                    Kembali
                </Button>
            </div>
        )}
    </div>
  );
}
