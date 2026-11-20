import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { WILAYAS } from "./AddShippingPricePanel";
import {
  useUpdateShippingPrice,
  useDeleteShippingPrice,
} from "@/features/shippings";

// ─── helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status) {
  if (status === "active") return "default";
  return "secondary";
}

/** Validate price: non-negative, at most 2 decimal places */
function isValidPrice(val) {
  if (val === "" || val === null || val === undefined) return false;
  const n = Number(val);
  if (isNaN(n) || n < 0) return false;
  // At most 2 decimal places
  return /^\d+(\.\d{1,2})?$/.test(String(val).trim());
}

/** Resolve wilaya name from code */
function wilayaName(code) {
  const w = WILAYAS.find((w) => w.code === code);
  return w ? w.name : code;
}

// ─── ShippingPriceRow ─────────────────────────────────────────────────────────
// Inline editing for `price` only. Wilaya code is read-only (displayed as name).
// Same interaction pattern as CategoryRow.
// ─────────────────────────────────────────────────────────────────────────────
function ShippingPriceRow({ price }) {
  const priceInputId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [draftPrice, setDraftPrice] = useState(price.price);
  const [fieldErrors, setFieldErrors] = useState({});
  const priceInputRef = useRef(null);

  const { mutate: update, isPending: isUpdating } = useUpdateShippingPrice();
  const { mutate: remove, isPending: isDeleting } = useDeleteShippingPrice();

  const isDirty = draftPrice !== price.price;
  const isBusy = isUpdating || isDeleting;

  // Focus the input as soon as editing mode opens
  useEffect(() => {
    if (isEditing) {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }
  }, [isEditing]);

  // ── handlers ───────────────────────────────────────────────────────────────
  function handleEditClick() {
    setDraftPrice(price.price);
    setFieldErrors({});
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftPrice(price.price);
    setFieldErrors({});
    setIsEditing(false);
  }

  function handleConfirm() {
    if (!isDirty) return;

    if (!isValidPrice(draftPrice)) {
      setFieldErrors({
        price: "Price must be a non-negative number with at most 2 decimal places.",
      });
      priceInputRef.current?.focus();
      return;
    }

    update(
      { id: price.id, data: { price: draftPrice } },
      {
        onSuccess: () => {
          setIsEditing(false);
          setFieldErrors({});
        },
        onError: (err) => {
          setFieldErrors({
            _server: err?.message ?? "Failed to update. Please try again.",
          });
          priceInputRef.current?.focus();
        },
      }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  }

  function handleDelete() {
    remove(price.id);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow
      data-state={isEditing ? "editing" : undefined}
      className={
        isEditing
          ? "bg-primary/5 dark:bg-primary/10"
          : undefined
      }
    >
      {/* ID */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        #{price.id}
      </TableCell>

      {/* Wilaya — read-only: code + name */}
      <TableCell className="w-48">
        <span className="text-sm font-mono font-medium tabular-nums">
          {price.wilayaCode}
        </span>
        <span className="ml-2 text-sm text-muted-foreground">
          {wilayaName(price.wilayaCode)}
        </span>
      </TableCell>

      {/* Price — inline editable */}
      <TableCell className="w-40">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input
              ref={priceInputRef}
              id={priceInputId}
              type="text"
              inputMode="decimal"
              value={draftPrice}
              onChange={(e) => {
                setDraftPrice(e.target.value);
                if (fieldErrors.price)
                  setFieldErrors((prev) => ({ ...prev, price: "" }));
              }}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit price for wilaya ${price.wilayaCode}`}
              aria-invalid={!!fieldErrors.price}
              aria-describedby={
                fieldErrors.price ? `err-price-${price.id}` : undefined
              }
              placeholder="e.g. 350.00"
              className="h-8 text-sm w-28 tabular-nums"
              autoComplete="off"
            />
            {fieldErrors.price && (
              <p
                id={`err-price-${price.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.price}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm tabular-nums font-medium">
            {price.price}{" "}
            <span className="text-muted-foreground font-normal">DZD</span>
          </span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="w-28">
        <Badge variant={statusVariant(price.status)} className="capitalize">
          {price.status}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="w-32 pr-6 text-right">
        {fieldErrors._server && (
          <p
            role="alert"
            className="mb-1 text-xs text-destructive leading-tight text-left"
          >
            {fieldErrors._server}
          </p>
        )}

        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <>
              {/* Confirm */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleConfirm}
                disabled={!isDirty || isUpdating}
                aria-label={`Confirm edit for price ${price.id}`}
                title={
                  !isDirty
                    ? "Nothing changed"
                    : isUpdating
                    ? "Saving…"
                    : "Save changes"
                }
                className={
                  isDirty && !isUpdating
                    ? "text-primary hover:text-primary hover:bg-primary/10"
                    : "text-muted-foreground/40"
                }
              >
                {isUpdating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
              </Button>

              {/* Cancel */}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCancel}
                disabled={isUpdating}
                aria-label="Cancel editing"
                title="Cancel"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            /* Edit */
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleEditClick}
              disabled={isBusy}
              aria-label={`Edit price for wilaya ${price.wilayaCode}`}
              title="Edit"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
          )}

          {/* Delete — always visible, behind AlertDialog */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label={`Delete price for wilaya ${price.wilayaCode}`}
                title={isDeleting ? "Deleting…" : "Delete"}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete shipping price?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the price entry for wilaya{" "}
                  <strong className="font-mono">{price.wilayaCode}</strong> —{" "}
                  {wilayaName(price.wilayaCode)} ({price.price} DZD). This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── ShippingPriceTable ───────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one ShippingPriceRow per price entry.
// ─────────────────────────────────────────────────────────────────────────────
function ShippingPriceTable({ prices }) {
  if (!prices || prices.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No prices configured for this company yet.
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
          <TableHead className="w-48 text-xs uppercase tracking-wider text-muted-foreground">
            Wilaya
          </TableHead>
          <TableHead className="w-40 text-xs uppercase tracking-wider text-muted-foreground">
            Price (DZD)
          </TableHead>
          <TableHead className="w-28 text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="w-32 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {prices.map((price) => (
          <ShippingPriceRow key={price.id} price={price} />
        ))}
      </TableBody>
    </Table>
  );
}

export default ShippingPriceTable;
