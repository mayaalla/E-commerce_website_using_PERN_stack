import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <h1 className="text-3xl font-medium tracking-tight">Produit introuvable</h1>
      <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
        Ce produit a peut-être été supprimé. Parcourez la collection pour découvrir d’autres articles.
      </p>
      <Button className="mt-8 h-12 rounded-none px-6" render={<Link href="/products" />}>
        Voir les produits
      </Button>
    </section>
  );
}
