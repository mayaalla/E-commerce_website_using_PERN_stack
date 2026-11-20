/**
 * /products — route-segment loading UI.
 *
 * Next.js streams this to the browser IMMEDIATELY on navigation while
 * ProductsContent (which awaits the API) is still resolving on the server.
 * The layout (Navbar, Footer) is never unmounted — only the page slot swaps.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement des produits"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      {/* Page header */}
      <div className="border-b border-border pb-8 sm:pb-10">
        <Skeleton className="h-10 w-48 rounded-none" />
        <Skeleton className="mt-3 h-5 w-80 max-w-full rounded-none" />
      </div>

      {/* Filter bar */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-12 rounded-none" />
        <Skeleton className="h-12 rounded-none" />
        <Skeleton className="h-12 rounded-none" />
      </div>

      {/* Product grid */}
      <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-square w-full rounded-none" />
            <Skeleton className="mt-4 h-4 w-3/4 rounded-none" />
            <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
          </li>
        ))}
      </ul>
    </section>
  );
}
