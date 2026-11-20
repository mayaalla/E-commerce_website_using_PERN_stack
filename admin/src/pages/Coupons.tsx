import * as React from "react";
import { Ticket } from "lucide-react";
import CouponPanel from "@/features/coupons/components/CouponPanel";

// ─── CouponsPage ──────────────────────────────────────────────────────────────
// Top-level route component for /coupons.
//
// Layout (matches the dashboard page style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  CouponPanel (Card with AddCouponPanel Dialog + CouponTable)         │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function CouponsPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Ticket className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage discount coupons — create new codes, update their status, or
          remove expired ones.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <CouponPanel />
    </div>
  );
}
