import * as React from "react";
import { Users } from "lucide-react";
import AdminPanel from "@/features/admins/components/AdminPanel";

// ─── AdminsPage ───────────────────────────────────────────────────────────────
// Top-level route component for /admins.
//
// Layout (matches the dashboard page style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  AdminPanel (Card with AddAdminPanel + AdminTable)                   │
//   └──────────────────────────────────────────────────────────────────────┘
//
// Access: super_admin or full_access permission only (enforced by
// PermissionGuard at the router level via the "admins" page key).
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminsPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header — same style as other dashboard pages ──────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Users className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Admins</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage administrator accounts — create new admins, adjust their permissions, or remove them.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <AdminPanel />
    </div>
  );
}
