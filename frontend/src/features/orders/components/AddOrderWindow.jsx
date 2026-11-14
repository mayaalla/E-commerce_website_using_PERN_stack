import * as React from "react";
import { useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { useAddOrder } from "@/features/orders";

// ─── constants ────────────────────────────────────────────────────────────────
const PHONE_RE = /^0\d{9}$/;
const WILAYA_RE = /^\d{2}$/;

const EMPTY_ITEM = { productId: "", quantity: 1, color: "", size: "" };
const EMPTY_FORM = {
  name: "",
  phoneNumber: "",
  wilayaCode: "",
  communeId: "",
  shippingCompanyId: "",
  couponCode: "",
  products: [{ ...EMPTY_ITEM }],
};

// ─── AddOrderWindow ───────────────────────────────────────────────────────────
// "New Order" button → Dialog form for placing a customer order.
// Maps to POST /orders (public — no auth required by the API).
// ─────────────────────────────────────────────────────────────────────────────
function AddOrderWindow() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = useAddOrder();

  // ── field helpers ──────────────────────────────────────────────────────────
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function setItem(index, field, value) {
    setForm((prev) => {
      const products = prev.products.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      return { ...prev, products };
    });
    const key = `products[${index}].${field}`;
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, products: [...prev.products, { ...EMPTY_ITEM }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate() {
    const next = {};

    if (!form.name.trim()) next.name = "Customer name is required.";

    if (!form.phoneNumber.trim()) {
      next.phoneNumber = "Phone number is required.";
    } else if (!PHONE_RE.test(form.phoneNumber.trim())) {
      next.phoneNumber = "Must be 10 digits starting with 0 (e.g. 0555123456).";
    }

    if (!form.wilayaCode.trim()) {
      next.wilayaCode = "Wilaya code is required.";
    } else if (!WILAYA_RE.test(form.wilayaCode.trim())) {
      next.wilayaCode = "Must be exactly 2 digits (e.g. 16).";
    }

    const communeId = Number(form.communeId);
    if (!form.communeId) {
      next.communeId = "Commune ID is required.";
    } else if (!Number.isInteger(communeId) || communeId <= 0) {
      next.communeId = "Must be a positive integer.";
    }

    const companyId = Number(form.shippingCompanyId);
    if (!form.shippingCompanyId) {
      next.shippingCompanyId = "Shipping company ID is required.";
    } else if (!Number.isInteger(companyId) || companyId <= 0) {
      next.shippingCompanyId = "Must be a positive integer.";
    }

    if (form.products.length === 0) {
      next._products = "At least one product is required.";
    }

    form.products.forEach((item, i) => {
      const pid = Number(item.productId);
      if (!item.productId) {
        next[`products[${i}].productId`] = "Product ID is required.";
      } else if (!Number.isInteger(pid) || pid <= 0) {
        next[`products[${i}].productId`] = "Must be a positive integer.";
      }

      const qty = Number(item.quantity);
      if (!item.quantity || !Number.isInteger(qty) || qty <= 0) {
        next[`products[${i}].quantity`] = "Quantity must be at least 1.";
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.trim(),
      wilayaCode: form.wilayaCode.trim(),
      communeId: Number(form.communeId),
      shippingCompanyId: Number(form.shippingCompanyId),
      products: form.products.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        ...(item.color.trim() && { color: item.color.trim() }),
        ...(item.size.trim() && { size: item.size.trim() }),
      })),
      ...(form.couponCode.trim() && { couponCode: form.couponCode.trim().toUpperCase() }),
    };

    mutate(payload, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setOpen(false);
      },
      onError: (err) => {
        setErrors({ _server: err?.message ?? "Failed to place order." });
      },
    });
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
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        New Order
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
            <DialogDescription>
              Fill in the customer details and products. Total is computed server-side.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Server error */}
            {errors._server && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errors._server}
              </p>
            )}

            {/* ── Customer info ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="o-name">Customer Name</Label>
                <Input
                  id="o-name"
                  placeholder="Amira Benali"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="o-phone">Phone Number</Label>
                <Input
                  id="o-phone"
                  placeholder="0555123456"
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  aria-invalid={!!errors.phoneNumber}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-destructive">{errors.phoneNumber}</p>
                )}
              </div>

              {/* Wilaya code */}
              <div className="space-y-1.5">
                <Label htmlFor="o-wilaya">Wilaya Code</Label>
                <Input
                  id="o-wilaya"
                  placeholder="16"
                  maxLength={2}
                  value={form.wilayaCode}
                  onChange={(e) => set("wilayaCode", e.target.value)}
                  aria-invalid={!!errors.wilayaCode}
                />
                {errors.wilayaCode && (
                  <p className="text-xs text-destructive">{errors.wilayaCode}</p>
                )}
              </div>

              {/* Commune ID */}
              <div className="space-y-1.5">
                <Label htmlFor="o-commune">Commune ID</Label>
                <Input
                  id="o-commune"
                  type="number"
                  min={1}
                  placeholder="3"
                  value={form.communeId}
                  onChange={(e) => set("communeId", e.target.value)}
                  aria-invalid={!!errors.communeId}
                />
                {errors.communeId && (
                  <p className="text-xs text-destructive">{errors.communeId}</p>
                )}
              </div>

              {/* Shipping company ID */}
              <div className="space-y-1.5">
                <Label htmlFor="o-company">Shipping Company ID</Label>
                <Input
                  id="o-company"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={form.shippingCompanyId}
                  onChange={(e) => set("shippingCompanyId", e.target.value)}
                  aria-invalid={!!errors.shippingCompanyId}
                />
                {errors.shippingCompanyId && (
                  <p className="text-xs text-destructive">{errors.shippingCompanyId}</p>
                )}
              </div>

              {/* Coupon */}
              <div className="space-y-1.5">
                <Label htmlFor="o-coupon">Coupon Code (optional)</Label>
                <Input
                  id="o-coupon"
                  placeholder="SUMMER25"
                  value={form.couponCode}
                  onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* ── Products ──────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-3.5" />
                  Add Item
                </Button>
              </div>

              {errors._products && (
                <p className="text-xs text-destructive">{errors._products}</p>
              )}

              {form.products.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/30 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item {i + 1}
                    </span>
                    {form.products.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(i)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove item ${i + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Product ID */}
                    <div className="col-span-2 sm:col-span-1 space-y-1">
                      <Label htmlFor={`o-pid-${i}`} className="text-xs">Product ID</Label>
                      <Input
                        id={`o-pid-${i}`}
                        type="number"
                        min={1}
                        placeholder="10"
                        value={item.productId}
                        onChange={(e) => setItem(i, "productId", e.target.value)}
                        aria-invalid={!!errors[`products[${i}].productId`]}
                      />
                      {errors[`products[${i}].productId`] && (
                        <p className="text-xs text-destructive">
                          {errors[`products[${i}].productId`]}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label htmlFor={`o-qty-${i}`} className="text-xs">Qty</Label>
                      <Input
                        id={`o-qty-${i}`}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => setItem(i, "quantity", e.target.value)}
                        aria-invalid={!!errors[`products[${i}].quantity`]}
                      />
                      {errors[`products[${i}].quantity`] && (
                        <p className="text-xs text-destructive">
                          {errors[`products[${i}].quantity`]}
                        </p>
                      )}
                    </div>

                    {/* Color */}
                    <div className="space-y-1">
                      <Label htmlFor={`o-color-${i}`} className="text-xs">Color</Label>
                      <Input
                        id={`o-color-${i}`}
                        placeholder="red"
                        value={item.color}
                        onChange={(e) => setItem(i, "color", e.target.value)}
                      />
                    </div>

                    {/* Size */}
                    <div className="space-y-1">
                      <Label htmlFor={`o-size-${i}`} className="text-xs">Size</Label>
                      <Input
                        id={`o-size-${i}`}
                        placeholder="40"
                        value={item.size}
                        onChange={(e) => setItem(i, "size", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isPending ? "Placing…" : "Place Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddOrderWindow;
