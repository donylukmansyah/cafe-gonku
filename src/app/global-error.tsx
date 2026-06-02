"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Terjadi Kesalahan</h2>
            <p className="text-zinc-400">Mohon maaf, terjadi error pada sistem.</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-[#35b718] text-black font-bold rounded-2xl hover:bg-[#35b718]/90 transition-all active:scale-95"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
