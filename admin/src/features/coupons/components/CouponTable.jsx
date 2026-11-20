import * as React from "react";
import { useState, useRef, useEffect, useId } from "react";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { useUpdateCoupon, useDeleteCoupon } from "@/features/coupons";

// ─── helpers ──────────────────────────────────────────────────────────────────
const CODE_RE = /^[A-Z0-9]{4,20}$/;

function isFutureDate(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value) > today;
}

/** Badge colour by status */
function statusVariant(status) {
  if (status === "active") return "default";   // green-ish (primary)
  if (status === "inactive") return "secondary";
  return "destructive"; // expired
}

/** Format "YYYY-MM-DD" → "DD / MM / YYYY" for display */
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d} / ${m} / ${y}`;
}

// ─── CouponRow ────────────────────────────────────────────────────────────────
// A single row in the coupons table.
//
// Behaviour:
//   • Displays id, code, expireDate, status as plain cells by default.
//   • Clicking ✏ Edit activates an inline edit form for all three fields.
//   • ✓ Confirm is only enabled when at least one field changed and passes
//     client-side validation rules (mirrors the API: code 4-20 A-Z0-9,
//     expireDate future date, status active|inactive|expired).
//   • 🗑 Delete opens an AlertDialog to confirm before firing the mutation.
// ─────────────────────────────────────────────────────────────────────────────
function CouponRow({ coupon }) {
  const codeInputId = useId();

  // ── local state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    code: coupon.code,
    expireDate: coupon.expireDate,
    discountPercentage: String(coupon.discountPercentage),
    status: coupon.status,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const codeInputRef = useRef(null);

  const { mutate: update, isPending: isUpdating } = useUpdateCoupon();
  const { mutate: remove, isPending: isDeleting } = useDeleteCoupon();

  const isDirty =
    draft.code.trim().toUpperCase() !== coupon.code ||
    draft.expireDate !== coupon.expireDate ||
    Number(draft.discountPercentage) !== coupon.discountPercentage ||
    draft.status !== coupon.status;

  const isBusy = isUpdating || isDeleting;

  // Focus code input when edit mode opens
  useEffect(() => {
    if (isEditing) {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    }
  }, [isEditing]);

  // ── handlers ───────────────────────────────────────────────────────────────
  function handleEditClick() {
    setDraft({ code: coupon.code, expireDate: coupon.expireDate, discountPercentage: String(coupon.discountPercentage), status: coupon.status });
    setFieldErrors({});
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft({ code: coupon.code, expireDate: coupon.expireDate, discountPercentage: String(coupon.discountPercentage), status: coupon.status });
    setFieldErrors({});
    setIsEditing(false);
  }

  function setField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate() {
    const next = {};
    const code = draft.code.trim().toUpperCase();

    if (!code) {
      next.code = "Code cannot be empty.";
    } else if (!CODE_RE.test(code)) {
      next.code = "Must be 4–20 uppercase letters and digits.";
    }

    if (!draft.expireDate) {
      next.expireDate = "Expiry date is required.";
    } else if (!isFutureDate(draft.expireDate)) {
      next.expireDate = "Must be a future date.";
    }

    const pct = Number(draft.discountPercentage);
    if (draft.discountPercentage === "" || draft.discountPercentage === null) {
      next.discountPercentage = "Discount percentage is required.";
    } else if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      next.discountPercentage = "Must be a whole number between 1 and 100.";
    }

    if (!draft.status) {
      next.status = "Status is required.";
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleConfirm() {
    if (!isDirty) return;
    if (!validate()) {
      codeInputRef.current?.focus();
      return;
    }

    update(
      {
        id: coupon.id,
        data: {
          code: draft.code.trim().toUpperCase(),
          expireDate: draft.expireDate,
          discountPercentage: Number(draft.discountPercentage),
          status: draft.status,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setFieldErrors({});
        },
        onError: (err) => {
          setFieldErrors({
            _server: err?.message ?? "Failed to update. Please try again.",
          });
          codeInputRef.current?.focus();
        },
      }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  }

  function handleDelete() {
    remove(coupon.id);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <TableRow
      data-state={isEditing ? "editing" : undefined}
      className={isEditing ? "bg-primary/5 dark:bg-primary/10 align-top" : "align-middle"}
    >
      {/* ID */}
      <TableCell className="w-16 pl-6 text-muted-foreground font-mono text-xs select-none">
        #{coupon.id}
      </TableCell>

      {/* Code */}
      <TableCell className="max-w-[10rem]">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input
              ref={codeInputRef}
              id={codeInputId}
              type="text"
              value={draft.code}
              onChange={(e) => setField("code", e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit code for coupon ${coupon.id}`}
              aria-invalid={!!fieldErrors.code}
              aria-describedby={fieldErrors.code ? `err-code-${coupon.id}` : undefined}
              maxLength={20}
              className="h-8 text-sm uppercase font-mono"
              autoComplete="off"
            />
            {fieldErrors.code && (
              <p
                id={`err-code-${coupon.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.code}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm font-mono font-semibold tracking-wide">
            {coupon.code}
          </span>
        )}
      </TableCell>

      {/* Expire Date */}
      <TableCell className="max-w-[10rem]">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input
              type="date"
              value={draft.expireDate}
              onChange={(e) => setField("expireDate", e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit expiry date for coupon ${coupon.id}`}
              aria-invalid={!!fieldErrors.expireDate}
              aria-describedby={fieldErrors.expireDate ? `err-exp-${coupon.id}` : undefined}
              min={new Date().toISOString().split("T")[0]}
              className="h-8 text-sm"
            />
            {fieldErrors.expireDate && (
              <p
                id={`err-exp-${coupon.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.expireDate}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm tabular-nums">{fmtDate(coupon.expireDate)}</span>
        )}
      </TableCell>

      {/* Discount % */}
      <TableCell className="w-24">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Input
              type="number"
              value={draft.discountPercentage}
              onChange={(e) => setField("discountPercentage", e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isUpdating}
              aria-label={`Edit discount percentage for coupon ${coupon.id}`}
              aria-invalid={!!fieldErrors.discountPercentage}
              aria-describedby={fieldErrors.discountPercentage ? `err-pct-${coupon.id}` : undefined}
              min={1}
              max={100}
              step={1}
              className="h-8 text-sm w-20"
            />
            {fieldErrors.discountPercentage && (
              <p
                id={`err-pct-${coupon.id}`}
                role="alert"
                className="text-xs text-destructive leading-tight"
              >
                {fieldErrors.discountPercentage}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm tabular-nums font-medium">
            {coupon.discountPercentage}%
          </span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="w-32">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Select
              value={draft.status}
              onValueChange={(val) => setField("status", val)}
              disabled={isUpdating}
            >
              <SelectTrigger
                className="h-8 text-sm"
                aria-label={`Edit status for coupon ${coupon.id}`}
                aria-invalid={!!fieldErrors.status}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            {fieldErrors.status && (
              <p role="alert" className="text-xs text-destructive leading-tight">
                {fieldErrors.status}
              </p>
            )}
          </div>
        ) : (
          <Badge variant={statusVariant(coupon.status)} className="capitalize">
            {coupon.status}
          </Badge>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-28 pr-6 text-right">
        {/* Server error spanning full row */}
        {fieldErrors._server && (
          <p role="alert" className="mb-1 text-xs text-destructive leading-tight text-left">
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
                aria-label={`Confirm edit for coupon ${coupon.id}`}
                title={
                  !isDirty ? "Nothing changed" : isUpdating ? "Saving…" : "Save changes"
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
              aria-label={`Edit coupon ${coupon.code}`}
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
                aria-label={`Delete coupon ${coupon.code}`}
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
                <AlertDialogTitle>Delete coupon?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to permanently delete coupon{" "}
                  <strong className="font-mono">{coupon.code}</strong>. This
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

// ─── CouponTable ──────────────────────────────────────────────────────────────
// Renders the full shadcn/ui Table with one CouponRow per coupon.
// Lives inside the CouponPanel Card — no extra wrapper border needed.
// ─────────────────────────────────────────────────────────────────────────────
function CouponTable({ coupons }) {
  if (!coupons || coupons.length === 0) {
    return (
      <div className="border-t border-dashed border-border bg-muted/20 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No coupons yet. Create one above to get started.
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
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Code
          </TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
            Expires
          </TableHead>
          <TableHead className="w-24 text-xs uppercase tracking-wider text-muted-foreground">
            Discount %
          </TableHead>
          <TableHead className="w-32 text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </TableHead>
          <TableHead className="w-28 pr-6 text-right text-xs uppercase tracking-wider text-muted-foreground">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {coupons.map((coupon) => (
          <CouponRow key={coupon.id} coupon={coupon} />
        ))}
      </TableBody>
    </Table>
  );
}

export default CouponTable;
