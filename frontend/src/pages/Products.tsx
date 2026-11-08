import * as React from "react";
import { Package } from "lucide-react";
import ProductPannel from "@/features/products/components/ProductPannel";

// ─── ProductsPage ─────────────────────────────────────────────────────────────
// Top-level route component for /products.
//
// Layout (matches the Home page dashboard style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  ProductPannel (Card with AddProductWindow + ProductTable)           │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header — same style as Home greeting row ─────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Package className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your product catalog — add, edit images, prices, and remove products.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <ProductPannel />
    </div>
  );
}
