import { Tag } from "lucide-react";
import WilayasPanel from "@/features/wilaya/components/WilayaPanel";

// ─── WilayasPage ───────────────────────────────────────────────────────────
// Top-level route component for /Wilayas.
//
// Layout (matches the Home page dashboard style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  WilayasPanel (Card with AddWilayaBar + WilayaTable)              │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function WilayasPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* ── Page header — same style as Home greeting row ─────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Tag className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Wilayas</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage product Wilayas — add new ones, rename or remove existing ones.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <WilayasPanel />
    </div>
  );
}
