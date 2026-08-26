"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches any error thrown while rendering an authed page (e.g. the API being
// unreachable) and shows a friendly retry card instead of a white screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real cause in the browser console for debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="card-surface flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium">Couldn&apos;t load this page</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t reach the server. This is usually temporary — try again
          in a moment.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
