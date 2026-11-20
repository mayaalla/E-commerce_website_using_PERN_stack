"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Banknote, Check, ChevronLeft, LoaderCircle, Tag, Truck, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiError,
  communesApi,
  couponsApi,
  ordersApi,
  shippingApi,
  type Commune,
  type CouponValidationResult,
  type CreateOrderResult,
  type Product,
  type ShippingCompany,
  type ShippingPrice,
  type Wilaya,
  isProductOutOfStock,
} from "@/lib/api";
import {
  clearCart,
  getCartSnapshot,
  getServerCartSnapshot,
  subscribeToCart,
} from "@/lib/cart-store";

type CheckoutLine = {
  key: string;
  productId: number;
  title: string;
  price: string;
  image: string | null;
  quantity: number;
  size?: string;
  color?: string;
};

type OrderReceipt = {
  result: CreateOrderResult;
  wilayaName: string;
  communeName: string;
  companyName: string;
};

type CheckoutFormProps = {
  directProduct: Product | null;
  directProductError?: boolean;
  initialSelectedSize?: string;
  initialSelectedColor?: string;
  initialQuantity?: number;
  initialWilayas: Wilaya[];
  initialCompanies: ShippingCompany[];
  initialDataError: boolean;
};

function formatPrice(value: string | number) {
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

function describeOrderError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Impossible de passer votre commande. Veuillez réessayer.";
  }

  if (/no shipping price configured|no shipping price found/i.test(error.message)) {
    return "Cette société de livraison ne propose aucun tarif pour la wilaya sélectionnée. Choisissez une autre société ou wilaya.";
  }

  if (/shipping company .* not found/i.test(error.message)) {
    return "Cette société de livraison n’est plus disponible. Sélectionnez-en une autre et réessayez.";
  }

  if (error instanceof ApiError) {
    return error.message || "Veuillez vérifier vos informations et réessayer.";
  }

  return "Impossible de contacter le service de commande. Vérifiez votre connexion et réessayez.";
}

function Receipt({ receipt }: { receipt: OrderReceipt }) {
  const { result } = receipt;
  const { pricing } = result;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="border-y border-border py-8 sm:py-10">
        <div className="flex size-12 items-center justify-center bg-primary text-primary-foreground">
          <Check aria-hidden="true" className="size-6" />
        </div>
        <h1 className="mt-6 text-3xl font-medium tracking-tight sm:text-4xl">
          Commande reçue
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
          Merci, {result.order.name}. Votre commande est enregistrée. Payez le montant total en
          espèces à la livraison.
        </p>
        <p className="mt-4 text-sm font-medium">
          Commande n° {result.order.id} · {result.order.status}
        </p>
      </div>

      <div className="grid gap-10 py-8 sm:grid-cols-2 sm:gap-12">
        <div className="sm:col-span-2">
          <h2 className="font-medium">Articles commandés</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {result.order.products.map((line, index) => (
              <li
                key={`${line.productId}-${line.size ?? ""}-${line.color ?? ""}-${index}`}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  {line.title} × {line.quantity}
                  {line.size || line.color
                    ? ` · ${[line.size, line.color].filter(Boolean).join(" · ")}`
                    : ""}
                </span>
                <span className="shrink-0 font-medium">
                  {formatPrice(Number(line.price) * line.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-medium">Détails de livraison</h2>
          <div className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{receipt.wilayaName} · {receipt.communeName}</p>
            <p>{receipt.companyName}</p>
            <p>{result.order.name}</p>
            <p>{result.order.phoneNumber}</p>
          </div>
        </div>
        <div>
          <h2 className="font-medium">Total de la commande</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Articles</dt>
              <dd>{formatPrice(pricing.subtotal)}</dd>
            </div>
            {Number(pricing.discountAmount) > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Code promo ({pricing.discountPercentage}%)
                </dt>
                <dd>−{formatPrice(pricing.discountAmount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Livraison</dt>
              <dd>{formatPrice(pricing.shippingCost)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-4 text-base font-bold">
              <dt>Total à payer à la livraison</dt>
              <dd>{formatPrice(pricing.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Button
        className="h-12 rounded-none px-6"
        render={<Link href="/products" />}
      >
        Continuer mes achats
      </Button>
    </section>
  );
}

function CheckoutSelect({
  label,
  placeholder,
  value,
  onValueChange,
  children,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={label}
          aria-required="true"
          className="h-12 w-full rounded-none px-3"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-none [&_[data-slot=select-item]]:py-2.5">
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CheckoutForm({
  directProduct,
  directProductError = false,
  initialSelectedSize = "",
  initialSelectedColor = "",
  initialQuantity = 1,
  initialWilayas,
  initialCompanies,
  initialDataError,
}: CheckoutFormProps) {
  const cartLines = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [wilayaCode, setWilayaCode] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [communesLoading, setCommunesLoading] = useState(false);
  const [communesError, setCommunesError] = useState(false);
  const [shippingPrice, setShippingPrice] = useState<ShippingPrice | null>(null);
  const [shippingPriceLoading, setShippingPriceLoading] = useState(false);
  const [shippingPriceError, setShippingPriceError] = useState<
    "unavailable" | "request" | ""
  >("");
  const [selectedSize, setSelectedSize] = useState(initialSelectedSize);
  const [selectedColor, setSelectedColor] = useState(initialSelectedColor);
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<
    "idle" | "validating" | "valid" | "invalid" | "error"
  >("idle");
  const [couponValidation, setCouponValidation] = useState<CouponValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const communeRequestId = useRef(0);
  const shippingPriceRequestId = useRef(0);

  function loadShippingPrice(nextCompanyId: string, nextWilayaCode: string) {
    const requestId = ++shippingPriceRequestId.current;
    setShippingPrice(null);
    setShippingPriceError("");

    if (!nextCompanyId || !nextWilayaCode) {
      setShippingPriceLoading(false);
      return;
    }

    setShippingPriceLoading(true);
    shippingApi
      .getPrice(Number(nextCompanyId), nextWilayaCode)
      .then((price) => {
        if (requestId === shippingPriceRequestId.current) setShippingPrice(price);
      })
      .catch((error: unknown) => {
        if (requestId === shippingPriceRequestId.current) {
          setShippingPriceError(
            error instanceof ApiError && error.status === 404
              ? "unavailable"
              : "request",
          );
        }
      })
      .finally(() => {
        if (requestId === shippingPriceRequestId.current) {
          setShippingPriceLoading(false);
        }
      });
  }

  function handleWilayaChange(nextWilayaCode: string) {
    setWilayaCode(nextWilayaCode);
    setCommuneId("");
    setCommunes([]);
    setCommunesError(false);

    const requestId = ++communeRequestId.current;
    if (!nextWilayaCode) {
      setCommunesLoading(false);
    } else {
      setCommunesLoading(true);
      communesApi
        .getByWilaya(nextWilayaCode)
        .then((nextCommunes) => {
          if (requestId === communeRequestId.current) setCommunes(nextCommunes);
        })
        .catch(() => {
          if (requestId === communeRequestId.current) setCommunesError(true);
        })
        .finally(() => {
          if (requestId === communeRequestId.current) setCommunesLoading(false);
        });
    }

    loadShippingPrice(companyId, nextWilayaCode);
  }

  function handleCompanyChange(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    loadShippingPrice(nextCompanyId, wilayaCode);
  }

  async function handleApplyCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    setCouponStatus("validating");
    setCouponValidation(null);

    try {
      const result = await couponsApi.validate(code);
      setCouponValidation(result);
      if (result.valid) {
        setCouponCode(code);
        setCouponStatus("valid");
      } else {
        setCouponCode("");
        setCouponStatus("invalid");
      }
    } catch {
      setCouponCode(code); // still submit — backend will reject with a clear error
      setCouponStatus("error");
    }
  }

  function handleCouponInputChange(value: string) {
    setCouponInput(value);
    // If the user edits the code after a successful apply, reset the state
    if (couponStatus !== "idle" && couponStatus !== "validating") {
      setCouponStatus("idle");
      setCouponValidation(null);
      setCouponCode("");
    }
  }

  function handleRemoveCoupon() {
    setCouponInput("");
    setCouponCode("");
    setCouponStatus("idle");
    setCouponValidation(null);
  }

  const lines: CheckoutLine[] = directProduct
    ? [
        {
          key: `direct-${directProduct.id}`,
          productId: directProduct.id,
          title: directProduct.title,
          price: priceFor(directProduct),
          image: directProduct.images[0] ?? null,
          quantity: initialQuantity,
          size: selectedSize || undefined,
          color: selectedColor || undefined,
        },
      ]
    : cartLines;

  const subtotal = lines.reduce(
    (total, line) => total + Number(line.price) * line.quantity,
    0,
  );
  const appliedDiscount =
    couponStatus === "valid" &&
    couponValidation?.valid &&
    couponValidation.discountPercentage > 0
      ? subtotal * (couponValidation.discountPercentage / 100)
      : 0;
  const discountedSubtotal = subtotal - appliedDiscount;
  const estimatedTotal = shippingPrice
    ? discountedSubtotal + Number(shippingPrice.price)
    : null;
  const selectedWilaya = initialWilayas.find((item) => item.code === wilayaCode);
  const selectedCommune = communes.find((item) => String(item.id) === communeId);
  const selectedCompany = initialCompanies.find(
    (item) => String(item.id) === companyId,
  );

  if (receipt) {
    return <Receipt receipt={receipt} />;
  }

  if (directProductError) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Alert variant="destructive" className="rounded-none p-4">
          <AlertTitle>Produit indisponible</AlertTitle>
          <AlertDescription>
            Impossible de charger ce produit. Retournez à la collection et choisissez
            un autre article.
          </AlertDescription>
        </Alert>
        <Button
          className="mt-6 h-12 rounded-none px-6"
          render={<Link href="/products" />}
        >
          Voir les produits
        </Button>
      </section>
    );
  }

  if (directProduct && isProductOutOfStock(directProduct)) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Cet article est en rupture de stock</h1>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
          Cet article n’est plus disponible à la commande. Parcourez la collection pour en choisir un autre.
        </p>
        <Button className="mt-8 h-12 rounded-none px-6" render={<Link href="/products" />}>
          Voir les produits
        </Button>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Votre panier est vide</h1>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">
          Add something from the collection or use Achat rapide on a product to
          passer une commande directe.
        </p>
        <Button
          className="mt-8 h-12 rounded-none px-6"
          render={<Link href="/products" />}
        >
          Voir les produits
        </Button>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Saisissez votre nom complet.");
      return;
    }

    if (!/^0[0-9]{9}$/.test(phoneNumber)) {
      setFormError("Saisissez un numéro de téléphone à 10 chiffres commençant par 0.");
      return;
    }

    if (!wilayaCode || !communeId || !companyId) {
      setFormError("Sélectionnez votre wilaya, votre commune et une société de livraison.");
      return;
    }

    if (communesLoading || communesError) {
      setFormError(
        communesError
          ? "Impossible de charger les communes de cette wilaya. Changez de wilaya ou actualisez la page."
          : "Attendez le chargement de la liste des communes, puis réessayez.",
      );
      return;
    }

    if (shippingPriceLoading || !shippingPrice || shippingPriceError) {
      setFormError(
        shippingPriceError === "unavailable"
          ? "Cette société de livraison ne propose aucun tarif pour la wilaya sélectionnée. Choisissez une autre société ou wilaya."
          : shippingPriceError === "request"
            ? "Impossible de vérifier ce tarif de livraison. Actualisez la page et réessayez."
            : "Attendez le chargement du tarif de livraison avant de passer commande.",
      );
      return;
    }

    if (
      (directProduct?.sizes.length ?? 0) > 0 &&
      !selectedSize
    ) {
      setFormError("Choisissez une taille pour ce produit.");
      return;
    }

    if (
      (directProduct?.colors.length ?? 0) > 0 &&
      !selectedColor
    ) {
      setFormError("Choisissez une couleur pour ce produit.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await ordersApi.create({
        name: name.trim(),
        phoneNumber,
        wilayaCode,
        communeId: Number(communeId),
        shippingCompanyId: Number(companyId),
        products: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          size: line.size,
          color: line.color,
        })),
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
      });

      setReceipt({
        result,
        wilayaName: selectedWilaya?.name ?? wilayaCode,
        communeName: selectedCommune?.name ?? "Commune sélectionnée",
        companyName: selectedCompany?.name ?? "Société de livraison",
      });

      if (!directProduct) clearCart();
    } catch (error) {
      setFormError(describeOrderError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Button
        variant="ghost"
        className="mb-6 h-10 rounded-none px-0"
        render={<Link href={directProduct ? "/products" : "/cart"} />}
        nativeButton={false}
      >
        <ChevronLeft aria-hidden="true" />
        {directProduct ? "Retour aux produits" : "Retour au panier"}
      </Button>

      <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Finalisez votre commande
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">
            Saisissez vos informations de livraison. Payez en espèces à la réception de votre commande.
          </p>

          {initialDataError ? (
            <Alert variant="destructive" className="mt-8 rounded-none p-4">
              <AlertTitle>Impossible de charger les options de livraison</AlertTitle>
              <AlertDescription>
                Actualisez la page pour réessayer avant de passer commande.
              </AlertDescription>
            </Alert>
          ) : null}

          {formError ? (
            <Alert variant="destructive" className="mt-8 rounded-none p-4">
              <AlertTitle>Impossible de passer la commande</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <form className="mt-8 space-y-10" onSubmit={handleSubmit}>
            <fieldset className="space-y-5">
              <legend className="text-lg font-medium">Coordonnées</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="customer-name">Nom complet</Label>
                  <Input
                    id="customer-name"
                    name="name"
                    autoComplete="name"
                    maxLength={120}
                    placeholder="Votre nom complet"
                    className="h-12 rounded-none px-3"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="customer-phone">Numéro de téléphone</Label>
                  <Input
                    id="customer-phone"
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    pattern="0[0-9]{9}"
                    maxLength={10}
                    placeholder="05 55 12 34 56"
                    aria-describedby="phone-help"
                    className="h-12 rounded-none px-3"
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    required
                  />
                  <p id="phone-help" className="text-sm text-muted-foreground">
                    Saisissez 10 chiffres, en commençant par 0.
                  </p>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-5">
              <legend className="text-lg font-medium">Adresse de livraison</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <CheckoutSelect
                  label="Wilaya"
                  placeholder="Sélectionnez une wilaya"
                  value={wilayaCode}
                  onValueChange={handleWilayaChange}
                  disabled={initialDataError || isSubmitting}
                >
                  {initialWilayas.map((wilaya) => (
                    <SelectItem key={wilaya.code} value={wilaya.code}>
                      {wilaya.name}
                    </SelectItem>
                  ))}
                </CheckoutSelect>

                <CheckoutSelect
                  label="Commune"
                  placeholder={
                    communesLoading
                      ? "Chargement des communes…"
                      : wilayaCode
                        ? "Sélectionnez une commune"
                        : "Choisissez d’abord une wilaya"
                  }
                  value={communeId}
                  onValueChange={setCommuneId}
                  disabled={!wilayaCode || communesLoading || isSubmitting}
                >
                  {communes.map((commune) => (
                    <SelectItem key={commune.id} value={String(commune.id)}>
                      {commune.name}
                    </SelectItem>
                  ))}
                </CheckoutSelect>
              </div>
              {communesError ? (
                <p role="alert" className="text-sm text-destructive">
                  Impossible de charger les communes. Changez de wilaya ou actualisez la page.
                </p>
              ) : null}
            </fieldset>

            {directProduct ? (
              <fieldset className="space-y-5">
                <legend className="text-lg font-medium">Options du produit</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  {directProduct.sizes.length > 0 ? (
                    <CheckoutSelect
                      label="Taille"
                      placeholder="Choisissez une taille"
                      value={selectedSize}
                      onValueChange={setSelectedSize}
                      disabled={isSubmitting}
                    >
                      {directProduct.sizes.map((size) => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </CheckoutSelect>
                  ) : null}
                  {directProduct.colors.length > 0 ? (
                    <CheckoutSelect
                      label="Couleur"
                      placeholder="Choisissez une couleur"
                      value={selectedColor}
                      onValueChange={setSelectedColor}
                      disabled={isSubmitting}
                    >
                      {directProduct.colors.map((color) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </CheckoutSelect>
                  ) : null}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="space-y-5">
              <legend className="text-lg font-medium">Société de livraison</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <CheckoutSelect
                  label="Shipping company"
                  placeholder="Sélectionnez une société de livraison"
                  value={companyId}
                  onValueChange={handleCompanyChange}
                  disabled={initialDataError || isSubmitting}
                >
                  {initialCompanies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.name}
                    </SelectItem>
                  ))}
                </CheckoutSelect>
              </div>
              {initialCompanies.length === 0 && !initialDataError ? (
                <p className="text-sm text-muted-foreground">
                  Aucune société de livraison active n’est disponible pour le moment.
                </p>
              ) : null}
              {shippingPriceLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  Vérification du tarif de livraison…
                </p>
              ) : null}
              {shippingPriceError === "unavailable" ? (
                <p role="alert" className="text-sm text-destructive">
                  Cette société ne propose aucun tarif de livraison actif pour la
                  wilaya sélectionnée. Choisissez une autre société.
                </p>
              ) : null}
              {shippingPriceError === "request" ? (
                <p role="alert" className="text-sm text-destructive">
                  Impossible de vérifier le tarif de livraison. Actualisez la page et réessayez.
                </p>
              ) : null}
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-lg font-medium">Paiement</legend>
              <div className="flex items-start gap-4 border border-border p-4 sm:p-5">
                <Banknote aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Paiement à la livraison</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Payez le montant confirmé de la commande en espèces à la livraison.
                    Aucun paiement en ligne n’est nécessaire.
                  </p>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-lg font-medium">Code promo</legend>

              {couponStatus === "valid" && couponValidation?.valid ? (
                /* ── Applied coupon pill ── */
                <div className="flex items-center justify-between gap-3 border border-green-600/40 bg-green-50 px-4 py-3 dark:bg-green-950/30">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag aria-hidden="true" className="size-4 shrink-0 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      {couponValidation.code}
                    </span>
                    {couponValidation.discountPercentage > 0 ? (
                      <span className="text-green-600 dark:text-green-500">
                        — {couponValidation.discountPercentage}% de réduction appliquée
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-500">
                        — réduction appliquée lors de la commande
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    disabled={isSubmitting}
                    aria-label="Supprimer le code promo"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : (
                /* ── Coupon input + Apply button ── */
                <div className="grid gap-2">
                  <Label htmlFor="coupon-code">
                    Vous avez un code promo ?{" "}
                    <span className="font-normal text-muted-foreground">(facultatif)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon-code"
                      name="couponCode"
                      autoComplete="off"
                      maxLength={64}
                      placeholder="Saisissez le code promo"
                      className="h-12 rounded-none px-3 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                      value={couponInput}
                      onChange={(event) => handleCouponInputChange(event.target.value.toUpperCase())}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleApplyCoupon();
                        }
                      }}
                      disabled={isSubmitting || couponStatus === "validating"}
                      aria-describedby={
                        couponStatus === "invalid"
                          ? "coupon-error"
                          : couponStatus === "error"
                          ? "coupon-network-error"
                          : undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 shrink-0 rounded-none px-5"
                      onClick={() => void handleApplyCoupon()}
                      disabled={
                        !couponInput.trim() ||
                        isSubmitting ||
                        couponStatus === "validating"
                      }
                    >
                      {couponStatus === "validating" ? (
                        <>
                          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                          <span className="sr-only">Vérification…</span>
                        </>
                      ) : (
                        "Vérifier"
                      )}
                    </Button>
                  </div>

                  {/* Validation feedback */}
                  {couponStatus === "invalid" && couponValidation && !couponValidation.valid ? (
                    <p id="coupon-error" role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                      <X aria-hidden="true" className="size-3.5 shrink-0" />
                      {couponValidation.reason}
                    </p>
                  ) : null}
                  {couponStatus === "error" ? (
                    <p id="coupon-network-error" role="alert" className="text-sm text-destructive">
                      Impossible de vérifier le code promo. Il sera tout de même appliqué lors de la commande.
                    </p>
                  ) : null}
                </div>
              )}
            </fieldset>

            <div className="max-w-xl space-y-4 border-t border-border pt-6">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {appliedDiscount > 0 ? (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-500">
                    <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                    Code promo ({couponValidation?.valid ? couponValidation.discountPercentage : 0}% de réduction)
                  </span>
                  <span className="text-green-600 dark:text-green-500">
                    −{formatPrice(appliedDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Truck aria-hidden="true" className="size-4" />
                  Livraison
                </span>
                <span>
                  {shippingPrice
                    ? formatPrice(shippingPrice.price)
                    : shippingPriceLoading
                      ? "Vérification…"
                      : "Sélectionnez les détails de livraison"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-5">
                <span className="text-lg font-semibold">
                  {couponStatus === "valid" && couponValidation?.valid && couponValidation.discountPercentage === 0
                    ? "Total estimé avant le code promo"
                    : "Total estimé"}
                </span>
                <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {estimatedTotal === null ? "—" : formatPrice(estimatedTotal)}
                </span>
              </div>
              {couponStatus === "valid" && couponValidation?.valid && couponValidation.discountPercentage === 0 ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  La réduction sera confirmée et appliquée lors de la commande.
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full rounded-none sm:w-auto sm:min-w-64"
              disabled={
                isSubmitting ||
                initialDataError ||
                initialWilayas.length === 0 ||
                initialCompanies.length === 0 ||
                shippingPriceLoading
              }
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Commande en cours…
                </>
              ) : (
                "Commander et payer à la livraison"
              )}
            </Button>
          </form>
        </div>

        <aside className="h-fit border-y border-border py-6 lg:sticky lg:top-24 lg:col-span-5 lg:p-6">
          <h2 className="text-lg font-medium">Récapitulatif de la commande</h2>
          <ul className="mt-6 divide-y divide-border">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-4 py-4 first:pt-0">
                <div className="relative size-20 shrink-0 bg-muted sm:size-24">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt={line.title}
                      fill
                      sizes="96px"
                      className="object-contain p-2"
                    />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <p className="line-clamp-2 text-sm font-medium">{line.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      line.size ? `Taille ${line.size}` : null,
                      line.color ? `Couleur ${line.color}` : null,
                      `Qté ${line.quantity}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-sm font-bold">
                    {formatPrice(Number(line.price) * line.quantity)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            {directProduct
              ? "L’achat rapide commande cet article séparément et ne modifie pas votre panier."
              : "Votre panier sera vidé une fois la commande acceptée."}
          </p>
        </aside>
      </div>
    </section>
  );
}
