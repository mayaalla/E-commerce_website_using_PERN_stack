import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductDetail } from "@/components/product-detail";
import { ApiError } from "@/lib/api";
import {
  getStorefrontProduct,
  getStorefrontProductStock,
} from "@/lib/storefront-products";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Loading strategy — two independent Suspense zones:
 *
 * Zone 1 › <ProductBreadcrumb> — streams as soon as `params` resolves and
 *   the product title is fetched.  Shows a slim skeleton while pending.
 *
 * Zone 2 › <ProductContent> — streams the full detail panel (image carousel +
 *   info + CTA).  Its skeleton mirrors the real 12-col grid so there is no
 *   layout shift when content arrives.
 *
 * Both zones share the same underlying fetch (React deduplicates per request),
 * so only one round-trip goes out.  The file-level loading.tsx handles the
 * initial hard-navigation before this component even mounts.
 */
export default function ProductPage({ params }: ProductPageProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      {/* Zone 1 — breadcrumb, resolves quickly once params + product title arrive */}
      <Suspense fallback={<BreadcrumbSkeleton />}>
        <ProductBreadcrumb params={params} />
      </Suspense>

      {/* Zone 2 — image carousel + info panel + actions */}
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </section>
  );
}

/* ─────────────────────── Zone 1: Breadcrumb ──────────────────── */

async function ProductBreadcrumb({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isSafeInteger(productId) || productId < 1) return null;

  try {
    const product = await getStorefrontProduct(productId);
    return (
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted-foreground sm:mb-8">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className="underline-offset-4 hover:text-foreground hover:underline">
              Produits
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-48 truncate text-foreground sm:max-w-none">
            {product.title}
          </li>
        </ol>
      </nav>
    );
  } catch {
    // Non-critical — show nothing if the breadcrumb fetch fails independently
    return null;
  }
}

/* ─────────────────────── Zone 2: Product detail ─────────────── */

async function ProductContent({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isSafeInteger(productId) || productId < 1) notFound();

  const [productResult, stockResult] = await Promise.all([
    getStorefrontProduct(productId).then(
      (product) => ({ ok: true as const, product }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    getStorefrontProductStock(productId).then(
      (stockRows) => ({ ok: true as const, stockRows }),
      () => ({ ok: false as const }),
    ),
  ]);

  if (!productResult.ok) {
    if (productResult.error instanceof ApiError && productResult.error.status === 404) {
      notFound();
    }
    return (
      <div className="py-8">
        <h1 className="text-2xl font-medium tracking-tight">
          Impossible de charger ce produit
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          Vérifiez votre connexion, puis réessayez. Vous pouvez toujours parcourir
          toute la collection.
        </p>
        <Button className="mt-8 h-12 rounded-none px-6" render={<Link href="/products" />}>
          Voir les produits
        </Button>
      </div>
    );
  }

  return (
    <ProductDetail
      product={productResult.product}
      stockRows={stockResult.ok ? stockResult.stockRows : null}
    />
  );
}

/* ─────────────────────────── Skeletons ───────────────────────── */

function BreadcrumbSkeleton() {
  return <Skeleton className="mb-6 h-4 w-40 rounded-none sm:mb-8" aria-hidden="true" />;
}

function ProductDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du produit"
      className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12"
    >
      {/* Image column */}
      <div className="min-w-0 lg:col-span-7">
        <Skeleton className="aspect-[4/5] w-full rounded-none" />
        <div className="mt-4 grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-none" />
          ))}
        </div>
      </div>

      {/* Info column */}
      <div className="min-w-0 space-y-5 lg:col-span-5" aria-hidden="true">
        <Skeleton className="h-10 w-4/5 rounded-none" />
        <Skeleton className="h-8 w-28 rounded-none" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-full rounded-none" />
          <Skeleton className="h-4 w-5/6 rounded-none" />
          <Skeleton className="h-4 w-3/4 rounded-none" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-20 rounded-none" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-8 rounded-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-none" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 rounded-none" />
            ))}
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
        <span className="sr-only">Chargement des détails du produit…</span>
      </div>
    </div>
  );
}
