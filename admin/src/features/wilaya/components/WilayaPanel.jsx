import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useGetWilayas } from "@/features/wilaya/hooks/useGetWilayas";
import { useGetOrders } from "@/features/orders/hooks/useGetOrders";
import AddWilayaBar from "./AddWilayaBar";
import WilayaTable from "./WilayaTable";

// ─── WilayasPanel ──────────────────────────────────────────────────────────
// Orchestrates:
//   1. Data fetching (loading / error / data states)
//   2. <AddWilayaBar> — the "add" form above the table
//   3. <WilayaTable>  — the Wilaya rows
//
// Wrapped in a shadcn Card to stay consistent with the Home page dashboard style.
// ─────────────────────────────────────────────────────────────────────────────
function WilayaPanel() {
  const { data, isLoading, isError, error, refetch } = useGetWilayas();
  const { data: ordersData } = useGetOrders({ limit: 100, sortBy: "id", sortOrder: "desc" });

  const wilayas = data?.data ?? [];

  // Build a code → order-count map from whatever orders we fetched.
  const orderCountsByCode = useMemo(() => {
    const counts = {};
    for (const order of ordersData?.data ?? []) {
      counts[order.wilayaCode] = (counts[order.wilayaCode] ?? 0) + 1;
    }
    return counts;
  }, [ordersData]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="gap-0 py-0 overflow-hidden">
        {/* Skeleton toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="h-9 w-72 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Skeleton table rows */}
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0"
            >
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 max-w-xs rounded bg-muted animate-pulse" />
              <div className="ml-auto flex gap-2">
                <div className="h-7 w-7 rounded bg-muted animate-pulse" />
                <div className="h-7 w-7 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card className="py-5">
        <CardContent>
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">
                Failed to load Wilayas
              </p>
              <p className="text-muted-foreground">
                {error?.message ?? "An unexpected error occurred."}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline self-start"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      {/* ── Card header: title + count badge + Add form ───────────────── */}
      <CardHeader className="border-b border-border px-6 py-4 gap-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              All Wilayas
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {wilayas.length === 0
                ? "No Wilayas yet"
                : `${wilayas.length} ${wilayas.length === 1 ? "Wilaya" : "Wilayas"} total`}
            </CardDescription>
          </div>
        </div>

        {/* Add-Wilaya form */}
        <AddWilayaBar />
      </CardHeader>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <CardContent className="p-0">
        <WilayaTable wilayas={wilayas} orderCountsByCode={orderCountsByCode} />
      </CardContent>
    </Card>
  );
}

export default WilayaPanel;
