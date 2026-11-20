import * as React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import ShippingPricesPanel from "@/features/shippings/components/ShippingPricesPanel";
import { useGetShippingCompanies } from "@/features/shippings";

// ─── ShippingPricesPage ───────────────────────────────────────────────────────
// Subpage for /shippings/:companyId
// Shows the wilaya prices table for a specific shipping company.
// The user arrives here by clicking the › button on a company row.
//
// Layout:
//   ← Back   Shipping / Company Name
//   ─────────────────────────────────
//   ShippingPricesPanel (add bar + table)
// ─────────────────────────────────────────────────────────────────────────────
export default function ShippingPricesPage() {
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  // Parse companyId from route params
  const companyIdFromRoute = Number(companyIdParam);

  // Let the user switch company via the add bar's selector — start with the
  // company from the URL so the table loads immediately.
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    Number.isInteger(companyIdFromRoute) && companyIdFromRoute > 0
      ? companyIdFromRoute
      : null
  );

  const { data } = useGetShippingCompanies();
  const companies: import("@/features/shippings").ShippingCompany[] =
    data?.data ?? [];

  // Resolve the company name for the page header
  const company = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="space-y-6 pb-10">
      {/* ── Breadcrumb / back navigation ───────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/shippings")}
          className="self-start -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Shippings
        </Button>

        <div className="flex items-center gap-2 mt-1">
          <Truck className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">
              {company ? company.name : "Wilaya Prices"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {company
                ? `Manage wilaya delivery prices for ${company.name}.`
                : "Select a company to manage its wilaya delivery prices."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Prices panel ───────────────────────────────────────────────── */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ShippingPricesPanel
        companyId={selectedCompanyId}
        companies={companies as any}
        onCompanyChange={setSelectedCompanyId}
      />
    </div>
  );
}
