import React, { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  ShoppingBag,
  Tag,
  Ticket,
  BarChart3,
  MapPin,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { patchOrderStatus } from "@/features/dashboard";
import {
  filterByRange,
  filterPrevPeriod,
  computeKpis,
  computeDailySales,
  computeStatusBreakdown,
  computeTopProducts,
  computeTopWilayas,
  computeSizes,
  computeColors,
  computeSetupWarnings,
  pctChange,
  formatDZD,
  getWaitingHours,
  formatWaitTime,
  parseOrderDate,
  isValid,
} from "@/features/dashboard/helpers";
import type { DateRange, Order } from "@/features/dashboard/types";

// ─── Permission helpers ───────────────────────────────────────────────────────

function canManageOrders(admin: { type: string; permissions: string[] } | null | undefined): boolean {
  if (!admin) return false;
  if (admin.type === "super_admin") return true;
  return admin.permissions.includes("full_access") || admin.permissions.includes("order_management");
}

// ─── Date Range Selector ──────────────────────────────────────────────────────

const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7 days" },
  { value: "30days", label: "30 days" },
  { value: "all", label: "All time" },
];

function DateRangeSelect({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── KPI Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 50" className="h-10 w-24" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-primary/60"
      />
    </svg>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────

function Trend({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct === null)
    return <span className="text-xs text-muted-foreground">— no prior data</span>;

  const positive = inverse ? pct < 0 : pct > 0;
  const neutral = pct === 0;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        neutral
          ? "text-muted-foreground"
          : positive
          ? "text-[var(--chart-3)]"
          : "text-destructive"
      )}
    >
      {neutral ? (
        <Minus className="size-3" />
      ) : positive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  pct: number | null;
  inverseGood?: boolean;
  sparklineData?: number[];
  highlight?: boolean;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function KpiCard({
  label,
  value,
  pct,
  inverseGood = false,
  sparklineData,
  highlight,
  icon,
  isLoading,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className="gap-3 py-5">
        <CardHeader className="pb-0">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card
      className={cn(
        "gap-3 py-5 transition-shadow",
        highlight && "border-[var(--chart-4)] ring-1 ring-[var(--chart-4)]/40"
      )}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="text-muted-foreground/60">{icon}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {sparklineData && <Sparkline data={sparklineData} />}
        </div>
        <Trend pct={pct} inverse={inverseGood} />
      </CardContent>
    </Card>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-[var(--chart-4)]/20 text-[var(--chart-4)] border-[var(--chart-4)]/30" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary border-primary/30" },
  delivered:   { label: "delivered",   className: "bg-[var(--chart-3)]/20 text-[var(--chart-3)] border-[var(--chart-3)]/30" },
  canceled:  { label: "Canceled",  className: "bg-destructive/15 text-destructive border-destructive/30" },
  returned:  { label: "Returned",  className: "bg-muted text-muted-foreground border-border" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: "border-border" };
  return (
    <Badge variant="outline" className={cn("capitalize", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Needs Attention: Pending Orders ─────────────────────────────────────────

function PendingOrderRow({
  order,
  wilayaName,
  now,
  onConfirm,
  onCancel,
}: {
  order: Order;
  wilayaName: string;
  now: Date;
  onConfirm: (id: string | number) => void;
  onCancel: (id: string | number) => void;
}) {
  const hours = getWaitingHours(order, now);
  const overdue = hours > 24;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm",
        overdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 font-medium">
          {overdue && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}
          <span className="truncate">{order.name}</span>
        </div>
        <a
          href={`tel:${order.phoneNumber}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <Phone className="size-3" />
          {order.phoneNumber}
        </a>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" />
        {wilayaName}
      </div>

      <div className="font-semibold tabular-nums">{formatDZD(parseFloat(order.total) || 0)}</div>

      <div
        className={cn(
          "flex items-center gap-1 text-xs",
          overdue ? "font-semibold text-destructive" : "text-muted-foreground"
        )}
      >
        <Clock className="size-3" />
        {formatWaitTime(hours)}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={() => onConfirm(order.id)}>
          <CheckCircle className="size-3.5" />
          Confirm
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <XCircle className="size-3.5" />
              Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel order #{order.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. The order for <strong>{order.name}</strong> ({formatDZD(parseFloat(order.total) || 0)}) will be permanently marked as canceled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onCancel(order.id)}
              >
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Setup Warning Item ───────────────────────────────────────────────────────

function WarningItem({ label, detail, type }: { label: string; detail: string; type: string }) {
  const isExpired = type === "expired_coupon" || type === "inactive_company";
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        isExpired
          ? "border-destructive/30 bg-destructive/5"
          : "border-[var(--chart-4)]/30 bg-[var(--chart-4)]/5"
      )}
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 size-4 shrink-0",
          isExpired ? "text-destructive" : "text-[var(--chart-4)]"
        )}
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatDZD(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────

export default function HomePage() {
  const [range, setRange] = useState<DateRange>("30days");
  const now = useMemo(() => new Date(), []);

  const {
    orders,
    products,
    categories,
    wilayas,
    shippingCompanies,
    // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
    // shippingPrices,
    coupons,
    admin,
    isLoading,
  } = useDashboardData();

  const queryClient = useQueryClient();

  // ── Mutations ────────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) =>
      patchOrderStatus(id, status),
    onSuccess: (_, { id, status }) => {
      toast.success(`Order #${id} marked as ${status}`);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "orders"] });
    },
    onError: (_, { id }) => {
      toast.error(`Could not update order #${id}. It may already be canceled or returned.`);
    },
  });

  // ── Permission ───────────────────────────────────────────────────────────
  const canOrders = canManageOrders(admin);

  // ── Filtered orders ──────────────────────────────────────────────────────
  const currentOrders = useMemo(
    () => filterByRange(orders, range, now),
    [orders, range, now]
  );
  const prevOrders = useMemo(
    () => filterPrevPeriod(orders, range, now),
    [orders, range, now]
  );

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(
    () => computeKpis(currentOrders, prevOrders, orders),
    [currentOrders, prevOrders, orders]
  );

  // ── Charts ───────────────────────────────────────────────────────────────
  const dailySales = useMemo(
    () => computeDailySales(orders, range, now),
    [orders, range, now]
  );
  const statusBreakdown = useMemo(
    () => computeStatusBreakdown(currentOrders),
    [currentOrders]
  );
  const statusPieData = [
    { name: "Pending",   value: statusBreakdown.pending,   color: "var(--chart-4)" },
    { name: "Confirmed", value: statusBreakdown.confirmed, color: "var(--chart-1)" },
    { name: "delivered",   value: statusBreakdown.delivered,   color: "var(--chart-3)" },
    { name: "Canceled",  value: statusBreakdown.canceled,  color: "var(--destructive)" },
    { name: "Returned",  value: statusBreakdown.returned,  color: "var(--muted-foreground)" },
  ].filter((d) => d.value > 0);

  // ── Needs attention ───────────────────────────────────────────────────────
  const pendingOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === "pending")
        .sort((a, b) => parseOrderDate(a).getTime() - parseOrderDate(b).getTime()),
    [orders]
  );
  const confirmedWaitingShip = useMemo(
    () =>
      orders
        .filter((o) => o.status === "confirmed")
        .sort((a, b) => parseOrderDate(a).getTime() - parseOrderDate(b).getTime()),
    [orders]
  );
  const warnings = useMemo(
    // TODO: shipping prices — shippingPrices arg removed until GET /api/shipping/prices is implemented on the backend
    () => computeSetupWarnings(orders, shippingCompanies, coupons, wilayas),
    [orders, shippingCompanies, coupons, wilayas]
  );

  // ── Breakdowns ────────────────────────────────────────────────────────────
  const topProducts = useMemo(
    () => computeTopProducts(currentOrders, products),
    [currentOrders, products]
  );
  const topWilayas = useMemo(
    () => computeTopWilayas(currentOrders, wilayas),
    [currentOrders, wilayas]
  );
  const topSizes = useMemo(() => computeSizes(currentOrders), [currentOrders]);
  const topColors = useMemo(() => computeColors(currentOrders), [currentOrders]);

  // ── Wilaya map for rendering ──────────────────────────────────────────────
  const wilayaMap = useMemo(
    () => new Map(wilayas.map((w) => [String(w.code), w.name])),
    [wilayas]
  );

  // ── Store snapshot ────────────────────────────────────────────────────────
  const promoProducts = products.filter(
    (p) => p.promo != null && p.promo !== "" && Number(p.promo) > 0
  );
  const activeCoupons = coupons.filter((c) => c.status === "active");

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, [now]);

  // ── Sparkline data (daily sales over current period) ─────────────────────
  const sparkNetSales = dailySales.map((d) => d.current);
  const sparkOrders = useMemo(() => {
    const agg: Record<string, number> = {};
    for (const o of currentOrders) {
      if (!isValid(o)) continue;
      agg[o.date] = (agg[o.date] ?? 0) + 1;
    }
    return Object.values(agg);
  }, [currentOrders]);

  // ── Recent orders (last 8) ────────────────────────────────────────────────
  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-10">
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}{admin ? `, ${admin.username}` : ""}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString("en-DZ", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <DateRangeSelect value={range} onChange={setRange} />
      </div>

      {/* ── 2. KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Net Sales"
          value={formatDZD(kpis.netSales)}
          pct={pctChange(kpis.netSales, kpis.netSalesPrev)}
          sparklineData={sparkNetSales}
          icon={<BarChart3 className="size-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Orders"
          value={kpis.orderCount}
          pct={pctChange(kpis.orderCount, kpis.orderCountPrev)}
          sparklineData={sparkOrders}
          icon={<Package className="size-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Avg. Order Value"
          value={formatDZD(kpis.avgOrderValue)}
          pct={pctChange(kpis.avgOrderValue, kpis.avgOrderValuePrev)}
          icon={<TrendingUp className="size-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Pending Orders"
          value={kpis.pendingCount}
          pct={null}
          highlight={kpis.pendingCount > 0}
          icon={<Clock className="size-4" />}
          isLoading={isLoading}
        />
        <KpiCard
          label="Return Rate"
          value={`${(kpis.cancelReturnRate * 100).toFixed(1)}%`}
          pct={pctChange(kpis.cancelReturnRate, kpis.cancelReturnRatePrev)}
          inverseGood
          icon={<XCircle className="size-4" />}
          isLoading={isLoading}
        />
      </div>

      {/* ── 3. Needs Attention ─────────────────────────────────────────────── */}
      {(canOrders || warnings.length > 0) && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="size-5 text-[var(--chart-4)]" />
            Needs Attention
          </h2>

          {/* Pending orders */}
          {canOrders && pendingOrders.length > 0 && (
            <Card className="gap-3 py-5">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">
                  Pending Orders ({pendingOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingOrders.map((order) => (
                  <PendingOrderRow
                    key={order.id}
                    order={order}
                    wilayaName={wilayaMap.get(String(order.wilayaCode)) ?? String(order.wilayaCode)}
                    now={now}
                    onConfirm={(id) => statusMutation.mutate({ id, status: "confirmed" })}
                    onCancel={(id) => statusMutation.mutate({ id, status: "canceled" })}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Confirmed → ship */}
          {canOrders && confirmedWaitingShip.length > 0 && (
            <Card className="gap-3 py-5">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">
                  Ready to Ship ({confirmedWaitingShip.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {confirmedWaitingShip.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{order.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {wilayaMap.get(String(order.wilayaCode)) ?? order.wilayaCode}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatDZD(parseFloat(order.total) || 0)}
                    </span>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatWaitTime(getWaitingHours(order, now))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: order.id, status: "delivered" })}
                    >
                      <Truck className="size-3.5" />
                      Ship
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Setup warnings */}
          {warnings.length > 0 && (
            <Card className="gap-3 py-5">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold">
                  Setup Warnings ({warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {warnings.map((w, i) => (
                  <WarningItem key={i} {...w} />
                ))}
              </CardContent>
            </Card>
          )}

          {!isLoading &&
            !canOrders &&
            pendingOrders.length === 0 &&
            confirmedWaitingShip.length === 0 &&
            warnings.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                All good — nothing needs immediate attention.
              </div>
            )}
        </section>
      )}

      {/* ── 4. Charts ──────────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Sales over time */}
        <Card className="lg:col-span-2 gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Sales Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : dailySales.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailySales} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5)} // MM-DD
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="previous"
                    name="Previous"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#gPrev)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    name="Current"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#gCurrent)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status donut */}
        <Card className="gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="mx-auto h-48 w-48 rounded-full" />
            ) : statusPieData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [value, ""]}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 5. Breakdowns ──────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 Products */}
        <Card className="gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top 5 Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No sales yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-right text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="size-9 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="size-9 rounded-md border bg-muted flex items-center justify-center">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.unitsSold} units · {formatDZD(p.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Wilayas */}
        <Card className="gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top 5 Wilayas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topWilayas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-3">
                {topWilayas.map((w, i) => {
                  const maxOrders = topWilayas[0]?.orderCount ?? 1;
                  return (
                    <div key={w.code} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="text-xs text-muted-foreground">{i + 1}.</span>
                          {w.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {w.orderCount} orders · {formatDZD(w.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${(w.orderCount / maxOrders) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Ordered Sizes */}
        <Card className="gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Most Ordered Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : topSizes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No size data</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topSizes.slice(0, 15).map(({ size, count }) => (
                  <div
                    key={size}
                    className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-center"
                  >
                    <span className="text-sm font-semibold">{size}</span>
                    <span className="text-xs text-muted-foreground">{count} units</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Ordered Colors */}
        <Card className="gap-3 py-5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Most Ordered Colors</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : topColors.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No color data</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topColors.slice(0, 15).map(({ color, count }) => {
                  // Try to show a swatch if the value looks like a CSS color
                  const isNamedColor = /^[a-z]+$/i.test(color) || /^#/.test(color);
                  return (
                    <div
                      key={color}
                      className="flex flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-2 text-center"
                    >
                      {isNamedColor && (
                        <span
                          className="mb-1 size-5 rounded-full border border-border"
                          style={{ background: color }}
                        />
                      )}
                      <span className="text-sm font-semibold capitalize">{color}</span>
                      <span className="text-xs text-muted-foreground">{count} units</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 6. Recent Orders Table ─────────────────────────────────────────── */}
      <section>
        <Card className="gap-3 py-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Orders</CardTitle>
              <Link
                to="/orders"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["#", "Customer", "Wilaya", "Total", "Status", "Date"].map((h) => (
                        <th
                          key={h}
                          className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground last:pr-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="group hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                          <Link
                            to={`/orders`}
                            className="hover:text-primary group-hover:underline"
                          >
                            #{order.id}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-4 font-medium max-w-[140px] truncate">
                          {order.name}
                        </td>
                        <td className="py-2.5 pr-4 text-muted-foreground">
                          {wilayaMap.get(String(order.wilayaCode)) ?? order.wilayaCode}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold tabular-nums">
                          {formatDZD(parseFloat(order.total) || 0)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {order.date} {order.hour.slice(0, 5)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── 7. Store Snapshot ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Store Snapshot</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: "Products",
              value: products.length,
              icon: <ShoppingBag className="size-5" />,
              to: "/products",
              color: "text-primary",
            },
            {
              label: "On Promo",
              value: promoProducts.length,
              icon: <Tag className="size-5" />,
              to: "/products",
              color: "text-[var(--chart-3)]",
            },
            {
              label: "Categories",
              value: categories.length,
              icon: <BarChart3 className="size-5" />,
              to: "/categories",
              color: "text-[var(--chart-4)]",
            },
            {
              label: "Active Coupons",
              value: activeCoupons.length,
              icon: <Ticket className="size-5" />,
              to: "/coupons",
              color: "text-[var(--chart-2)]",
            },
          ].map(({ label, value, icon, to, color }) => (
            <Link key={label} to={to} className="group">
              <Card className="gap-2 py-5 transition-shadow group-hover:shadow-md">
                <CardContent className="flex flex-col items-center gap-2 text-center">
                  <span className={cn("rounded-lg bg-muted p-2.5", color)}>{icon}</span>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <span className="text-2xl font-bold">{value}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
