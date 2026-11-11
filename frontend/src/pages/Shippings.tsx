import * as React from "react";
import { Truck } from "lucide-react";
import ShippingCompaniesPanel from "@/features/shippings/components/ShippingCompaniesPanel";

// ─── ShippingsPage ────────────────────────────────────────────────────────────
// Top-level route for /shippings.
//
// Layout:
//   Page header (icon + title + description)
//   ShippingCompaniesPanel — list with inline edit/delete and a › button on
//   each row that navigates to /shippings/:companyId (the Wilaya Prices subpage).
// ─────────────────────────────────────────────────────────────────────────────
export default function ShippingsPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Truck className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Shippings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage shipping companies and their wilaya delivery prices.
        </p>
      </div>

      {/* ── Shipping Companies ─────────────────────────────────────────── */}
      <ShippingCompaniesPanel />
    </div>
  );
}
