import * as React from "react";
import { AlertCircle } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useGetShippingCompanies } from "@/features/shippings";
import AddShippingCompanyPanel from "./AddShippingCompanyPanel";
import ShippingCompanyTable from "./ShippingCompanyTable";

// ─── ShippingCompaniesPanel ───────────────────────────────────────────────────
// Orchestrates:
//   1. Data fetching (loading / error / data states)
//   2. <AddShippingCompanyPanel> — the "New Company" button + Dialog form
//   3. <ShippingCompanyTable>   — company rows with inline edit + delete
//
// Wrapped in a shadcn Card consistent with the dashboard style.
// ─────────────────────────────────────────────────────────────────────────────
function ShippingCompaniesPanel() {
  const { data, isLoading, isError, error, refetch } =
    useGetShippingCompanies();

  const companies = data?.data ?? [];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="gap-0 py-0 overflow-hidden">
        {/* Skeleton toolbar */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-36 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Skeleton table rows */}
        <div>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0"
            >
              <div className="h-4 w-8 rounded bg-muted animate-pulse" />
              <div className="h-4 w-40 rounded bg-muted animate-pulse" />
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
  if (isError) {
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
                Failed to load shipping companies
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
      {/* ── Card header: title + count + "New Company" button ───────────── */}
      <CardHeader className="border-b border-border px-6 py-4 gap-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">
              Shipping Companies
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {companies.length === 0
                ? "No companies yet"
                : `${companies.length} ${
                    companies.length === 1 ? "company" : "companies"
                  } total`}
            </CardDescription>
          </div>

          {/* New Company button + Dialog */}
          <AddShippingCompanyPanel />
        </div>
      </CardHeader>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <CardContent className="p-0">
        <ShippingCompanyTable companies={companies} />
      </CardContent>
    </Card>
  );
}

export default ShippingCompaniesPanel;
