import * as React from "react";
import { ShoppingBag } from "lucide-react";
import OrderPannel from "@/features/orders/components/OrderPannel";

// ─── OrdersPage ───────────────────────────────────────────────────────────────
// Top-level route component for /orders.
//
// Layout (matches the dashboard page style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  OrderPannel (Card with stats pills + AddOrderWindow + OrderTable)   │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage customer orders — update statuses, archive old entries, and
          track revenue at a glance.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <OrderPannel />
    </div>
  );
}
