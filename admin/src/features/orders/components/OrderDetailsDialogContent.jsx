import { useEffect, useState } from "react";
import { Image, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useGetOrder } from "@/features/orders";
import { useGetProduct } from "@/features/products/hooks/useGetProduct";
import { useGetShippingCompanies } from "@/features/shippings";

function formatDzd(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `${amount.toLocaleString("fr-DZ", { maximumFractionDigits: 2 })} DZD`
    : "—";
}

function DetailField({ label, value }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function OrderProductLine({ item }) {
  const { data: productResponse, isLoading } = useGetProduct(item.productId);
  const product = productResponse?.data;
  const title = item.title || product?.title || "Product";
  const imageUrl = product?.images?.[0];
  const [imageUnavailable, setImageUnavailable] = useState(false);

  useEffect(() => {
    setImageUnavailable(false);
  }, [imageUrl]);

  const quantity = Number(item.quantity);
  const lineTotal = Number(item.price) * quantity;
  const colorHex = item.colorHex?.replace(/^#/, "").toUpperCase();
  const hasValidColorHex = Boolean(colorHex && /^[0-9A-F]{6}$/.test(colorHex));
  const colorLabel = item.color || (hasValidColorHex ? `#${colorHex}` : null);

  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {imageUrl && !imageUnavailable ? (
          <img
            src={imageUrl}
            alt={title}
            className="size-full object-cover"
            onError={() => setImageUnavailable(true)}
          />
        ) : (
          <Image className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">
          {title}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {quantity} × {formatDzd(item.price)}
        </p>
        {(colorLabel || item.size) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {colorLabel && (
              <span className="inline-flex items-center gap-1.5">
                {hasValidColorHex && (
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: `#${colorHex}` }}
                  />
                )}
                <span>
                  {colorLabel}
                  {item.color && hasValidColorHex ? ` (#${colorHex})` : ""}
                </span>
              </span>
            )}
            {colorLabel && item.size ? " · " : ""}
            {item.size && `Size ${item.size}`}
          </p>
        )}
        {isLoading && !imageUrl && (
          <p className="mt-1 text-xs text-muted-foreground">Loading product image…</p>
        )}
      </div>

      <p className="shrink-0 self-center text-right text-sm font-semibold tabular-nums">
        {formatDzd(lineTotal)}
      </p>
    </li>
  );
}

function OrderDetailsDialogContent({
  order: orderFromList,
  wilayaName,
  wilayasLoading,
  communeName,
  communesLoading,
}) {
  const { data: orderResponse, isLoading: orderLoading, isError: orderError } =
    useGetOrder(orderFromList.id);
  const { data: companiesResponse, isLoading: companiesLoading } =
    useGetShippingCompanies();

  const order = orderResponse?.data ?? orderFromList;
  const shippingCompany = (companiesResponse?.data ?? []).find(
    (company) => company.id === order.shippingCompanyId,
  );

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader className="pr-7">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>Order #{order.id}</DialogTitle>
          <Badge variant="secondary" className="capitalize">
            {order.status}
          </Badge>
        </div>
        <DialogDescription>Customer, delivery, and product details.</DialogDescription>
      </DialogHeader>

      {orderLoading && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Loading the latest order information…
        </p>
      )}
      {orderError && (
        <p role="status" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          The latest order information could not be loaded. Showing the details from the order list.
        </p>
      )}

      <section aria-label="Customer information" className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <DetailField label="Customer" value={order.name} />
        <DetailField label="Phone number" value={order.phoneNumber} />
      </section>

      <section aria-label="Delivery information" className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <DetailField
          label="Wilaya"
          value={wilayasLoading ? "Loading…" : wilayaName || "Unavailable"}
        />
        <DetailField
          label="Commune"
          value={communesLoading ? "Loading…" : communeName || "Unavailable"}
        />
        <DetailField
          label="Shipping company"
          value={companiesLoading ? "Loading…" : shippingCompany?.name || "Unavailable"}
        />
        <DetailField label="Order date" value={order.date} />
        <DetailField label="Order time" value={order.hour} />
      </section>

      <Separator />

      <section aria-label="Ordered products" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Products</h3>
          <span className="text-xs text-muted-foreground">
            {order.products?.length ?? 0} {(order.products?.length ?? 0) === 1 ? "item" : "items"}
          </span>
        </div>
        {order.products?.length ? (
          <ul className="space-y-2">
            {order.products.map((item, index) => (
              <OrderProductLine key={`${item.productId}-${index}`} item={item} />
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            No product details are available for this order.
          </p>
        )}
      </section>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-medium">Order total</span>
        <span className="text-base font-semibold tabular-nums">{formatDzd(order.total)}</span>
      </div>
    </DialogContent>
  );
}

export default OrderDetailsDialogContent;
