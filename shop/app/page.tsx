import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/product-card";
import { categoriesApi, productsApi, type Product } from "@/lib/api";
import { connection } from "next/server";


export const metadata: Metadata = {
  title: "MAISON | Vêtements du quotidien",
  description: "Découvrez la collection de vêtements MAISON.",
};

const featuredProductLimit = 8;

async function FeaturedProducts() {
   await connection();     
  let products: Product[];
  let categories: Awaited<ReturnType<typeof categoriesApi.getAll>> = [];

  try {
    [products, categories] = await Promise.all([
      productsApi.getAll(),
      categoriesApi.getAll().catch((error) => {
        console.error("[home] Failed to load categories:", error);
        return [];
      }),
    ]);
  } catch (error) {
    console.error("[home] Failed to load products:", error);

    return (
      <div className="border-y border-border py-10 text-sm text-muted-foreground">
        Impossible de charger les produits. Actualisez la page pour réessayer.
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border-y border-border py-10 text-sm text-muted-foreground">
        Aucun produit à afficher pour le moment.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, featuredProductLimit).map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            categoryName={
              categories.find(
                (category) => category.id === product.categoryId,
              )?.name
            }
          />
        </li>
      ))}
    </ul>
  );
}

function ProductGridSkeleton() {
  return (
    <ul
      aria-label="Chargement des produits"
      aria-busy="true"
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: featuredProductLimit }, (_, index) => (
        <li key={index}>
          <Skeleton className="aspect-square w-full rounded-none" />
          <Skeleton className="mt-4 h-4 w-3/4 rounded-none" />
          <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="pb-16 sm:pb-20">
      <section
        aria-labelledby="home-hero-title"
        className="grid overflow-hidden bg-muted lg:grid-cols-12"
      >
        <div className="relative aspect-[4/3] lg:col-span-7">
          <Image
            src="/Assorted T-shirts on Wooden Hangers.png"
            alt="T-shirts aux tons chauds, neutres, verts, blancs et foncés suspendus à des cintres en bois"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 1023px) 100vw, 58vw"
            className="object-cover object-center"
          />
        </div>

        <div className="flex flex-col items-start justify-center bg-muted px-6 py-12 sm:px-10 sm:py-16 lg:col-span-5 lg:px-12 xl:px-16">
          <h1
            id="home-hero-title"
            className="max-w-[12ch] text-4xl leading-tight font-medium tracking-tight sm:text-5xl lg:text-6xl"
          >
            Le quotidien, avec soin.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
            Une sélection soignée de vêtements à porter au quotidien.
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-none px-6"
              render={<Link href="/products" />}
            >
              Découvrir la collection
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="collection-title"
        className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="collection-title"
            className="text-2xl leading-tight font-medium tracking-tight sm:text-3xl"
          >
            Explorer la collection
          </h2>
          <Button
            variant="outline"
            size="lg"
            className="h-12 w-fit gap-2 rounded-none px-4"
            render={<Link href="/products" />}
          >
            Voir tous les produits
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </div>
  );
}
