import * as React from "react";
import { Tag } from "lucide-react";
import CategoriesPanel from "@/features/categories/components/CategoriesPanel";

// ─── CategoriesPage ───────────────────────────────────────────────────────────
// Top-level route component for /categories.
//
// Layout (matches the Home page dashboard style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  CategoriesPanel (Card with AddCategoryBar + CategoryTable)          │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header — same style as Home greeting row ─────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Tag className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage product categories — add new ones, rename or remove existing ones.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <CategoriesPanel />
    </div>
  );
}
