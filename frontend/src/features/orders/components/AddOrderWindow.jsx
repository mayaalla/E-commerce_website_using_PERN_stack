import * as React from "react";
import { useState } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";

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

import { useAddOrder } from "@/features/orders";
import { useGetProducts } from "@/features/products";
import { useGetShippingCompanies } from "@/features/shippings";
import { useGetCommunesByWilaya } from "@/features/communes/hooks/useGetCommunesByWilaya";
import { useGetWilayas } from "@/features/wilaya";

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

// ─── ProductItemRow ───────────────────────────────────────────────────────────
// Isolated row so each item can derive its available colors/sizes from the
// selected product without re-rendering siblings.
// ─────────────────────────────────────────────────────────────────────────────
function ProductItemRow({ item, index, errors, allProducts, onChangeItem, onRemove, canRemove }) {
  // Resolve the full product object for the selected productId
  const selectedProduct = allProducts.find((p) => String(p.id) === String(item.productId)) ?? null;
  const availableColors = selectedProduct?.colors ?? [];
  const availableSizes = selectedProduct?.sizes ?? [];

  function handleProductChange(val) {
    // Reset color & size when product changes so stale values are cleared
    onChangeItem(index, "productId", val);
    onChangeItem(index, "color", "");
    onChangeItem(index, "size", "");
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* ── Product selector ── */}
        <div className="col-span-2 sm:col-span-1 space-y-1">
          <Label className="text-xs">Product</Label>
          <Select
            value={String(item.productId)}
            onValueChange={handleProductChange}
          >
            <SelectTrigger
              className="w-full"
              aria-invalid={!!errors[`products[${index}].productId`]}
            >
              <SelectValue placeholder="Select product…" />
            </SelectTrigger>
            <SelectContent>
              {allProducts.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                  No products found
                </p>
              ) : (
                allProducts.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors[`products[${index}].productId`] && (
            <p className="text-xs text-destructive">
              {errors[`products[${index}].productId`]}
            </p>
          )}
        </div>

        {/* ── Quantity ── */}
        <div className="space-y-1">
          <Label htmlFor={`o-qty-${index}`} className="text-xs">Qty</Label>
          <Input
            id={`o-qty-${index}`}
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onChangeItem(index, "quantity", e.target.value)}
            aria-invalid={!!errors[`products[${index}].quantity`]}
          />
          {errors[`products[${index}].quantity`] && (
            <p className="text-xs text-destructive">
              {errors[`products[${index}].quantity`]}
            </p>
          )}
        </div>

        {/* ── Color selector ── */}
        <div className="space-y-1">
          <Label className="text-xs">Color</Label>
          {availableColors.length > 0 ? (
            <Select
              value={item.color}
              onValueChange={(val) => onChangeItem(index, "color", val)}
              disabled={!selectedProduct}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select color…" />
              </SelectTrigger>
              <SelectContent>
                {availableColors.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`o-color-${index}`}
              placeholder={selectedProduct ? "No colors" : "Pick a product first"}
              value={item.color}
              disabled={!selectedProduct || availableColors.length === 0}
              onChange={(e) => onChangeItem(index, "color", e.target.value)}
              className="disabled:cursor-not-allowed"
            />
          )}
        </div>

        {/* ── Size selector ── */}
        <div className="space-y-1">
          <Label className="text-xs">Size</Label>
          {availableSizes.length > 0 ? (
            <Select
              value={item.size}
              onValueChange={(val) => onChangeItem(index, "size", val)}
              disabled={!selectedProduct}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select size…" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`o-size-${index}`}
              placeholder={selectedProduct ? "No sizes" : "Pick a product first"}
              value={item.size}
              disabled={!selectedProduct || availableSizes.length === 0}
              onChange={(e) => onChangeItem(index, "size", e.target.value)}
              className="disabled:cursor-not-allowed"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AddOrderWindow ───────────────────────────────────────────────────────────
// "New Order" button → Dialog form for placing a customer order.
// Maps to POST /orders (public — no auth required by the API).
// ─────────────────────────────────────────────────────────────────────────────
function AddOrderWindow() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = useAddOrder();

  // ── remote data ────────────────────────────────────────────────────────────
  const { data: productsData, isLoading: productsLoading } = useGetProducts();
  const { data: companiesData, isLoading: companiesLoading } = useGetShippingCompanies();
  const { data: wilayasData, isLoading: wilayasLoading } = useGetWilayas();

  // Only fetch communes once a valid wilaya code is selected from the list
  const wilayaReady = WILAYA_RE.test(form.wilayaCode.trim());
  const { data: communesData, isLoading: communesLoading } = useGetCommunesByWilaya(
    wilayaReady ? form.wilayaCode.trim() : ""
  );

  const allProducts = productsData?.data ?? [];
  const allCompanies = companiesData?.data ?? [];
  const allWilayas = wilayasData?.data ?? [];
  const allCommunes = communesData?.data ?? [];

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

    if (!form.wilayaCode) {
      next.wilayaCode = "Please select a wilaya.";
    }

    if (!form.communeId) {
      next.communeId = "Please select a commune.";
    }

    if (!form.shippingCompanyId) {
      next.shippingCompanyId = "Please select a shipping company.";
    }

    if (form.products.length === 0) {
      next._products = "At least one product is required.";
    }

    form.products.forEach((item, i) => {
      if (!item.productId) {
        next[`products[${i}].productId`] = "Please select a product.";
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

              {/* Wilaya selector */}
              <div className="space-y-1.5">
                <Label>Wilaya</Label>
                <Select
                  value={form.wilayaCode}
                  onValueChange={(val) => {
                    // Reset communeId atomically when wilaya changes
                    setForm((prev) => ({ ...prev, wilayaCode: val, communeId: "" }));
                    if (errors.wilayaCode) setErrors((prev) => ({ ...prev, wilayaCode: "" }));
                    if (errors.communeId) setErrors((prev) => ({ ...prev, communeId: "" }));
                  }}
                  disabled={wilayasLoading}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.wilayaCode}>
                    <SelectValue
                      placeholder={wilayasLoading ? "Loading…" : "Select wilaya…"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {allWilayas.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No wilayas found
                      </p>
                    ) : (
                      allWilayas.map((w) => (
                        <SelectItem key={w.code} value={w.code}>
                          {w.code} — {w.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.wilayaCode && (
                  <p className="text-xs text-destructive">{errors.wilayaCode}</p>
                )}
              </div>

              {/* Commune selector */}
              <div className="space-y-1.5">
                <Label>Commune</Label>
                <Select
                  value={String(form.communeId)}
                  onValueChange={(val) => set("communeId", val)}
                  disabled={!wilayaReady || communesLoading}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.communeId}>
                    <SelectValue
                      placeholder={
                        !wilayaReady
                          ? "Enter wilaya code first…"
                          : communesLoading
                          ? "Loading…"
                          : "Select commune…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {allCommunes.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No communes found for this wilaya
                      </p>
                    ) : (
                      allCommunes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.communeId && (
                  <p className="text-xs text-destructive">{errors.communeId}</p>
                )}
              </div>

              {/* Shipping company selector */}
              <div className="space-y-1.5">
                <Label>Shipping Company</Label>
                <Select
                  value={String(form.shippingCompanyId)}
                  onValueChange={(val) => set("shippingCompanyId", val)}
                  disabled={companiesLoading}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.shippingCompanyId}>
                    <SelectValue
                      placeholder={companiesLoading ? "Loading…" : "Select company…"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {allCompanies.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No shipping companies found
                      </p>
                    ) : (
                      allCompanies.map((co) => (
                        <SelectItem key={co.id} value={String(co.id)}>
                          {co.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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

              {productsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                  <Loader2 className="size-4 animate-spin" />
                  Loading products…
                </div>
              ) : (
                form.products.map((item, i) => (
                  <ProductItemRow
                    key={i}
                    index={i}
                    item={item}
                    errors={errors}
                    allProducts={allProducts}
                    onChangeItem={setItem}
                    onRemove={removeItem}
                    canRemove={form.products.length > 1}
                  />
                ))
              )}
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
