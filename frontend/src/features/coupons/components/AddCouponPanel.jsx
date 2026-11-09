import * as React from "react";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { useCreateCoupon } from "@/features/coupons";

// ─── helpers ──────────────────────────────────────────────────────────────────
// code: 4–20 chars, uppercase letters and digits only (API rule)
const CODE_RE = /^[A-Z0-9]{4,20}$/;

function isFutureDate(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(value) > today;
}

const EMPTY_FORM = { code: "", expireDate: "", discountPercentage: "", status: "active" };

// ─── AddCouponPanel ───────────────────────────────────────────────────────────
// A "New Coupon" button that opens a Dialog with the creation form.
// Mirrors the category pattern (inline-within-Panel toolbar) but uses a Dialog
// because coupons have three fields (code, expireDate, status).
// ─────────────────────────────────────────────────────────────────────────────
function AddCouponPanel() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = useCreateCoupon();

  // ── field helpers ──────────────────────────────────────────────────────────
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    const code = form.code.trim().toUpperCase();
    if (!code) {
      next.code = "Coupon code is required.";
    } else if (!CODE_RE.test(code)) {
      next.code =
        "Code must be 4–20 uppercase letters and digits only (e.g. SAVE10).";
    }

    if (!form.expireDate) {
      next.expireDate = "Expiry date is required.";
    } else if (!isFutureDate(form.expireDate)) {
      next.expireDate = "Expiry date must be a future date.";
    }

    const pct = Number(form.discountPercentage);
    if (form.discountPercentage === "" || form.discountPercentage === null) {
      next.discountPercentage = "Discount percentage is required.";
    } else if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
      next.discountPercentage = "Must be a whole number between 1 and 100.";
    }

    if (!form.status) {
      next.status = "Status is required.";
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
        code: form.code.trim().toUpperCase(),
        expireDate: form.expireDate,
        discountPercentage: Number(form.discountPercentage),
        status: form.status,
      },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setErrors({});
          setOpen(false);
        },
        onError: (err) => {
          // Surface server errors (409 duplicate, 400 validation, etc.)
          setErrors({ _server: err?.message ?? "Failed to create coupon." });
        },
      }
    );
  }

  function handleOpenChange(val) {
    if (!val) {
      setForm(EMPTY_FORM);
      setErrors({});
    }
    setOpen(val);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="shrink-0 gap-1.5"
        aria-label="Add new coupon"
      >
        <Plus className="size-4" aria-hidden="true" />
        New Coupon
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>
              Fill in the details below. The code must be 4–20 uppercase letters
              and digits (e.g.&nbsp;<strong>SUMMER25</strong>).
            </DialogDescription>
          </DialogHeader>

          <form
            id="add-coupon-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4 py-2"
          >
            {/* Server-level error */}
            {errors._server && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {errors._server}
              </p>
            )}

            {/* Code */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-code"
                type="text"
                placeholder="e.g. SUMMER25"
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                disabled={isPending}
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? "err-code" : undefined}
                maxLength={20}
                autoComplete="off"
                className="uppercase"
              />
              {errors.code && (
                <p id="err-code" role="alert" className="text-xs text-destructive">
                  {errors.code}
                </p>
              )}
            </div>

            {/* Expire date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-expire">
                Expiry Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-expire"
                type="date"
                value={form.expireDate}
                onChange={(e) => set("expireDate", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.expireDate}
                aria-describedby={errors.expireDate ? "err-expire" : undefined}
                min={new Date().toISOString().split("T")[0]}
              />
              {errors.expireDate && (
                <p
                  id="err-expire"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.expireDate}
                </p>
              )}
            </div>

            {/* Status */}
            {/* Discount Percentage */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-discount">
                Discount % <span className="text-destructive">*</span>
              </Label>
              <Input
                id="coupon-discount"
                type="number"
                placeholder="e.g. 20"
                value={form.discountPercentage}
                onChange={(e) => set("discountPercentage", e.target.value)}
                disabled={isPending}
                aria-invalid={!!errors.discountPercentage}
                aria-describedby={errors.discountPercentage ? "err-discount" : undefined}
                min={1}
                max={100}
                step={1}
              />
              {errors.discountPercentage && (
                <p id="err-discount" role="alert" className="text-xs text-destructive">
                  {errors.discountPercentage}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.status}
                onValueChange={(val) => set("status", val)}
                disabled={isPending}
              >
                <SelectTrigger id="coupon-status" aria-invalid={!!errors.status}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p
                  id="err-status"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.status}
                </p>
              )}
            </div>
          </form>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="add-coupon-form"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddCouponPanel;
