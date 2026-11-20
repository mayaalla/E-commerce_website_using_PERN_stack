import * as React from "react";
import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

import { useGetOrders } from "@/features/orders";
import AddOrderWindow from "./AddOrderWindow";
import OrderTable from "./OrderTable";

// ─── Constants ────────────────────────────────────────────────────────────────
const ORDER_STATUSES = ["pending", "confirmed", "delivered", "canceled", "returned"];
const SORT_COLUMNS = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "total", label: "Total" },
  { value: "date", label: "Date" },
  { value: "status", label: "Status" },
  { value: "wilayaCode", label: "Wilaya" },
];
const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "delivered",
  canceled: "Canceled",
  returned: "Returned",
};

// ─── SortButton ───────────────────────────────────────────────────────────────
function SortButton({ column, currentSortBy, currentSortOrder, onSort }) {
  const isActive = currentSortBy === column.value;
  const nextOrder =
    isActive && currentSortOrder === "asc" ? "desc" : "asc";
  const Icon = isActive
    ? currentSortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={() => onSort(column.value, nextOrder)}
      className="h-8 gap-1.5 text-xs"
    >
      <Icon className="size-3" aria-hidden="true" />
      {column.label}
    </Button>
  );
}

// ─── OrderPannel ──────────────────────────────────────────────────────────────
function OrderPannel() {
  // ── Filter / sort / pagination state ──────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(undefined);
  const [wilayaCode, setWilayaCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  // ── Debounce search ────────────────────────────────────────────────────────
  const searchTimer = React.useRef(null);
  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  }

  // ── Build query params ─────────────────────────────────────────────────────
  const params = React.useMemo(() => {
    const p = { page, limit, sortBy, sortOrder };
    if (debouncedSearch) p.search = debouncedSearch;
    if (status) p.status = status;
    if (wilayaCode.trim()) p.wilayaCode = wilayaCode.trim();
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (totalMin !== "") p.totalMin = Number(totalMin);
    if (totalMax !== "") p.totalMax = Number(totalMax);
    return p;
  }, [page, limit, sortBy, sortOrder, debouncedSearch, status, wilayaCode, dateFrom, dateTo, totalMin, totalMax]);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
    error: ordersErr,
    refetch: refetchOrders,
    isFetching,
  } = useGetOrders(params);

  const orders = ordersData?.data ?? [];
  const paginationMeta = ordersData?.pagination;
  const total = paginationMeta?.total ?? 0;
  const totalPages = paginationMeta?.totalPages ?? 1;
  const isLoading = ordersLoading;

  // ── Active filters count ───────────────────────────────────────────────────
  const activeFilters = [
    status,
    wilayaCode.trim(),
    dateFrom,
    dateTo,
    totalMin,
    totalMax,
  ].filter(Boolean).length;

  function handleSort(col, order) {
    setSortBy(col);
    setSortOrder(order);
    setPage(1);
  }

  function resetFilters() {
    setStatus(undefined);
    setWilayaCode("");
    setDateFrom("");
    setDateTo("");
    setTotalMin("");
    setTotalMax("");
    setPage(1);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="gap-0 py-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        </div>
        <div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0"
            >
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 max-w-[160px] rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse ml-auto" />
              <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
              <div className="h-7 w-16 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (ordersError) {
    return (
      <Card className="py-5">
        <CardContent>
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">Failed to load orders</p>
              <p className="text-muted-foreground">
                {ordersErr?.message ?? "An unexpected error occurred."}
              </p>
              <button
                onClick={() => refetchOrders()}
                className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline self-start"
              >
                Try again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Loaded ───────────────────────────────────────────────────────────────
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <CardHeader className="border-b border-border px-6 py-4 gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">All Orders</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {isFetching
                ? "Loading…"
                : total === 0
                ? "No orders found"
                : `${total} ${total === 1 ? "order" : "orders"} active`}
            </CardDescription>
          </div>
          <AddOrderWindow />
        </div>

        {/* ── Toolbar: search + filters + sort ─────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Row 1: search + filter popover */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search by name, phone, ID, wilaya…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-8 text-xs"
                aria-label="Search orders"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  Filters
                  {activeFilters > 0 && (
                    <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full">
                      {activeFilters}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Filters
                  </p>

                  {/* Status */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={status ?? "all"}
                      onValueChange={(v) => { setStatus(v === "all" ? undefined : v); setPage(1); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wilaya code */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Wilaya code</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 16"
                      maxLength={2}
                      value={wilayaCode}
                      onChange={(e) => { setWilayaCode(e.target.value); setPage(1); }}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Date range */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Date range</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                      <span className="text-muted-foreground text-xs shrink-0">—</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Total range */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Total range (DZD)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={totalMin}
                        onChange={(e) => { setTotalMin(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                      <span className="text-muted-foreground text-xs shrink-0">—</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={totalMax}
                        onChange={(e) => { setTotalMax(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Reset */}
                  {activeFilters > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 w-full gap-1"
                    >
                      <X className="size-3" /> Reset filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

          </div>

          {/* Row 2: sort buttons */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground shrink-0">Sort by:</span>
            {SORT_COLUMNS.map((col) => (
              <SortButton
                key={col.value}
                column={col}
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={handleSort}
              />
            ))}
          </div>

          <p className="text-xs text-primary">
            To view an order’s details, click its ID.
          </p>

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {status && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5 capitalize">
                  Status: {STATUS_LABELS[status]}
                  <button onClick={() => { setStatus(undefined); setPage(1); }} aria-label="Remove status filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {wilayaCode.trim() && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Wilaya: {wilayaCode}
                  <button onClick={() => { setWilayaCode(""); setPage(1); }} aria-label="Remove wilaya filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Date: {dateFrom || "…"} – {dateTo || "…"}
                  <button onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }} aria-label="Remove date filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {(totalMin || totalMax) && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Total: {totalMin || "0"} – {totalMax || "∞"} DZD
                  <button onClick={() => { setTotalMin(""); setTotalMax(""); setPage(1); }} aria-label="Remove total filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <CardContent className="p-0">
        <OrderTable
          orders={orders}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

export default OrderPannel;
