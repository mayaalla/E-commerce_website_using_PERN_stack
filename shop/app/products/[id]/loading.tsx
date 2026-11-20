/**
 * /products/[id] — route-segment loading UI.
 *
 * Rendered instantly while the product detail Server Component awaits its
 * API call. Mirrors the real layout so the user sees a stable, content-
 * shaped skeleton rather than a blank or spinner-only screen.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement du produit"
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16"
    >
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-40 rounded-none" />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Product image */}
        <Skeleton className="aspect-[4/5] w-full rounded-none lg:col-span-7" />

        {/* Product info panel */}
        <div className="space-y-5 lg:col-span-5">
          <Skeleton className="h-10 w-4/5 rounded-none" />
          <Skeleton className="h-8 w-28 rounded-none" />

          {/* Description lines */}
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full rounded-none" />
            <Skeleton className="h-4 w-5/6 rounded-none" />
            <Skeleton className="h-4 w-3/4 rounded-none" />
          </div>

          {/* Color swatches */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-20 rounded-none" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="size-8 rounded-full" />
              ))}
            </div>
          </div>

          {/* Size buttons */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded-none" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 rounded-none" />
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <Skeleton className="h-12 w-full rounded-none" />
          <Skeleton className="h-12 w-full rounded-none" />
        </div>
      </div>

      <span className="sr-only">Chargement des détails du produit…</span>
    </section>
  );
}
