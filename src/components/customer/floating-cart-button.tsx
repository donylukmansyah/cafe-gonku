import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export function FloatingCartButton({
  total,
  onClick,
}: {
  total: number;
  onClick: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 animate-in slide-in-from-bottom-10 duration-700">
      <Button
        className="w-full h-16 bg-zinc-900/90 border border-white/10 rounded-full p-2 pr-6 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)] active:scale-95 transition-all backdrop-blur-xl group hover:bg-zinc-800/95 hover:border-primary/40 ring-1 ring-white/5"
        onClick={onClick}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center font-bold shadow-[0_8px_20px_rgba(53,183,24,0.15)] group-hover:scale-105 transition-transform duration-500">
            <ShoppingCart className="w-5 h-5 fill-current" />
          </div>
          <div className="flex flex-col items-start translate-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-primary/70 transition-colors">Checkout</span>
            <span className="text-sm font-black text-white group-hover:text-primary transition-colors">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-all duration-300">
          Bayar
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20">
            <span className="mb-0.5 text-lg leading-none">›</span>
          </div>
        </div>
      </Button>
    </div>
  );
}
