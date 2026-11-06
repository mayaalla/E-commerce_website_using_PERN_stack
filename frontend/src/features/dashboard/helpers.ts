import type {
  Order,
  OrderStatus,
  DateRange,
  KpiData,
  DailySalesPoint,
  StatusBreakdown,
  TopProduct,
  TopWilaya,
  SizeCount,
  ColorCount,
  SetupWarning,
  ShippingCompany,
  ShippingPrice,
  Coupon,
  Wilaya,
  Product,
} from "./types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function parseOrderDate(order: Order): Date {
  return new Date(`${order.date}T${order.hour}`);
}

export function getRangeMs(range: Exclude<DateRange, "all">): number {
  const DAY = 86_400_000;
  if (range === "today") return DAY;
  if (range === "7days") return 7 * DAY;
  return 30 * DAY;
}

export function getDateBounds(range: DateRange, now: Date): { currentStart: Date; prevStart: Date } {
  if (range === "all") {
    return { currentStart: new Date(0), prevStart: new Date(0) };
  }
  const ms = getRangeMs(range);
  const currentStart = new Date(now.getTime() - ms);
  const prevStart = new Date(now.getTime() - 2 * ms);
  return { currentStart, prevStart };
}

// ─── Order classification ─────────────────────────────────────────────────────

export const isValid = (o: Order): boolean =>
  o.status !== "canceled" && o.status !== "returned";

export const isCanceledOrReturned = (o: Order): boolean =>
  o.status === "canceled" || o.status === "returned";

export function filterByRange(orders: Order[], range: DateRange, now: Date): Order[] {
  if (range === "all") return orders;
  const { currentStart } = getDateBounds(range, now);
  return orders.filter((o) => parseOrderDate(o) >= currentStart);
}

export function filterPrevPeriod(orders: Order[], range: DateRange, now: Date): Order[] {
  if (range === "all") return [];
  const ms = getRangeMs(range);
  const currentStart = new Date(now.getTime() - ms);
  const prevStart = new Date(now.getTime() - 2 * ms);
  return orders.filter((o) => {
    const d = parseOrderDate(o);
    return d >= prevStart && d < currentStart;
  });
}

// ─── Money helpers ────────────────────────────────────────────────────────────

export const parseMoney = (v: string | number): number =>
  typeof v === "number" ? v : parseFloat(v) || 0;

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── KPI calculations ─────────────────────────────────────────────────────────

export function computeNetSales(orders: Order[]): number {
  return orders.filter(isValid).reduce((s, o) => s + parseMoney(o.total), 0);
}

export function computeOrderCount(orders: Order[]): number {
  return orders.length;
}

export function computeAvgOrderValue(orders: Order[]): number {
  const valid = orders.filter(isValid);
  if (valid.length === 0) return 0;
  return computeNetSales(orders) / valid.length;
}

export function computeCancelReturnRate(orders: Order[]): number {
  if (orders.length === 0) return 0;
  return orders.filter(isCanceledOrReturned).length / orders.length;
}

export function computeKpis(
  currentOrders: Order[],
  prevOrders: Order[],
  allOrders: Order[]
): KpiData {
  return {
    netSales: computeNetSales(currentOrders),
    netSalesPrev: computeNetSales(prevOrders),
    orderCount: computeOrderCount(currentOrders),
    orderCountPrev: computeOrderCount(prevOrders),
    avgOrderValue: computeAvgOrderValue(currentOrders),
    avgOrderValuePrev: computeAvgOrderValue(prevOrders),
    pendingCount: allOrders.filter((o) => o.status === "pending").length,
    cancelReturnRate: computeCancelReturnRate(currentOrders),
    cancelReturnRatePrev: computeCancelReturnRate(prevOrders),
  };
}

// ─── Trend / percent change ───────────────────────────────────────────────────

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// ─── Daily sales chart data ───────────────────────────────────────────────────

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function computeDailySales(
  orders: Order[],
  range: DateRange,
  now: Date
): DailySalesPoint[] {
  if (range === "all") {
    // group by month if all time
    const grouped: Record<string, { current: number; previous: number }> = {};
    for (const o of orders) {
      const d = parseOrderDate(o);
      const key = o.date.slice(0, 7); // YYYY-MM
      if (!grouped[key]) grouped[key] = { current: 0, previous: 0 };
      if (isValid(o)) grouped[key].current += parseMoney(o.total);
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }

  const ms = getRangeMs(range);
  const currentStart = new Date(now.getTime() - ms);
  const prevStart = new Date(now.getTime() - 2 * ms);

  const grouped: Record<string, { current: number; previous: number }> = {};

  // Build day slots for current period
  for (let i = 0; i < ms / 86_400_000; i++) {
    const d = new Date(currentStart.getTime() + i * 86_400_000);
    grouped[dateKey(d)] = { current: 0, previous: 0 };
  }

  for (const o of orders) {
    if (!isValid(o)) continue;
    const d = parseOrderDate(o);
    const amount = parseMoney(o.total);
    if (d >= currentStart && d <= now) {
      const key = dateKey(d);
      if (!grouped[key]) grouped[key] = { current: 0, previous: 0 };
      grouped[key].current += amount;
    } else if (d >= prevStart && d < currentStart) {
      // Map previous period to current period offset
      const offset = d.getTime() - prevStart.getTime();
      const mappedDate = new Date(currentStart.getTime() + offset);
      const key = dateKey(mappedDate);
      if (!grouped[key]) grouped[key] = { current: 0, previous: 0 };
      grouped[key].previous += amount;
    }
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

// ─── Status breakdown ─────────────────────────────────────────────────────────

export function computeStatusBreakdown(orders: Order[]): StatusBreakdown {
  const result: StatusBreakdown = {
    pending: 0,
    confirmed: 0,
    shipped: 0,
    canceled: 0,
    returned: 0,
  };
  for (const o of orders) {
    result[o.status as OrderStatus] = (result[o.status as OrderStatus] || 0) + 1;
  }
  return result;
}

// ─── Top products ─────────────────────────────────────────────────────────────

export function computeTopProducts(
  orders: Order[],
  products: Product[],
  topN = 5
): TopProduct[] {
  const productMap = new Map(products.map((p) => [String(p.id), p]));
  const agg: Map<string, { title: string; image?: string; units: number; revenue: number }> =
    new Map();

  for (const o of orders) {
    if (!isValid(o)) continue;
    for (const item of o.products) {
      const pid = String(item.productId);
      const existing = agg.get(pid) ?? {
        title: item.title,
        image: productMap.get(pid)?.image,
        units: 0,
        revenue: 0,
      };
      existing.units += item.quantity;
      existing.revenue += parseMoney(item.price) * item.quantity;
      agg.set(pid, existing);
    }
  }

  return Array.from(agg.entries())
    .map(([id, v]) => ({
      productId: id,
      title: v.title,
      image: v.image,
      unitsSold: v.units,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, topN);
}

// ─── Top wilayas ──────────────────────────────────────────────────────────────

export function computeTopWilayas(
  orders: Order[],
  wilayas: Wilaya[],
  topN = 5
): TopWilaya[] {
  const wilayaMap = new Map(wilayas.map((w) => [String(w.code), w.name]));
  const agg: Map<string, { name: string; count: number; revenue: number }> = new Map();

  for (const o of orders) {
    if (!isValid(o)) continue;
    const code = String(o.wilayaCode);
    const existing = agg.get(code) ?? {
      name: wilayaMap.get(code) ?? code,
      count: 0,
      revenue: 0,
    };
    existing.count += 1;
    existing.revenue += parseMoney(o.total);
    agg.set(code, existing);
  }

  return Array.from(agg.entries())
    .map(([code, v]) => ({
      code,
      name: v.name,
      orderCount: v.count,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, topN);
}

// ─── Sizes and colors ─────────────────────────────────────────────────────────

export function computeSizes(orders: Order[]): SizeCount[] {
  const agg: Record<string, number> = {};
  for (const o of orders) {
    if (!isValid(o)) continue;
    for (const item of o.products) {
      if (item.size) {
        agg[item.size] = (agg[item.size] ?? 0) + item.quantity;
      }
    }
  }
  return Object.entries(agg)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeColors(orders: Order[]): ColorCount[] {
  const agg: Record<string, number> = {};
  for (const o of orders) {
    if (!isValid(o)) continue;
    for (const item of o.products) {
      if (item.color) {
        agg[item.color] = (agg[item.color] ?? 0) + item.quantity;
      }
    }
  }
  return Object.entries(agg)
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

// ─── Setup warnings ───────────────────────────────────────────────────────────

export function computeSetupWarnings(
  orders: Order[],
  shippingCompanies: ShippingCompany[],
  shippingPrices: ShippingPrice[],
  coupons: Coupon[],
  wilayas: Wilaya[]
): SetupWarning[] {
  const warnings: SetupWarning[] = [];
  const today = new Date();
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 86_400_000);

  // Active shipping companies
  const activeCompanies = shippingCompanies.filter((c) => c.status === "active");

  // Inactive companies
  const inactiveCompanies = shippingCompanies.filter((c) => c.status !== "active");
  for (const c of inactiveCompanies) {
    warnings.push({
      type: "inactive_company",
      label: `Inactive shipping company`,
      detail: `"${c.name}" is inactive — orders cannot be shipped via this carrier`,
    });
  }

  // Wilayas covered by orders but missing a price for active companies
  const orderedWilayas = new Set(orders.filter(isValid).map((o) => String(o.wilayaCode)));
  const wilayaMap = new Map(wilayas.map((w) => [String(w.code), w.name]));
  const coveredPairs = new Set(
    shippingPrices.map((p) => `${p.wilayaCode}:${p.shippingCompanyId}`)
  );

  for (const code of orderedWilayas) {
    for (const company of activeCompanies) {
      const key = `${code}:${company.id}`;
      if (!coveredPairs.has(key)) {
        warnings.push({
          type: "missing_shipping_price",
          label: `Missing shipping price`,
          detail: `No price set for ${wilayaMap.get(code) ?? code} with ${company.name}`,
        });
      }
    }
  }

  // Coupon warnings
  for (const coupon of coupons) {
    const expDate = new Date(coupon.expireDate);
    if (coupon.status === "active" && expDate < today) {
      warnings.push({
        type: "expired_coupon",
        label: `Expired active coupon`,
        detail: `Coupon "${coupon.code}" expired on ${expDate.toLocaleDateString("fr-DZ")} but is still active`,
      });
    } else if (coupon.status === "active" && expDate <= sevenDaysFromNow) {
      warnings.push({
        type: "expiring_coupon",
        label: `Coupon expiring soon`,
        detail: `Coupon "${coupon.code}" expires on ${expDate.toLocaleDateString("fr-DZ")}`,
      });
    }
  }

  return warnings;
}

// ─── Wait time ────────────────────────────────────────────────────────────────

export function getWaitingHours(order: Order, now: Date): number {
  const created = parseOrderDate(order);
  return (now.getTime() - created.getTime()) / 3_600_000;
}

export function formatWaitTime(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}
