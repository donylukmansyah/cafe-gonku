"use client";

import { Loader2, Wallet, Save, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDailyCash } from "@/hooks/use-daily-cash";

export function DailyCashPanel() {
  const {
    entry,
    recentEntries,
    amountInput,
    setAmountInput,
    notes,
    setNotes,
    isLoading,
    isSaving,
    saveEntry,
  } = useDailyCash();

  const handleAmountChange = (value: string) => {
    const digitsOnly = value.replace(/\./g, "");

    if (!digitsOnly || /^\d+$/.test(digitsOnly)) {
      setAmountInput(
        digitsOnly ? Number(digitsOnly).toLocaleString("id-ID") : "",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] animate-pulse">
        {/* Left side card skeleton */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900" />
              <div className="h-6 w-48 bg-zinc-900 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-zinc-900 rounded" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-28 bg-zinc-900 rounded" />
              <div className="h-12 w-full bg-zinc-900 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 bg-zinc-900 rounded" />
              <div className="h-12 w-full bg-zinc-900 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-zinc-900 rounded" />
            <div className="h-[120px] w-full bg-zinc-900 rounded-xl" />
          </div>
          <div className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-zinc-900 rounded" />
              <div className="h-4 w-32 bg-zinc-900 rounded" />
            </div>
            <div className="h-11 w-32 bg-zinc-900 rounded-xl" />
          </div>
        </div>

        {/* Right side card skeleton */}
        <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-zinc-900 rounded" />
              <div className="h-6 w-36 bg-zinc-900 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-zinc-900 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-zinc-900 rounded" />
                  <div className="h-5 w-24 bg-zinc-900 rounded" />
                </div>
                <div className="space-y-1.5 flex flex-col items-end">
                  <div className="h-3 w-20 bg-zinc-900 rounded" />
                  <div className="h-3 w-12 bg-zinc-900 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="bg-zinc-950/60 border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            Pendapatan di Kasir
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Masukkan total pendapatan uang tunai yang diterima hari ini di kasir agar admin bisa melihat gabungan pemasukan QR dan cash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash-amount">Pendapatan Kasir</Label>
              <Input
                id="cash-amount"
                inputMode="numeric"
                placeholder="0"
                value={amountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                className="h-12 bg-zinc-900/60 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label>Update Terakhir</Label>
              <div className="h-12 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 flex items-center text-sm text-zinc-400">
                {entry ? new Date(entry.updatedAt).toLocaleString("id-ID") : "Belum ada input"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-notes">Catatan</Label>
            <Textarea
              id="cash-notes"
              placeholder="Contoh: Kas manual termasuk pembayaran takeaway dan dine-in."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[120px] bg-zinc-900/60 border-zinc-800"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Petugas Terakhir
              </p>
              <p className="text-sm font-semibold text-white">
                {entry?.recordedBy ?? "Belum tercatat"}
              </p>
            </div>

            <Button
              onClick={saveEntry}
              disabled={isSaving}
              className="h-11 rounded-xl bg-primary text-black font-black hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Pendapatan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950/60 border-zinc-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Riwayat Pendapatan Kasir
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Rekap 7 hari terakhir yang ikut dihitung di dashboard admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentEntries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
              Belum ada data pendapatan kasir.
            </div>
          ) : (
            recentEntries.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      {item.label}
                    </p>
                    <p className="text-lg font-black text-white">
                      Rp {item.amount.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>{item.recordedBy ?? "Tanpa nama"}</p>
                    <p>{new Date(item.updatedAt).toLocaleTimeString("id-ID")}</p>
                  </div>
                </div>
                {item.notes ? (
                  <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                    {item.notes}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
