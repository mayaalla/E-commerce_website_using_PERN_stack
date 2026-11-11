import * as React from "react";
import { useState, useEffect } from "react";
import { Pencil, Trash2, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useUpdateProduct, useDeleteProduct } from "@/features/products";
import { useGetCategories } from "@/features/categories";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLOTHING_SIZES = ["34", "36", "38", "40", "42", "44", "46", "48"];
const MAX_BADGES = 3;

// ─── Color picker constants (mirrors AddProductWindow) ────────────────────────
/** 16 famous preset colors shown as swatches */
const PRESET_COLORS = [
  { hex: "#000000", label: "Black" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#FF0000", label: "Red" },
  { hex: "#0000FF", label: "Blue" },
  { hex: "#008000", label: "Green" },
  { hex: "#FFFF00", label: "Yellow" },
  { hex: "#FFA500", label: "Orange" },
  { hex: "#800080", label: "Purple" },
  { hex: "#FFC0CB", label: "Pink" },
  { hex: "#A52A2A", label: "Brown" },
  { hex: "#808080", label: "Gray" },
  { hex: "#C0C0C0", label: "Silver" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#40E0D0", label: "Turquoise" },
  { hex: "#000080", label: "Navy" },
  { hex: "#FFCBA4", label: "Skin" },
];

/** Light-coloured swatches that need a dark border / check mark */
const LIGHT_HEXES = new Set([
  "#FFFFFF",
  "#FFFF00",
  "#FFCBA4",
  "#C0C0C0",
  "#FFD700",
  "#FFC0CB",
]);
const isLightHex = (hex) => LIGHT_HEXES.has(hex.toUpperCase());

/**
 * Convert the product's colors array (string names) into the
 * selectedColors format: { hex, name }[].
 *
 * Strategy:
 *   • If the name matches a preset label → use that preset's hex.
 *   • If the name is itself a valid hex (#RRGGBB) → use it directly.
 *   • Otherwise → store it as a chip with a generated hex placeholder
 *     that won't collide with presets (we use the string as both hex key
 *     and name, but wrapped so the UI still works).
 */
function colorsArrayToSelected(colors) {
  return colors.map((name) => {
    // Try to find a matching preset by label (case-insensitive)
    const preset = PRESET_COLORS.find(
      (p) => p.label.toLowerCase() === name.toLowerCase()
    );
    if (preset) return { hex: preset.hex.toUpperCase(), name: preset.label };

    // Check if it's already a hex value
    if (/^#[0-9A-Fa-f]{6}$/.test(name)) {
      return { hex: name.toUpperCase(), name: name.toUpperCase() };
    }

    // Unknown name — store it with a fake hex key so the chip renders.
    // We generate a stable-ish key by hashing the name string.
    const fakeHex = "#" + [...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffff, 0)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase();
    return { hex: fakeHex, name };
  });
}

// ─── EditProductDialog ────────────────────────────────────────────────────────
// Dialog that lets the user edit a product's fields.
// Colors section mirrors AddProductWindow: preset swatches + hex picker + chips.
// Only submits fields that actually changed (dirty check).
// ─────────────────────────────────────────────────────────────────────────────
function buildInitialForm(product) {
  return {
    title: product.title,
    description: product.description,
    price: String(product.price),
    promo: product.promo ?? "",
    categoryId: String(product.categoryId),
    // Convert string names → { hex, name }[] using the helper above
    selectedColors: colorsArrayToSelected(product.colors),
    sizes: [...product.sizes],
  };
}

function EditProductDialog({ product, open, onOpenChange }) {
  const { data: categoriesData } = useGetCategories();
  const categories = categoriesData?.data ?? [];

  // Initialise draft from current product values
  const [form, setForm] = useState(() => buildInitialForm(product));
  const [errors, setErrors] = useState({});

  /** Tracks the value of the hex-picker input (not yet committed) */
  const [pickerHex, setPickerHex] = useState("#e11d48");
  /** Optional custom name the admin types before hitting "Add" */
  const [pickerName, setPickerName] = useState("");

  // Re-sync form state whenever the dialog is opened (or product data changes),
  // so that re-opening the dialog after a save always shows fresh data.
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(product));
      setErrors({});
      setPickerHex("#e11d48");
      setPickerName("");
    }
  }, [open, product]);

  const { mutate: update, isPending } = useUpdateProduct();

  // ── helpers ────────────────────────────────────────────────────────────────
  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleSize(size) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  }

  // ── Color helpers (identical to AddProductWindow) ──────────────────────────
  function togglePresetColor(hex, label) {
    const key = hex.toUpperCase();
    setForm((prev) => {
      const already = prev.selectedColors.some((c) => c.hex === key);
      return {
        ...prev,
        selectedColors: already
          ? prev.selectedColors.filter((c) => c.hex !== key)
          : [...prev.selectedColors, { hex: key, name: label }],
      };
    });
  }

  function addPickerColor() {
    const key = pickerHex.toUpperCase();
    const name = pickerName.trim() || key;
    setForm((prev) => {
      if (prev.selectedColors.some((c) => c.hex === key)) return prev;
      return {
        ...prev,
        selectedColors: [...prev.selectedColors, { hex: key, name }],
      };
    });
    setPickerName("");
  }

  function removeColor(hex) {
    const key = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.filter((c) => c.hex !== key),
    }));
  }

  function renameColor(hex, newName) {
    const key = hex.toUpperCase();
    setForm((prev) => ({
      ...prev,
      selectedColors: prev.selectedColors.map((c) =>
        c.hex === key ? { ...c, name: newName } : c
      ),
    }));
  }

  // ── dirty check: only send changed fields ──────────────────────────────────
  function buildPayload() {
    const payload = {};

    if (form.title.trim() !== product.title) payload.title = form.title.trim();
    if (form.description.trim() !== product.description) payload.description = form.description.trim();
    if (form.price.trim() !== String(product.price)) payload.price = form.price.trim();

    const promoVal = form.promo.trim() === "" ? null : form.promo.trim();
    if (promoVal !== product.promo) payload.promo = promoVal;

    const catId = parseInt(form.categoryId, 10);
    if (catId !== product.categoryId) payload.categoryId = catId;

    // Derive color name strings to send to the backend
    const colors = form.selectedColors.map((c) => c.name || c.hex);
    const colorsChanged = JSON.stringify(colors) !== JSON.stringify(product.colors);
    if (colorsChanged) payload.colors = colors;

    const sortedDraft = [...form.sizes].sort();
    const sortedOrig = [...product.sizes].sort();
    const sizesChanged = JSON.stringify(sortedDraft) !== JSON.stringify(sortedOrig);
    if (sizesChanged) payload.sizes = form.sizes;

    // Always send both colors and sizes together so the backend never
    // receives one without the other, which could cause it to clear the
    // missing field (e.g. clearing colors when only sizes changed).
    if (sizesChanged && !colorsChanged) payload.colors = colors;
    if (colorsChanged && !sizesChanged) payload.sizes = form.sizes;

    return payload;
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.description.trim()) next.description = "Description is required.";

    const priceNum = parseFloat(form.price);
    if (form.price === "" || isNaN(priceNum) || priceNum < 0) {
      next.price = "Price must be a non-negative number.";
    }
    if (form.promo !== "") {
      const promoNum = parseFloat(form.promo);
      if (isNaN(promoNum) || promoNum < 0) {
        next.promo = "Promo price must be a non-negative number.";
      } else if (!isNaN(priceNum) && promoNum > priceNum) {
        next.promo = "Promo price must be ≤ the regular price.";
      }
    }
    if (!form.categoryId) next.categoryId = "Category is required.";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildPayload();
    // Nothing changed — just close
    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    update(
      { id: product.id, data: payload },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
        onError: (err) => {
          setErrors((prev) => ({
            ...prev,
            form: err?.message ?? "Failed to update product. Please try again.",
          }));
        },
      }
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the fields below. Only changed values will be saved.
          </DialogDescription>
        </DialogHeader>

        <form
          id={`edit-product-form-${product.id}`}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 py-2"
        >
          {/* ── Title ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-title-${product.id}`}>
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`ep-title-${product.id}`}
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              disabled={isPending}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? `ep-title-err-${product.id}` : undefined}
              autoComplete="off"
            />
            {errors.title && (
              <p id={`ep-title-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* ── Description ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-desc-${product.id}`}>
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id={`ep-desc-${product.id}`}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={isPending}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? `ep-desc-err-${product.id}` : undefined}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.description && (
              <p id={`ep-desc-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.description}
              </p>
            )}
          </div>

          {/* ── Price + Promo ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ep-price-${product.id}`}>
                Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`ep-price-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? `ep-price-err-${product.id}` : undefined}
              />
              {errors.price && (
                <p id={`ep-price-err-${product.id}`} role="alert" className="text-xs text-destructive">
                  {errors.price}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`ep-promo-${product.id}`}>
                Promo Price{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id={`ep-promo-${product.id}`}
                type="number"
                min="0"
                step="0.01"
                value={form.promo}
                onChange={(e) => setField("promo", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.promo}
                aria-describedby={errors.promo ? `ep-promo-err-${product.id}` : undefined}
              />
              {errors.promo && (
                <p id={`ep-promo-err-${product.id}`} role="alert" className="text-xs text-destructive">
                  {errors.promo}
                </p>
              )}
            </div>
          </div>

          {/* ── Category ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-category-${product.id}`}>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.categoryId}
              onValueChange={(val) => setField("categoryId", val)}
              disabled={isPending}
            >
              <SelectTrigger
                id={`ep-category-${product.id}`}
                aria-invalid={!!errors.categoryId}
                aria-describedby={errors.categoryId ? `ep-cat-err-${product.id}` : undefined}
              >
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p id={`ep-cat-err-${product.id}`} role="alert" className="text-xs text-destructive">
                {errors.categoryId}
              </p>
            )}
          </div>

          {/* ── Colors ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Label>
                Colors{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              {form.selectedColors.length > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {form.selectedColors.length} selected
                </span>
              )}
            </div>

            {/* ── Card ── */}
            <div className="rounded-lg border border-input bg-muted/20 p-4 flex flex-col gap-4">
              {/* ── Preset swatches ── */}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(({ hex, label }) => {
                    const key = hex.toUpperCase();
                    const isSelected = form.selectedColors.some((c) => c.hex === key);
                    const light = isLightHex(hex);
                    return (
                      <button
                        key={hex}
                        type="button"
                        title={label}
                        aria-label={`${label} — ${isSelected ? "remove" : "add"}`}
                        aria-pressed={isSelected}
                        disabled={isPending}
                        onClick={() => togglePresetColor(hex, label)}
                        style={{ backgroundColor: hex }}
                        className={[
                          "relative size-8 rounded-full transition-all duration-150 shrink-0",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "disabled:pointer-events-none disabled:opacity-40",
                          isSelected
                            ? light
                              ? "ring-2 ring-offset-2 ring-black scale-110 shadow-md"
                              : "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                            : light
                              ? "border border-border/70 hover:scale-110 hover:shadow-sm"
                              : "hover:scale-110 hover:shadow-sm",
                        ].join(" ")}
                      >
                        {isSelected && (
                          <span
                            className={[
                              "absolute inset-0 flex items-center justify-center text-[10px] font-black",
                              light ? "text-black" : "text-white",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="h-px bg-border/60" />

              {/* ── Custom color picker ── */}
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Custom color
                </p>

                {/* Row: swatch + hex badge */}
                <div className="flex items-center gap-3">
                  {/* Color wheel swatch */}
                  <div className="relative shrink-0">
                    <div
                      className="size-11 rounded-xl border-2 border-input shadow-sm cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: pickerHex }}
                      aria-hidden="true"
                    />
                    <input
                      type="color"
                      value={pickerHex}
                      onChange={(e) => setPickerHex(e.target.value)}
                      disabled={isPending}
                      aria-label="Open color wheel"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:pointer-events-none"
                    />
                  </div>

                  {/* Info stack */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {pickerHex.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Click swatch to change
                    </span>
                  </div>
                </div>

                {/* Name input row */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`ep-custom-color-name-${product.id}`}
                    className="text-xs font-medium text-foreground"
                  >
                    Color name{" "}
                    <span className="font-normal text-muted-foreground">
                      — give it a name or leave blank to use the hex code
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id={`ep-custom-color-name-${product.id}`}
                      type="text"
                      placeholder={`e.g. "Dusty Rose" or leave blank`}
                      value={pickerName}
                      onChange={(e) => setPickerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addPickerColor();
                        }
                      }}
                      disabled={isPending}
                      className="h-9 text-sm flex-1"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        isPending ||
                        form.selectedColors.some(
                          (c) => c.hex === pickerHex.toUpperCase()
                        )
                      }
                      onClick={addPickerColor}
                      className="shrink-0 h-9 px-4 gap-1.5"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Selected color chips ── */}
            {form.selectedColors.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Selected — click a name to rename it
                </p>
                <div className="flex flex-wrap gap-2">
                  {form.selectedColors.map(({ hex, name }) => {
                    const light = isLightHex(hex);
                    const isUnnamed = name === hex.toUpperCase();
                    return (
                      <div
                        key={hex}
                        className={[
                          "group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border bg-background shadow-sm text-xs font-medium",
                          isUnnamed
                            ? "border-amber-400/60 ring-1 ring-amber-400/40"
                            : "border-border",
                        ].join(" ")}
                      >
                        {/* Color dot */}
                        <span
                          className={[
                            "inline-flex shrink-0 size-4 rounded-full border",
                            light ? "border-border" : "border-transparent",
                          ].join(" ")}
                          style={{ backgroundColor: hex }}
                          aria-hidden="true"
                        />

                        {/* Inline editable name */}
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => renameColor(hex, e.target.value)}
                          disabled={isPending}
                          aria-label={`Rename color ${name}`}
                          title={
                            isUnnamed
                              ? "This color has no name — click to rename"
                              : undefined
                          }
                          placeholder="Name…"
                          className={[
                            "bg-transparent border-none outline-none text-xs disabled:pointer-events-none",
                            "focus:underline focus:underline-offset-2 cursor-text",
                            isUnnamed
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground",
                          ].join(" ")}
                          style={{ width: `${Math.max(name.length + 1, 7)}ch` }}
                        />

                        {/* Remove button */}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => removeColor(hex)}
                          aria-label={`Remove ${name}`}
                          className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:pointer-events-none ml-0.5"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Hint if any chip is unnamed */}
                {form.selectedColors.some(
                  (c) => c.name === c.hex.toUpperCase()
                ) && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span aria-hidden="true">⚠</span>
                    Some colors have no name — click the highlighted chip to rename them.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Sizes ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {CLOTHING_SIZES.map((size) => {
                const checked = form.sizes.includes(size);
                return (
                  <label
                    key={size}
                    className={[
                      "flex items-center justify-center w-10 h-10 rounded-md border text-sm font-medium cursor-pointer select-none transition-colors",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted",
                      isPending ? "opacity-50 pointer-events-none" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleSize(size)}
                      disabled={isPending}
                      aria-label={`Size ${size}`}
                    />
                    {size}
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Form-level error ───────────────────────────────────────── */}
          {errors.form && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.form}
            </p>
          )}
        </form>

        <DialogFooter className="gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={`edit-product-form-${product.id}`}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────
// A single row in the products table.
//
// Behaviour:
//   • Shows thumbnail (first image or placeholder), title, price/promo,
//     category ID, truncated colors + sizes badges.
//   • ✏ Edit opens an EditProductDialog pre-filled with current data.
//   • 🗑 Delete triggers the delete mutation with optimistic spinner.
// ─────────────────────────────────────────────────────────────────────────────
function ProductRow({ product }) {
  const [editOpen, setEditOpen] = useState(false);

  const { mutate: remove, isPending: isDeleting } = useDeleteProduct();

  function handleDelete() {
    remove(product.id);
  }

  // ── thumbnail ──────────────────────────────────────────────────────────────
  const thumbnail = product.images?.[0] ?? null;

  // ── truncated badges helpers ───────────────────────────────────────────────
  const visibleColors = product.colors.slice(0, MAX_BADGES);
  const extraColors = product.colors.length - MAX_BADGES;

  const visibleSizes = product.sizes.slice(0, MAX_BADGES);
  const extraSizes = product.sizes.length - MAX_BADGES;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow>
      {/* ID */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        #{product.id}
      </TableCell>

      {/* Image */}
      <TableCell className="w-14">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={product.title}
            className="size-10 rounded-md object-cover border border-border"
          />
        ) : (
          <div
            className="size-10 rounded-md bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs"
            aria-label="No image"
          >
            —
          </div>
        )}
      </TableCell>

      {/* Title */}
      <TableCell className="max-w-[180px]">
        <span className="text-sm font-medium line-clamp-1">{product.title}</span>
      </TableCell>

      {/* Price / Promo */}
      <TableCell className="whitespace-nowrap">
        {product.promo ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs line-through text-muted-foreground">{product.price}</span>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{product.promo}</span>
          </div>
        ) : (
          <span className="text-sm font-medium">{product.price}</span>
        )}
      </TableCell>

      {/* Category */}
      <TableCell>
        <Badge variant="secondary" className="font-mono text-xs">
          #{product.categoryId}
        </Badge>
      </TableCell>

      {/* Colors */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {visibleColors.map((color) => (
            <Badge key={color} variant="outline" className="text-xs capitalize">
              {color}
            </Badge>
          ))}
          {extraColors > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{extraColors}
            </Badge>
          )}
          {product.colors.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>

      {/* Sizes */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {visibleSizes.map((size) => (
            <Badge key={size} variant="outline" className="text-xs font-mono">
              {size}
            </Badge>
          ))}
          {extraSizes > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{extraSizes}
            </Badge>
          )}
          {product.sizes.length === 0 && (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 pr-6 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Edit button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            disabled={isDeleting}
            aria-label={`Edit product ${product.title}`}
            title="Edit"
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`Delete product ${product.title}`}
            title={isDeleting ? "Deleting…" : "Delete"}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Edit dialog — rendered here so it stays co-located with the row */}
        <EditProductDialog
          product={product}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </TableCell>
    </TableRow>
  );
}

// ─── ProductTable ─────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one ProductRow per product.
// Lives inside the ProductPannel Card — no extra wrapper border needed.
// ─────────────────────────────────────────────────────────────────────────────
function ProductTable({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No products yet. Add one above to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-b bg-muted/50">
          <TableHead className="w-16 pl-6 text-xs uppercase tracking-wider text-muted-foreground">
            ID
          </TableHead>
          <TableHead className="w-14 text-xs uppercase tracking-wider text-muted-foreground">
            Image
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Price / Promo
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Colors
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Sizes
          </TableHead>
          <TableHead className="w-24 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </TableBody>
    </Table>
  );
}

export default ProductTable;
