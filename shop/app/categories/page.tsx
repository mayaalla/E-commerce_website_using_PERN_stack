import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { categoriesApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Catégories | MAISON",
  description: "Découvrez toutes les catégories de produits MAISON.",
};

/**
 * Loading strategy — two independent Suspense zones:
 *
 * Zone 1 › <PageHeader> — static, renders immediately (no data fetch needed).
 *
 * Zone 2 › <CategoriesGrid> — streams the category grid once the API resolves.
 *   Its skeleton mirrors the real grid layout to avoid layout shift.
 *
 * The file-level loading.tsx handles the initial hard-navigation before this
 * component mounts.  The Suspense zones take over for client-side transitions.
 */
export default function CategoriesPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      {/* Zone 1 — static header, no data dependency */}
      <PageHeader />

      {/* Zone 2 — category grid, deferred until API resolves */}
      <Suspense fallback={<CategoriesGridSkeleton />}>
        <CategoriesGrid />
      </Suspense>
    </section>
  );
}

/** Fully static — renders on the first paint with zero data fetching. */
function PageHeader() {
  return (
    <header>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Catégories</h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
        Parcourez nos catégories et trouvez exactement ce que vous cherchez.
      </p>
    </header>
  );
}

/** Fetches categories and renders the grid — streamed via Suspense. */
async function CategoriesGrid() {
  let categories;

  try {
    categories = await categoriesApi.getAll();
  } catch {
    return (
      <p className="mt-10 text-sm text-muted-foreground">
        Impossible de charger les catégories. Vérifiez votre connexion, puis actualisez la page.
      </p>
    );
  }

  if (!categories.length) {
    return (
      <p className="mt-10 text-muted-foreground">Aucune catégorie pour le moment.</p>
    );
  }

  return (
    <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            className="group block space-y-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <div className="aspect-square w-full overflow-hidden bg-muted">
              {/* Category image placeholder — swap with <Image> when you have category images */}
              <div className="size-full bg-muted transition-transform duration-300 group-hover:scale-105" />
            </div>
            <p className="text-sm font-medium group-hover:underline group-hover:underline-offset-4">
              {category.name}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Grid skeleton — shown while CategoriesGrid is pending. */
function CategoriesGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Chargement des catégories"
      className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-square w-full rounded-none" />
          <Skeleton className="mt-3 h-5 w-2/3 rounded-none" />
        </li>
      ))}
    </ul>
  );
}
