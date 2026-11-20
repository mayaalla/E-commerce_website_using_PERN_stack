/**
 * /categories/[slug] — route-segment loading UI.
 *
 * Shown immediately while the server fetches the category and its products.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement de la catégorie"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      {/* Header */}
      <div className="border-b border-border pb-8 sm:pb-10">
        <Skeleton className="h-4 w-20 rounded-none" />
        <Skeleton className="mt-3 h-10 w-56 rounded-none" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-none" />
      </div>

      {/* Product grid */}
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
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
