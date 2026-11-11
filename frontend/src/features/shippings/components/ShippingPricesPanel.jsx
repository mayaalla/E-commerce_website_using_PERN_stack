import * as React from "react";
import { AlertCircle } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useGetShippingCompanyPrices } from "@/features/shippings";
import AddShippingPricePanel from "./AddShippingPricePanel";
import ShippingPriceTable from "./ShippingPriceTable";

// ─── ShippingPricesPanel ──────────────────────────────────────────────────────
// Shows wilaya prices for a selected shipping company.
//
// Props:
//   companyId        — the currently-selected company id (number | null)
//   companies        — full list of ShippingCompany objects (for the add bar selector)
//   onCompanyChange  — callback when the user picks a different company in the add bar
// ─────────────────────────────────────────────────────────────────────────────
function ShippingPricesPanel({ companyId, companies = [], onCompanyChange }) {
  const { data, isLoading, isError, error, refetch } =
    useGetShippingCompanyPrices(companyId);

  const prices = data?.data ?? [];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (companyId && isLoading) {
    return (
      <Card className="gap-0 py-0 overflow-hidden">
        {/* Skeleton toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Skeleton table rows */}
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0"
            >
              <div className="h-4 w-8 rounded bg-muted animate-pulse" />
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
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
  if (companyId && isError) {
    return (
      <Card className="py-5">
        <CardContent>
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">
                Failed to load shipping prices
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

  // ── Loaded (or no company selected yet) ───────────────────────────────────
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      {/* ── Card header: title + count + inline Add Price bar ───────────── */}
      <CardHeader className="border-b border-border px-6 py-4 gap-4">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-semibold">
            Wilaya Shipping Prices
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {!companyId
              ? "Select a company below to view or add prices."
              : prices.length === 0
              ? "No prices configured for this company"
              : `${prices.length} ${prices.length === 1 ? "entry" : "entries"} configured`}
          </CardDescription>
        </div>

        {/* Inline add bar — always rendered so the company selector is visible */}
        <AddShippingPricePanel
          companyId={companyId}
          companies={companies}
          onCompanyChange={onCompanyChange}
        />
      </CardHeader>

      {/* ── Table — only shown when a company is selected ─────────────────── */}
      {companyId ? (
        <CardContent className="p-0">
          <ShippingPriceTable prices={prices} />
        </CardContent>
      ) : (
        <div className="border-t border-dashed border-border bg-muted/20 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Select a shipping company above to see its wilaya prices.
          </p>
        </div>
      )}
    </Card>
  );
}

export default ShippingPricesPanel;
