/**
 * Root loading.tsx
 *
 * Next.js shows this INSTANTLY when the user navigates to "/" while the
 * Home page Server Component is still streaming. It wraps the page slot
 * in a React Suspense boundary automatically — no extra code needed.
 *
 * Layout (Navbar, Footer) stays mounted and interactive the whole time.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="pb-16 sm:pb-20" aria-busy="true" aria-label="Chargement de la page d’accueil">
      {/* Hero skeleton */}
      <div className="grid overflow-hidden bg-muted lg:grid-cols-12">
        <Skeleton className="aspect-[4/3] rounded-none lg:col-span-7" />
        <div className="flex flex-col justify-center bg-muted px-6 py-12 sm:px-10 sm:py-16 lg:col-span-5 lg:px-12 xl:px-16">
          <Skeleton className="h-14 w-3/4 rounded-none sm:h-16 lg:h-20" />
          <Skeleton className="mt-6 h-5 w-2/3 rounded-none" />
          <Skeleton className="mt-2 h-5 w-1/2 rounded-none" />
          <Skeleton className="mt-8 h-12 w-44 rounded-none" />
        </div>
      </div>

      {/* Featured products skeleton */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Skeleton className="h-9 w-56 rounded-none" />
          <Skeleton className="h-12 w-44 rounded-none" />
        </div>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-square w-full rounded-none" />
              <Skeleton className="mt-4 h-4 w-3/4 rounded-none" />
              <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
