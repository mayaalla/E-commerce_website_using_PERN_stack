"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ImageOff, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { addToCart } from "@/lib/cart-store";
import {
  getProductTotalStock,
  isProductOutOfStock,
  type Product,
  type ProductColor,
  type ProductStock,
} from "@/lib/api";

type ColorOption = {
  value: string;
  name: string;
  hex: string;
  swatch: string;
};

function parseColor(color: ProductColor): ColorOption {
  const hex = color.hex.trim().replace(/^#/, "").toUpperCase();
  return {
    value: hex,
    name: color.name,
    hex,
    swatch: `#${hex}`,
  };
}

function formatPrice(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(amount)} DA`
    : `${value} DA`;
}

function priceFor(product: Product) {
  return product.promo !== null && Number(product.promo) < Number(product.price)
    ? product.promo
    : product.price;
}

export function ProductDetail({
  product,
  stockRows,
}: {
  product: Product;
  stockRows: ProductStock[] | null;
}) {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [cartMessage, setCartMessage] = useState("");
  const colors = product.colors.map(parseColor);
  const hasStockTrackedVariants = colors.length > 0 && product.sizes.length > 0;
  const stockCount = hasStockTrackedVariants
    ? getProductTotalStock(stockRows)
    : null;
  const outOfStock = isProductOutOfStock(product, stockRows);
  const currentPrice = priceFor(product);
  const hasPromo = currentPrice !== product.price;
  const needsSize = product.sizes.length > 0;
  const needsColor = colors.length > 0;

  // Determine whether a selection has been made for each required attribute
  const selectionComplete =
    (!needsSize || Boolean(selectedSize)) &&
    (!needsColor || Boolean(selectedColor));

  const selectedColorHex = selectedColor
    ? colors.find((color) => color.value === selectedColor)?.hex?.replace(/^#/, "").toUpperCase()
    : undefined;
  const comboStock =
    selectionComplete && hasStockTrackedVariants && stockRows !== null
      ? stockRows
          .filter((row) => !selectedColorHex || row.colorHex.toUpperCase() === selectedColorHex)
          .filter((row) => !selectedSize || row.size === selectedSize)
          .reduce((sum, row) => sum + row.stock, 0)
      : null;

  // Stock is recalculated from the server-loaded rows after each selection.
  const handleSizeChange = useCallback((size: string) => {
    setSelectedSize(size);
    setCartMessage("");
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    setCartMessage("");
  }, []);

  const hasPositiveAvailability =
    stockCount !== null && Number.isFinite(stockCount) && stockCount > 0;

  // A null result preserves the existing fallback when variant stock cannot be checked.
  // Otherwise, variant stock comes from the server-loaded rows without another request.
  const comboHasStock =
    comboStock === null || (typeof comboStock === "number" && comboStock > 0);

  const canPurchase =
    !outOfStock &&
    selectionComplete &&
    comboHasStock &&
    (comboStock === null || quantity <= comboStock);

  const availableQuantity = selectionComplete
    ? comboStock ?? stockCount
    : stockCount;
  const selectedColorName =
    colors.find((color) => color.value === selectedColor)?.name;

  const handleThumbnailClick = useCallback(
    (index: number) => {
      setSelectedImage(index);
      carouselApi?.scrollTo(index);
    },
    [carouselApi],
  );

  const handleCarouselSelect = useCallback(
    (api: CarouselApi) => {
      if (!api) return;
      setSelectedImage(api.selectedScrollSnap());
    },
    [],
  );

  function handleAddToCart() {
    if (!canPurchase) return;

    const saved = addToCart({
      productId: product.id,
      title: product.title,
      price: currentPrice,
      image: product.images[0] ?? null,
      size: selectedSize || undefined,
      color: selectedColorName,
      colorHex: selectedColor || undefined,
      quantity,
    });

    setCartMessage(saved ? `${product.title} ajouté au panier.` : "Impossible d’ajouter cet article. Veuillez réessayer.");
  }

  function handleFastShop() {
    if (!canPurchase) return;

    const params = new URLSearchParams({ productId: String(product.id) });
    if (selectedSize) params.set("size", selectedSize);
    if (selectedColor) params.set("colorHex", selectedColor);
    params.set("quantity", String(quantity));
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <nav aria-label="Fil d’Ariane" className="mb-6 text-sm text-muted-foreground sm:mb-8">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/products" className="underline-offset-4 hover:text-foreground hover:underline">Produits</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-48 truncate text-foreground sm:max-w-none">{product.title}</li>
        </ol>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
        {/* ── Image carousel column ── */}
        <div className="min-w-0 lg:col-span-7">
          {product.images.length > 0 ? (
            <>
              <Carousel
                opts={{ loop: product.images.length > 1 }}
                setApi={(api) => {
                  setCarouselApi(api);
                  api?.on("select", handleCarouselSelect);
                }}
                className="w-full overflow-hidden"
              >
                <CarouselContent>
                  {product.images.map((src, index) => (
                    <CarouselItem key={`${src}-${index}`}>
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        <Image
                          src={src}
                          alt={`${product.title} — image ${index + 1}`}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 1024px) 100vw, 58vw"
                          className="object-contain p-6 sm:p-10"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>

                {product.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-3 border-border bg-background/80 backdrop-blur-sm hover:bg-background" />
                    <CarouselNext className="right-3 border-border bg-background/80 backdrop-blur-sm hover:bg-background" />
                  </>
                )}
              </Carousel>

              {/* Thumbnail strip */}
              {product.images.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-4 sm:grid-cols-5">
                  {product.images.map((src, index) => (
                    <button
                      key={`thumb-${src}-${index}`}
                      type="button"
                      aria-label={`Show product image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative aspect-square overflow-hidden bg-muted transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                        selectedImage === index
                          ? "ring-2 ring-foreground"
                          : "ring-1 ring-border hover:ring-foreground"
                      }`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 22vw, 128px"
                        className="object-contain p-2"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden bg-muted">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <ImageOff aria-hidden="true" className="size-10" />
                <span className="text-sm">Aucune image de produit disponible</span>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <h1 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
              {product.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-semibold tracking-tight">{formatPrice(currentPrice)}</p>
              {hasPromo ? (
                <p className="text-base text-muted-foreground line-through">{formatPrice(product.price)}</p>
              ) : null}
            </div>

            {product.description.trim() ? (
              <p className="mt-6 max-w-prose whitespace-pre-line text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {product.description}
              </p>
            ) : null}

            <div className="mt-8 border-y border-border py-6">
              {outOfStock ? (
                <p role="status" className="text-sm font-medium text-destructive">Rupture de stock</p>
              ) : hasPositiveAvailability || stockCount !== null ? (
                <p role="status" className="text-sm font-medium">
                  {hasPositiveAvailability ? "En stock" : "Rupture de stock"}
                </p>
              ) : null}

              {needsColor ? (
                <fieldset className={needsSize ? "mt-6" : ""}>
                  <legend className="text-sm font-medium">
                    Couleur{selectedColor ? `: ${colors.find((color) => color.value === selectedColor)?.name ?? ""}` : ""}
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={`Choisir ${color.name}`}
                        aria-pressed={selectedColor === color.value}
                        title={color.name}
                        onClick={() => {
                          handleColorChange(color.value);
                        }}
                        className={`flex min-h-12 items-center gap-2 rounded-none border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selectedColor === color.value ? "border-foreground" : "border-border hover:border-foreground"}`}
                      >
                        <span
                          aria-hidden="true"
                          className="size-5 shrink-0 rounded-full border border-black/15"
                          style={{ backgroundColor: color.swatch }}
                        />
                        <span>{color.name}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {needsSize ? (
                <fieldset className={needsColor ? "mt-6" : ""}>
                  <legend className="text-sm font-medium">
                    {selectedSize ? `Taille : ${selectedSize}` : "Choisir une taille"}
                  </legend>
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selectedSize === size}
                        onClick={() => {
                          handleSizeChange(size);
                        }}
                        className={`h-12 border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selectedSize === size ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Quantité</p>
                  {stockCount !== null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {availableQuantity ?? stockCount} disponible(s)
                    </p>
                  ) : null}
                </div>
                <div className="flex h-12 items-center border border-border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-none"
                    aria-label="Diminuer la quantité"
                    disabled={outOfStock || quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus aria-hidden="true" />
                  </Button>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="min-w-10 text-center text-sm tabular-nums"
                  >
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-none"
                    aria-label="Augmenter la quantité"
                    disabled={
                      outOfStock ||
                      (availableQuantity !== null && quantity >= availableQuantity)
                    }
                    onClick={() =>
                      setQuantity((current) =>
                        availableQuantity === null
                          ? current + 1
                          : Math.min(availableQuantity, current + 1),
                      )
                    }
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {!canPurchase && !outOfStock ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {!selectionComplete
                    ? `Choisissez ${needsSize && needsColor ? "une taille et une couleur" : needsSize ? "une taille" : "une couleur"} pour continuer.`
                    : typeof comboStock === "number" && comboStock === 0
                    ? "Cette combinaison taille/couleur est en rupture de stock."
                    : typeof comboStock === "number" && quantity > comboStock
                    ? `Il ne reste que ${comboStock} unité(s) pour cette combinaison.`
                    : null}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  className="h-12 w-full rounded-none"
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                >
                  Ajouter au panier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-none"
                  onClick={handleFastShop}
                  disabled={!canPurchase}
                >
                  Achat rapide
                </Button>
              </div>

              <p aria-live="polite" role={cartMessage ? "status" : undefined} className="mt-3 min-h-5 text-sm text-muted-foreground">
                {cartMessage}
              </p>
              {cartMessage.includes("ajouté au panier") ? (
                <Link href="/cart" className="text-sm font-medium underline underline-offset-4">
                  Voir le panier
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
