import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/api";

function formatPrice(value: string) {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(amount)} DA`
    : `${value} DA`;
}

export function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const image = product.images[0];
  const productHref = `/products/${product.id}`;
  const hasPromo =
    product.promo !== null && Number(product.promo) < Number(product.price);

  return (
    <Card className="group h-full gap-0 overflow-visible rounded-none bg-transparent py-0 ring-0 shadow-none">
      <Link
        href={productHref}
        aria-label={`Voir ${product.title}`}
        className="group/product relative block aspect-square overflow-hidden bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {image ? (
          <Image
            src={image}
            alt={product.title}
            fill
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            className="object-contain p-4 sm:p-8"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Image du produit indisponible
          </div>
        )}
        {hasPromo ? (
          <Badge
            variant="outline"
            className="absolute left-4 top-4 rounded-none bg-background/90"
          >
            Promotion
          </Badge>
        ) : null}
      </Link>

      <CardContent className="px-0 pt-4">
        <Link
          href={productHref}
          className="group/title block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {categoryName ? (
            <p className="mb-1 text-xs font-light text-muted-foreground">
              {categoryName}
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 line-clamp-2 text-sm leading-5 font-medium group-hover/title:underline group-focus-visible/title:underline">
              {product.title}
            </CardTitle>
            <div className="shrink-0 text-right text-xs sm:text-sm">
              <span className="font-bold">
                {formatPrice(hasPromo ? product.promo! : product.price)}
              </span>
              {hasPromo ? (
                <del className="mt-1 block text-muted-foreground">
                  {formatPrice(product.price)}
                </del>
              ) : null}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
