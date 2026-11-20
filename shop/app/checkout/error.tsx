"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CheckoutError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[checkout-error]", error);
  }, [error]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <h1 className="text-3xl font-medium tracking-tight">Impossible de charger la commande</h1>
      <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
        Impossible de préparer les options de livraison. Veuillez réessayer.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button className="h-12 rounded-none px-6" onClick={() => retry()}>
          Réessayer
        </Button>
        <Button variant="outline" className="h-12 rounded-none px-6" render={<Link href="/cart" />}>
          Retour au panier
        </Button>
      </div>
    </section>
  );
}
