import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  productsApi,
  shippingApi,
  wilayasApi,
  type Product,
  type ProductStock,
  type ShippingCompany,
  type Wilaya,
} from "@/lib/api";

export const metadata: Metadata = {
  title: "Commande avec paiement à la livraison | MayaStore",
  description: "Commandez chez MayaStore et payez à la livraison.",
};

type CheckoutPageProps = {
  searchParams: Promise<{
    productId?: string | string[];
    size?: string | string[];
    color?: string | string[];
    colorHex?: string | string[];
    quantity?: string | string[];
  }>;
};

/**
 * Loading strategy — two independent Suspense zones:
 *
 * Zone 1 › <CheckoutFormData> — deferred zone that fetches wilayas, shipping
 *   companies and optionally a direct-buy product, then renders <CheckoutForm>.
 *   Shows a two-column form skeleton while pending.
 *
 * Zone 2 (implicit, inside CheckoutForm) — commune list and shipping price are
 *   loaded client-side on demand (wilaya / company selection), so they use
 *   React state + inline loading indicators — not Suspense.
 *
 * The file-level loading.tsx covers the initial hard-navigation.  The Suspense
 * boundary here takes over for client-side route transitions.
 */
export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  return (
    <Suspense fallback={<CheckoutFormSkeleton />}>
      <CheckoutFormData searchParams={searchParams} />
    </Suspense>
  );
}

/* ─────────────────── Async data layer ───────────────────────── */

async function CheckoutFormData({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const rawProductId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId;
  const requestedSize = Array.isArray(params.size) ? params.size[0] : params.size;
  const requestedColor = Array.isArray(params.color) ? params.color[0] : params.color;
  const requestedColorHex = Array.isArray(params.colorHex)
    ? params.colorHex[0]
    : params.colorHex;
  const rawQuantity = Array.isArray(params.quantity)
    ? params.quantity[0]
    : params.quantity;
  const parsedQuantity = rawQuantity ? Number(rawQuantity) : 1;
  const requestedQuantity =
    Number.isSafeInteger(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
  const parsedProductId = rawProductId ? Number(rawProductId) : null;
  const productId =
    parsedProductId !== null &&
    Number.isSafeInteger(parsedProductId) &&
    parsedProductId > 0
      ? parsedProductId
      : null;
  const invalidProductId = rawProductId !== undefined && productId === null;

  const [wilayasResult, companiesResult, productResult, productStockResult] = await Promise.all([
    wilayasApi.getAll().then(
      (wilayas) => ({ wilayas, error: false }),
      () => ({ wilayas: [] as Wilaya[], error: true }),
    ),
    shippingApi.getCompanies().then(
      (companies) => ({
        companies: companies.filter((company) => company.status === "active"),
        error: false,
      }),
      () => ({ companies: [] as ShippingCompany[], error: true }),
    ),
    productId
      ? productsApi.getById(productId).then(
          (product) => ({ product, error: false }),
          () => ({ product: null as Product | null, error: true }),
        )
      : Promise.resolve({ product: null as Product | null, error: false }),
    productId
      ? productsApi.getStock(productId).then(
          (stockRows) => ({ stockRows, error: false }),
          () => ({ stockRows: null as ProductStock[] | null, error: true }),
        )
      : Promise.resolve({ stockRows: null as ProductStock[] | null, error: false }),
  ]);

  const productError = invalidProductId || productResult.error || undefined;
  const directProduct = productResult.product;
  const directProductStock = productStockResult.stockRows;
  const requestedColorValue = requestedColorHex ?? requestedColor;
  const normalizedRequestedHex = requestedColorValue
    ?.trim()
    .replace(/^#/, "")
    .toUpperCase();
  const initialSelectedColor = directProduct?.colors.find(
    (color) =>
      color.hex === normalizedRequestedHex ||
      color.name.toLocaleLowerCase() === requestedColorValue?.trim().toLocaleLowerCase(),
  )?.hex ?? "";
  const initialSelectedSize = directProduct?.sizes.includes(requestedSize ?? "")
    ? requestedSize!
    : "";
  const availableQuantity =
    directProductStock === null
      ? null
      : directProductStock
          .filter(
            (row) =>
              (!initialSelectedColor || row.colorHex === initialSelectedColor) &&
              (!initialSelectedSize || row.size === initialSelectedSize),
          )
          .reduce((total, row) => total + row.stock, 0);
  const initialQuantity =
    availableQuantity !== null && availableQuantity > 0
      ? Math.min(requestedQuantity, availableQuantity)
      : requestedQuantity;

  if (wilayasResult.error && companiesResult.error) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h1 className="text-3xl font-medium tracking-tight">
          La commande est temporairement indisponible
        </h1>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
          Impossible de charger les wilayas ou les sociétés de livraison. Veuillez réessayer.
        </p>
        <Button className="mt-8 h-12 rounded-none px-6" render={<Link href="/checkout" />}>
          Réessayer
        </Button>
      </section>
    );
  }

  return (
    <CheckoutForm
      directProduct={directProduct}
      directProductStock={directProductStock}
      directProductError={productError}
      initialSelectedSize={initialSelectedSize}
      initialSelectedColor={initialSelectedColor}
      initialQuantity={directProduct ? initialQuantity : 1}
      initialWilayas={wilayasResult.wilayas}
      initialCompanies={companiesResult.companies}
      initialDataError={wilayasResult.error || companiesResult.error}
    />
  );
}

/* ─────────────────────────── Skeleton ───────────────────────── */

/**
 * Two-column skeleton that mirrors the real CheckoutForm layout.
 * Left column: shipping form fields.  Right column: order summary panel.
 */
function CheckoutFormSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de la commande"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      {/* Back button placeholder */}
      <Skeleton className="mb-6 h-10 w-40 rounded-none" />

      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        {/* ── Left column: form ── */}
        <div className="space-y-10 lg:col-span-7">
          {/* Page title */}
          <div className="space-y-2">
            <Skeleton className="h-9 w-72 rounded-none" />
            <Skeleton className="h-5 w-96 max-w-full rounded-none" />
          </div>

          {/* Contact fieldset */}
          <div className="space-y-5">
            <Skeleton className="h-6 w-36 rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>

          {/* Shipping address fieldset */}
          <div className="space-y-5">
            <Skeleton className="h-6 w-44 rounded-none" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded-none" />
                <Skeleton className="h-12 w-full rounded-none" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded-none" />
                <Skeleton className="h-12 w-full rounded-none" />
              </div>
            </div>
          </div>

          {/* Shipping company fieldset */}
          <div className="space-y-5">
            <Skeleton className="h-6 w-44 rounded-none" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
          </div>

          {/* Submit button */}
          <Skeleton className="h-12 w-full rounded-none sm:w-64" />
        </div>

        {/* ── Right column: order summary ── */}
        <div className="space-y-5 border-y border-border py-6 lg:col-span-5 lg:p-6">
          <Skeleton className="h-6 w-36 rounded-none" />

          <div className="flex gap-4 pt-1">
            <Skeleton className="size-20 shrink-0 rounded-none sm:size-24" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded-none" />
              <Skeleton className="h-4 w-1/2 rounded-none" />
              <Skeleton className="h-4 w-20 rounded-none" />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-4 w-16 rounded-none" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-4 w-16 rounded-none" />
            </div>
            <div className="flex justify-between pt-2">
              <Skeleton className="h-5 w-12 rounded-none" />
              <Skeleton className="h-5 w-24 rounded-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
