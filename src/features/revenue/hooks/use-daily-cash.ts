"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiFetch } from "@/shared/client/api-client";

type DailyCashEntry = {
  id: string;
  date: string;
  label: string;
  amount: number;
  notes: string | null;
  recordedBy: string | null;
  updatedAt: string;
};

type DailyCashResponse = {
  entry: DailyCashEntry | null;
  recentEntries: DailyCashEntry[];
};

export function useDailyCash() {
  const { data, error, isLoading, mutate } = useSWR<DailyCashResponse>(
    "/api/cash/daily",
    apiFetch,
    {
      revalidateOnFocus: false,
    },
  );

  const [amountInput, setAmountInput] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (dirty) return; // User sedang edit / baru save — jangan overwrite
    if (!data?.entry) {
      setAmountInput("");
      setNotes("");
      return;
    }

    setAmountInput(data.entry.amount.toLocaleString("id-ID"));
    setNotes(data.entry.notes ?? "");
  }, [data?.entry, dirty]);

  const setAmountInputDirty = (v: string) => { setDirty(true); setAmountInput(v); };
  const setNotesDirty = (v: string) => { setDirty(true); setNotes(v); };

  const saveEntry = async () => {
    const normalizedAmount = Number(amountInput.replace(/\./g, ""));

    if (!amountInput || !Number.isInteger(normalizedAmount) || normalizedAmount <= 0) {
      toast.error("Nominal kas wajib lebih dari Rp0");
      return false;
    }

    setIsSaving(true);

    try {
      await apiFetch("/api/cash/daily", {
        method: "PUT",
        body: JSON.stringify({
          amount: normalizedAmount,
          notes,
        }),
      });

      // mutate lalu biarkan useEffect sync — dirty=false supaya effect boleh jalan
      setDirty(false);
      await mutate();
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    entry: data?.entry ?? null,
    recentEntries: data?.recentEntries ?? [],
    amountInput,
    setAmountInput: setAmountInputDirty,
    notes,
    setNotes: setNotesDirty,
    isLoading,
    isSaving,
    error,
    saveEntry,
    refresh: mutate,
  };
}
