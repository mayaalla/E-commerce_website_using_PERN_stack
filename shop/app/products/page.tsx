import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ProductCatalog } from "@/components/product-catalog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesApi, type Category } from "@/lib/api";
import { getStorefrontProducts } from "@/lib/storefront-products";

export const metadata: Metadata = {
  title: "Tous les produits | MayaStore",
  description: "Parcourez, recherchez et filtrez la collection MayaStore.",
};

/**
 * Loading strategy:
 * - Static header renders immediately with no data fetch.
 * - ProductsContent streams in via Suspense once products + categories resolve.
 * - CatalogSkeleton mirrors the new sidebar + grid layout.
 */
export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ProductsContent />
    </Suspense>
  );
}

/** Fetches products + categories in parallel then hands off to the client catalog. */
async function ProductsContent() {
  const [productsResult, categoriesResult] = await Promise.all([
    getStorefrontProducts().then(
      (products) => ({ ok: true as const, products }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    categoriesApi.getAll().then(
      (categories) => ({ ok: true as const, categories }),
      () => ({ ok: false as const, categories: [] as Category[] }),
    ),
  ]);

  if (!productsResult.ok) {
    return (
      <div className="py-16">
        <h2 className="text-2xl font-medium tracking-tight">
          Impossible de charger les produits
        </h2>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
          Vérifiez votre connexion, puis réessayez.
        </p>
        <Button
          className="mt-8 h-12 rounded-none px-6"
          render={<Link href="/products" />}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const categories = categoriesResult.ok ? categoriesResult.categories : [];
  return <ProductCatalog products={productsResult.products} categories={categories} />;
}

/** Skeleton for the filter bar + product grid — shown while ProductsContent is pending. */
function CatalogSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      {/* Header skeleton */}
      <div className="border-b border-border pb-8 sm:pb-10" aria-hidden="true">
        <Skeleton className="h-9 w-56 rounded-none sm:h-10" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-none" />
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-wrap items-center gap-3 border-b border-border pb-5" aria-hidden="true">
        <Skeleton className="h-10 flex-1 basis-56 rounded-none" />
        <Skeleton className="h-10 w-44 rounded-none" />
        <Skeleton className="h-10 w-20 rounded-none" />
      </div>

      {/* Layout */}
      <div className="mt-6 flex gap-10">
        {/* Sidebar */}
        <div className="hidden w-56 shrink-0 flex-col gap-4 lg:flex" aria-hidden="true">
          <Skeleton className="h-5 w-24 rounded-none" />
          <Skeleton className="h-px w-full rounded-none" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-none" />
          ))}
        </div>

        {/* Product grid */}
        <ul
          aria-busy="true"
          aria-label="Chargement des produits"
          className="flex-1 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-8"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-square w-full rounded-none" />
              <Skeleton className="mt-4 h-4 w-3/4 rounded-none" />
              <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
