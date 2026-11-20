import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CategoryCatalog } from "@/components/category-catalog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoriesApi, productsApi, categoryToSlug } from "@/lib/api";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  if (!isValidSlug(normalizedSlug)) {
    return { title: "Catégorie introuvable | MayaStore" };
  }

  try {
    const categories = await categoriesApi.getAll();
    const category = categories.find((item) => categoryToSlug(item.name) === normalizedSlug);

    return category
      ? {
          title: `${category.name} | MayaStore`,
          description: `Découvrez ${category.name} chez MayaStore.`,
        }
      : { title: "Catégorie introuvable | MayaStore" };
  } catch {
    return { title: "Catégorie | MayaStore" };
  }
}

/**
 * Loading strategy — two independent Suspense zones:
 *
 * Zone 1 › <CategoryHeader> — streams the category name + breadcrumb as soon
 *   as the categories list resolves.  Uses a skeleton that matches the real
 *   header height so the layout is stable while the product grid loads.
 *
 * Zone 2 › <CategoryProductGrid> — streams the product grid independently.
 *   This call only starts after the category id is known, but it runs in
 *   parallel with the header render on the client so the page feels fast.
 *
 * The file-level loading.tsx covers the initial hard-navigation.
 */
export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      {/* Zone 1 — category header (name + description) */}
      <Suspense fallback={<CategoryHeaderSkeleton />}>
        <CategoryHeader params={params} />
      </Suspense>

      {/* Zone 2 — product grid */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <CategoryProductGrid params={params} />
      </Suspense>
    </section>
  );
}

/* ─────────────────────── Zone 1: Category header ─────────────── */

async function CategoryHeader({ params }: CategoryPageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  if (!isValidSlug(normalizedSlug)) notFound();

  const categories = await categoriesApi.getAll();
  const category = categories.find((item) => categoryToSlug(item.name) === normalizedSlug);

  if (!category) notFound();

  return (
    <header className="border-b border-border pb-8 sm:pb-10">
      <p className="text-sm text-muted-foreground">
        <Link href="/products" className="underline underline-offset-4">
          Produits
        </Link>
      </p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
        {category.name}
      </h1>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
        Découvrez la collection {category.name} chez MayaStore.
      </p>
    </header>
  );
}

/* ─────────────────────── Zone 2: Product grid ────────────────── */

async function CategoryProductGrid({ params }: CategoryPageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();

  if (!isValidSlug(normalizedSlug)) return null;

  // Re-fetch categories (React deduplicates the request within the same render)
  const categories = await categoriesApi.getAll();
  const category = categories.find((item) => categoryToSlug(item.name) === normalizedSlug);

  if (!category) return null;

  const products = await productsApi.getByCategory(category.id);

  return (
    <CategoryCatalog products={products} categoryName={category.name} />
  );
}

/* ─────────────────────────── Skeletons ───────────────────────── */

function CategoryHeaderSkeleton() {
  return (
    <div className="border-b border-border pb-8 sm:pb-10" aria-hidden="true">
      <Skeleton className="h-4 w-20 rounded-none" />
      <Skeleton className="mt-3 h-10 w-56 rounded-none" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-none" />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="Chargement des produits"
      className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i}>
          <Skeleton className="aspect-square w-full rounded-none" />
          <Skeleton className="mt-4 h-4 w-3/4 rounded-none" />
          <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
        </li>
      ))}
    </ul>
  );
}

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
