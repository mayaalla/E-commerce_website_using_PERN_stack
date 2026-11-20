/**
 * /checkout — route-segment loading UI.
 *
 * Shown while the server fetches wilayas, shipping companies, and optionally
 * the direct-buy product — all in parallel. The skeleton reflects the real
 * two-column form layout so there is no jarring layout shift on load.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de la commande"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      {/* Page title */}
      <Skeleton className="h-9 w-56 rounded-none" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-none" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Left — shipping form */}
        <div className="space-y-6">
          {/* Section heading */}
          <Skeleton className="h-6 w-44 rounded-none" />

          {/* Name row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>

          {/* Wilaya / Commune */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-12 w-full rounded-none" />
            </div>
          </div>

          {/* Shipping company */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-none" />
            <Skeleton className="h-24 w-full rounded-none" />
          </div>
        </div>

        {/* Right — order summary */}
        <div className="space-y-5 rounded-none border border-border p-6">
          <Skeleton className="h-6 w-36 rounded-none" />

          <div className="space-y-4 pt-1">
            <div className="flex gap-4">
              <Skeleton className="size-20 shrink-0 rounded-none" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-none" />
                <Skeleton className="h-4 w-1/2 rounded-none" />
                <Skeleton className="h-4 w-20 rounded-none" />
              </div>
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
              <Skeleton className="h-5 w-20 rounded-none" />
            </div>
          </div>

          <Skeleton className="h-12 w-full rounded-none" />
        </div>
      </div>
    </section>
  );
}
