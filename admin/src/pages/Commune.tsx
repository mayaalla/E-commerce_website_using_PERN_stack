import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Map } from "lucide-react";

import { Button } from "@/components/ui/button";
import CommunesPanel from "@/features/communes/components/CommunePanel";

// ─── CommunesPage ───────────────────────────────────────────────────────────
// Top-level route component for /commune/:wilayaCode.
//
// Layout (matches the Home page dashboard style):
//   ┌─ page wrapper (space-y-8, pb-10) ───────────────────────────────────┐
//   │  Page header row (icon + title + description)                        │
//   │  CommunesPanel (Card with AddCommuneBar + CommuneTable)              │
//   └──────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────
export default function CommunesPage() {
  const { wilayaCode = "" } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page header — same style as Home greeting row ─────────────── */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/wilaya")}
          className="self-start -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Wilaya
        </Button>

        <div className="flex items-center gap-2">
          <Map className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Wilaya {wilayaCode} Communes
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage communes in Wilaya {wilayaCode}.
        </p>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <CommunesPanel wilayaCode={wilayaCode} />
    </div>
  );
}
