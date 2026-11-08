import * as React from "react";
import { useState, useEffect } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";

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
  DialogTrigger,
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

// ─── EditProductDialog ────────────────────────────────────────────────────────
// Dialog that lets the user edit a product's fields.
// Only submits fields that actually changed (dirty check).
// ─────────────────────────────────────────────────────────────────────────────
function buildInitialForm(product) {
  return {
    title: product.title,
    description: product.description,
    price: product.price,
    promo: product.promo ?? "",
    categoryId: String(product.categoryId),
    colors: product.colors.join(", "),
    sizes: [...product.sizes],
  };
}

function EditProductDialog({ product, open, onOpenChange }) {
  const { data: categoriesData } = useGetCategories();
  const categories = categoriesData?.data ?? [];

  // Initialise draft from current product values
  const [form, setForm] = useState(() => buildInitialForm(product));
  const [errors, setErrors] = useState({});

  // Re-sync form state whenever the dialog is opened (or product data changes),
  // so that re-opening the dialog after a save always shows fresh data.
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(product));
      setErrors({});
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

  // ── dirty check: only send changed fields ──────────────────────────────────
  function buildPayload() {
    const payload = {};

    if (form.title.trim() !== product.title) payload.title = form.title.trim();
    if (form.description.trim() !== product.description) payload.description = form.description.trim();
    if (form.price.trim() !== product.price) payload.price = form.price.trim();

    const promoVal = form.promo.trim() === "" ? null : form.promo.trim();
    if (promoVal !== product.promo) payload.promo = promoVal;

    const catId = parseInt(form.categoryId, 10);
    if (catId !== product.categoryId) payload.categoryId = catId;

    const colors = form.colors.split(",").map((c) => c.trim()).filter(Boolean);
    if (JSON.stringify(colors) !== JSON.stringify(product.colors)) payload.colors = colors;

    const sortedDraft = [...form.sizes].sort();
    const sortedOrig = [...product.sizes].sort();
    if (JSON.stringify(sortedDraft) !== JSON.stringify(sortedOrig)) payload.sizes = form.sizes;

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
            <Label htmlFor={`ep-title-${product.id}`}>Title <span className="text-destructive">*</span></Label>
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
            <Label htmlFor={`ep-desc-${product.id}`}>Description <span className="text-destructive">*</span></Label>
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
              <Label htmlFor={`ep-price-${product.id}`}>Price <span className="text-destructive">*</span></Label>
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
              <Label htmlFor={`ep-promo-${product.id}`}>Promo Price <span className="text-muted-foreground text-xs">(optional)</span></Label>
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
            <Label htmlFor={`ep-category-${product.id}`}>Category <span className="text-destructive">*</span></Label>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ep-colors-${product.id}`}>Colors (comma-separated)</Label>
            <Input
              id={`ep-colors-${product.id}`}
              type="text"
              value={form.colors}
              onChange={(e) => setField("colors", e.target.value)}
              disabled={isPending}
              autoComplete="off"
            />
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
