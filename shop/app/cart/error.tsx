"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CartError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[cart-error]", error);
  }, [error]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <h1 className="text-3xl font-medium tracking-tight">Impossible de charger votre panier</h1>
      <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
        Réessayez de charger votre panier ou parcourez les produits pour y ajouter des articles.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button className="h-12 rounded-none px-6" onClick={() => retry()}>
          Réessayer
        </Button>
        <Button variant="outline" className="h-12 rounded-none px-6" render={<Link href="/products" />}>
          Voir les produits
        </Button>
      </div>
    </section>
  );
}
