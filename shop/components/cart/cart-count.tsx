"use client";

import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import {
  getCartCountSnapshot,
  getServerCartCountSnapshot,
  subscribeToCart,
} from "@/lib/cart-store";

export function CartCount() {
  const count = useSyncExternalStore(
    subscribeToCart,
    getCartCountSnapshot,
    getServerCartCountSnapshot,
  );

  return (
    <>
      <Badge
        aria-hidden="true"
        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
      >
        {count > 99 ? "99+" : count}
      </Badge>
      <span className="sr-only">
        Panier, {count} {count === 1 ? "article" : "articles"}
      </span>
    </>
  );
}
