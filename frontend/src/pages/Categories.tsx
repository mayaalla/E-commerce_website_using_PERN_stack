import * as React from "react";
import CategoriesPanel from "@/features/categories/components/CategoriesPanel";

// ─── CategoriesPage ───────────────────────────────────────────────────────────
// Top-level route component for /categories.
//
// Layout:
//   ┌─ page wrapper (centered, max-w, padding) ────────────────────────────┐
//   │  Page header (title + description)                                   │
//   │  ─────────────────────────────────────────────────────────────────── │
//   │  CategoriesPanel                                                      │
//   │    ├─ AddCategoryBar  (input + "Add Category" button)                │
//   │    └─ CategoryTable   (id | name | edit/delete actions)              │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage product categories. Add new ones, rename existing ones
            directly in the table, or remove them.
          </p>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="mb-8 h-px bg-border" />

        {/* ── Main content ─────────────────────────────────────────────── */}
        <CategoriesPanel />
      </div>
    </main>
  );
}
