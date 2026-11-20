/**
 * /cart — route-segment loading UI.
 *
 * Cart state lives in localStorage (client-side), so this skeleton is very
 * brief — it disappears as soon as the client component hydrates.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement du panier"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      {/* Page title */}
      <Skeleton className="h-9 w-32 rounded-none" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Cart items */}
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-5 py-6">
              <Skeleton className="size-24 shrink-0 rounded-none sm:size-32" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-2/3 rounded-none" />
                <Skeleton className="h-4 w-1/3 rounded-none" />
                <Skeleton className="h-4 w-20 rounded-none" />
                <Skeleton className="h-10 w-28 rounded-none" />
              </div>
              <Skeleton className="h-5 w-16 rounded-none" />
            </li>
          ))}
        </ul>

        {/* Order summary */}
        <div className="space-y-4 rounded-none border border-border p-6">
          <Skeleton className="h-6 w-36 rounded-none" />
          <div className="space-y-3 pt-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-4 w-16 rounded-none" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20 rounded-none" />
              <Skeleton className="h-4 w-16 rounded-none" />
            </div>
          </div>
          <Skeleton className="mt-4 h-12 w-full rounded-none" />
        </div>
      </div>
    </section>
  );
}
