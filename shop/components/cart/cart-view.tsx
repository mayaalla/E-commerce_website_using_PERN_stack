"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getCartSnapshot,
  getServerCartSnapshot,
  removeFromCart,
  setCartQuantity,
  subscribeToCart,
} from "@/lib/cart-store";

function formatPrice(value: string) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(amount)} DA`
    : `${value} DA`;
}

export function CartView() {
  const items = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );

  if (items.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Votre panier</h1>
        <p className="mt-4 text-muted-foreground">
          Votre panier est vide. Trouvez votre bonheur dans la collection.
        </p>
        <Button
          className="mt-8 h-12 rounded-none px-6"
          render={<Link href="/products" />}
          nativeButton={false}
        >
          Continuer mes achats
        </Button>
      </section>
    );
  }

  const subtotal = items.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <h1 className="text-3xl font-medium tracking-tight">Votre panier</h1>

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li
              key={item.key}
              className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-6"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="112px"
                    className="object-contain p-2"
                  />
                ) : null}
              </div>

              <div className="flex min-w-0 flex-col justify-center gap-2">
                <h2 className="font-medium">{item.title}</h2>
                {item.size || item.color ? (
                  <p className="text-sm text-muted-foreground">
                    {[item.size, item.color].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                <p className="font-bold">{formatPrice(item.price)}</p>
                <div className="flex items-center gap-2 sm:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-none"
                    aria-label={`Diminuer la quantité de ${item.title}`}
                    onClick={() => setCartQuantity(item.key, item.quantity - 1)}
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <span aria-label={`Quantité : ${item.quantity}`} className="min-w-8 text-center">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-none"
                    aria-label={`Augmenter la quantité de ${item.title}`}
                    onClick={() => setCartQuantity(item.key, item.quantity + 1)}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-none"
                  aria-label={`Diminuer la quantité de ${item.title}`}
                  onClick={() => setCartQuantity(item.key, item.quantity - 1)}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <span className="min-w-8 text-center">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-none"
                  aria-label={`Augmenter la quantité de ${item.title}`}
                  onClick={() => setCartQuantity(item.key, item.quantity + 1)}
                >
                  <Plus aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-none"
                  aria-label={`Retirer ${item.title} du panier`}
                  onClick={() => removeFromCart(item.key)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="col-start-2 h-10 w-fit rounded-none px-0 text-muted-foreground sm:hidden"
                onClick={() => removeFromCart(item.key)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>

        <aside className="h-fit border-t border-border pt-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-medium">Sous-total</h2>
            <p className="text-lg font-bold">{formatPrice(String(subtotal))}</p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Les frais de livraison seront calculés lors de la commande.
          </p>
          <Button
            className="mt-6 h-12 w-full rounded-none"
            render={<Link href="/checkout" />}
            nativeButton={false}
          >
            Passer à la commande
          </Button>
        </aside>
      </div>
    </section>
  );
}
