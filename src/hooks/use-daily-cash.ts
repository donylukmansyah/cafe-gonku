"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api-client";

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

  useEffect(() => {
    if (!data?.entry) {
      setAmountInput("");
      setNotes("");
      return;
    }

    setAmountInput(data.entry.amount.toLocaleString("id-ID"));
    setNotes(data.entry.notes ?? "");
  }, [data?.entry]);

  const saveEntry = async () => {
    const normalizedAmount = Number(amountInput.replace(/\./g, ""));

    setIsSaving(true);

    try {
      await apiFetch("/api/cash/daily", {
        method: "PUT",
        body: JSON.stringify({
          amount: Number.isNaN(normalizedAmount) ? 0 : normalizedAmount,
          notes,
        }),
      });

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
    setAmountInput,
    notes,
    setNotes,
    isLoading,
    isSaving,
    error,
    saveEntry,
    refresh: mutate,
  };
}
