import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { useGetCategories } from "@/features/categories";
import AddCategoryBar from "./AddCategoryBar";
import CategoryTable from "./CategoryTable";

// ─── CategoriesPanel ──────────────────────────────────────────────────────────
// Orchestrates:
//   1. Data fetching (loading / error / data states)
//   2. <AddCategoryBar> — the "add" form above the table
//   3. <CategoryTable>  — the category rows
// ─────────────────────────────────────────────────────────────────────────────
function CategoriesPanel() {
  const { data, isLoading, isError, error, refetch } = useGetCategories();

  const categories = data?.data ?? [];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Skeleton toolbar */}
        <div className="h-9 w-72 rounded-md bg-muted animate-pulse" />

        {/* Skeleton table rows */}
        <div className="rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
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
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-destructive">
            Failed to load categories
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
    );
  }

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Add-category toolbar */}
      <div className="relative">
        <AddCategoryBar />
      </div>

      {/* Count badge */}
      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-2">
          {categories.length} {categories.length === 1 ? "category" : "categories"} total
        </p>
      )}

      {/* Table */}
      <CategoryTable categories={categories} />
    </div>
  );
}

export default CategoriesPanel;
