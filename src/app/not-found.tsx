import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, ArrowLeft, MapPinOff } from "lucide-react";

export const metadata: Metadata = {
  title: "404 - Halaman Tidak Ditemukan",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[120px] animate-pulse-slow" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="rounded-[2.5rem] border border-white/10 bg-zinc-900/40 p-10 backdrop-blur-3xl">
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl animate-pulse-slow" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <MapPinOff className="h-9 w-9 text-primary drop-shadow-[0_0_12px_rgba(53,183,24,0.5)]" />
            </div>
          </div>

          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Error 404
          </p>

          <h1 className="mb-3 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-4xl font-black text-transparent">
            Nyasar Nih!
          </h1>

          <p className="mb-8 text-sm leading-relaxed text-zinc-500">
            Halaman yang kamu cari nggak ada.
            <br />
            Mungkin salah ketik atau halamannya udah dipindahin.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary font-black text-black shadow-[0_0_20px_rgba(53,183,24,0.3)] transition-all hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(53,183,24,0.5)] active:scale-95"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600">
          <Coffee className="h-4 w-4" />
          <span className="text-xs font-medium">Cafe Gonku</span>
        </div>
      </div>
    </div>
  );
}
