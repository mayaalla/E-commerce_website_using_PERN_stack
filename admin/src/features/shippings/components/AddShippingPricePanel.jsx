import * as React from "react";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useCreateShippingPrice } from "@/features/shippings";
import { shippingCompanyPricesQueryKey } from "../hooks/useGetShippingCompanyPrices";

// ─── Algeria wilayas ──────────────────────────────────────────────────────────
const WILAYAS = [
  { code: "01", name: "Adrar" },
  { code: "02", name: "Chlef" },
  { code: "03", name: "Laghouat" },
  { code: "04", name: "Oum El Bouaghi" },
  { code: "05", name: "Batna" },
  { code: "06", name: "Béjaïa" },
  { code: "07", name: "Biskra" },
  { code: "08", name: "Béchar" },
  { code: "09", name: "Blida" },
  { code: "10", name: "Bouira" },
  { code: "11", name: "Tamanrasset" },
  { code: "12", name: "Tébessa" },
  { code: "13", name: "Tlemcen" },
  { code: "14", name: "Tiaret" },
  { code: "15", name: "Tizi Ouzou" },
  { code: "16", name: "Alger" },
  { code: "17", name: "Djelfa" },
  { code: "18", name: "Jijel" },
  { code: "19", name: "Sétif" },
  { code: "20", name: "Saïda" },
  { code: "21", name: "Skikda" },
  { code: "22", name: "Sidi Bel Abbès" },
  { code: "23", name: "Annaba" },
  { code: "24", name: "Guelma" },
  { code: "25", name: "Constantine" },
  { code: "26", name: "Médéa" },
  { code: "27", name: "Mostaganem" },
  { code: "28", name: "M'Sila" },
  { code: "29", name: "Mascara" },
  { code: "30", name: "Ouargla" },
  { code: "31", name: "Oran" },
  { code: "32", name: "El Bayadh" },
  { code: "33", name: "Illizi" },
  { code: "34", name: "Bordj Bou Arréridj" },
  { code: "35", name: "Boumerdès" },
  { code: "36", name: "El Tarf" },
  { code: "37", name: "Tindouf" },
  { code: "38", name: "Tissemsilt" },
  { code: "39", name: "El Oued" },
  { code: "40", name: "Khenchela" },
  { code: "41", name: "Souk Ahras" },
  { code: "42", name: "Tipaza" },
  { code: "43", name: "Mila" },
  { code: "44", name: "Aïn Defla" },
  { code: "45", name: "Naâma" },
  { code: "46", name: "Aïn Témouchent" },
  { code: "47", name: "Ghardaïa" },
  { code: "48", name: "Relizane" },
  { code: "49", name: "Timimoun" },
  { code: "50", name: "Bordj Badji Mokhtar" },
  { code: "51", name: "Ouled Djellal" },
  { code: "52", name: "Béni Abbès" },
  { code: "53", name: "In Salah" },
  { code: "54", name: "In Guezzam" },
  { code: "55", name: "Touggourt" },
  { code: "56", name: "Djanet" },
  { code: "57", name: "El M'Ghair" },
  { code: "58", name: "El Menia" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function isValidPrice(val) {
  if (val === "" || val === null || val === undefined) return false;
  const n = Number(val);
  if (isNaN(n) || n < 0) return false;
  return /^\d+(\.\d{1,2})?$/.test(String(val).trim());
}

const EMPTY_FORM = { wilayaCode: "", price: "" };

// ─── AddShippingPriceBar ──────────────────────────────────────────────────────
// Inline bar sitting above the prices table.
// Lets the user select a company, pick a wilaya, enter a price, and submit —
// all directly on the page (no floating dialog).
//
// Props:
//   companyId  — the currently-selected shipping company (number)
//   companies  — array of ShippingCompany objects (for the company selector)
//   onCompanyChange — called when the user picks a different company
// ─────────────────────────────────────────────────────────────────────────────
function AddShippingPricePanel({ companyId, companies = [], onCompanyChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const queryClient = useQueryClient();
  const { mutate, isPending } = useCreateShippingPrice();

  // ── field helpers ──────────────────────────────────────────────────────────
  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    if (!companyId) {
      next.company = "Please select a shipping company.";
    }

    if (!form.wilayaCode) {
      next.wilayaCode = "Please select a wilaya.";
    }

    if (!isValidPrice(form.price)) {
      next.price =
        "Price must be a non-negative number with at most 2 decimal places.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    mutate(
      {
        wilayaCode: form.wilayaCode,
        price: form.price,
        shippingCompanyId: companyId,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: shippingCompanyPricesQueryKey(companyId),
          });
          setForm(EMPTY_FORM);
          setErrors({});
        },
        onError: (err) => {
          setErrors({ _server: err?.message ?? "Failed to add price." });
        },
      }
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Add shipping price"
      className="flex flex-col gap-3"
    >
      {/* Server-level error */}
      {errors._server && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {errors._server}
        </p>
      )}

      <div className="flex flex-wrap gap-3 items-start">
        {/* Company selector */}
        <div className="flex flex-col gap-1 min-w-[180px] flex-1">
          <Select
            value={companyId ? String(companyId) : ""}
            onValueChange={(val) => {
              onCompanyChange?.(Number(val));
              if (errors.company) setErrors((prev) => ({ ...prev, company: "" }));
            }}
            disabled={isPending}
          >
            <SelectTrigger
              aria-label="Select shipping company"
              aria-invalid={!!errors.company}
              className="h-9 text-sm"
            >
              <SelectValue placeholder="Select company…" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.company && (
            <p role="alert" className="text-xs text-destructive leading-tight">
              {errors.company}
            </p>
          )}
        </div>

        {/* Wilaya selector */}
        <div className="flex flex-col gap-1 min-w-[180px] flex-1">
          <Select
            value={form.wilayaCode}
            onValueChange={(val) => setField("wilayaCode", val)}
            disabled={isPending}
          >
            <SelectTrigger
              aria-label="Select wilaya"
              aria-invalid={!!errors.wilayaCode}
              className="h-9 text-sm"
            >
              <SelectValue placeholder="Select wilaya…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {WILAYAS.map((w) => (
                <SelectItem key={w.code} value={w.code}>
                  <span className="font-mono text-muted-foreground mr-1.5">
                    {w.code}
                  </span>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.wilayaCode && (
            <p role="alert" className="text-xs text-destructive leading-tight">
              {errors.wilayaCode}
            </p>
          )}
        </div>

        {/* Price input */}
        <div className="flex flex-col gap-1 w-36">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Price (DZD)…"
            value={form.price}
            onChange={(e) => setField("price", e.target.value)}
            disabled={isPending}
            aria-label="Shipping price in DZD"
            aria-invalid={!!errors.price}
            autoComplete="off"
            className="h-9 text-sm tabular-nums"
          />
          {errors.price && (
            <p role="alert" className="text-xs text-destructive leading-tight">
              {errors.price}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isPending || !form.price.trim() || !form.wilayaCode}
          className="shrink-0 gap-1.5 h-9"
          aria-label="Add shipping price"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add Price
        </Button>
      </div>
    </form>
  );
}

export default AddShippingPricePanel;
export { WILAYAS };
