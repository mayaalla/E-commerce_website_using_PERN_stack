/**
 * /categories — route-segment loading UI.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Chargement des catégories"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
    >
      <Skeleton className="h-10 w-48 rounded-none" />
      <Skeleton className="mt-3 h-5 w-72 rounded-none" />

      <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <Skeleton className="aspect-square w-full rounded-none" />
            <Skeleton className="mt-3 h-5 w-2/3 rounded-none" />
          </li>
        ))}
      </ul>
    </section>
  );
}
