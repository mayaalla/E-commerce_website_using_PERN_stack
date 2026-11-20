import * as React from "react";
import { useState } from "react";
import {
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

import { useGetProducts } from "@/features/products";
import { useGetCategories } from "@/features/categories";
import AddProductWindow from "./AddProductWindow";
import ProductTable from "./ProductTable";

// ─── Constants ────────────────────────────────────────────────────────────────
const CLOTHING_SIZES = ["34", "36", "38", "40", "42", "44", "46", "48"];
const SORT_COLUMNS = [
  { value: "id", label: "ID" },
  { value: "title", label: "Title" },
  { value: "price", label: "Price" },
  { value: "promo", label: "Promo" },
  { value: "categoryId", label: "Category" },
];

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

// ─── ProductPannel ────────────────────────────────────────────────────────────
function ProductPannel() {
  // ── Filter / sort / pagination state ──────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState(undefined);
  const [size, setSize] = useState(undefined);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [hasPromo, setHasPromo] = useState(undefined);
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
    if (categoryId) p.categoryId = Number(categoryId);
    if (size) p.size = size;
    if (priceMin !== "") p.priceMin = Number(priceMin);
    if (priceMax !== "") p.priceMax = Number(priceMax);
    if (hasPromo !== undefined) p.hasPromo = hasPromo;
    return p;
  }, [page, limit, sortBy, sortOrder, debouncedSearch, categoryId, size, priceMin, priceMax, hasPromo]);

  const { data, isLoading, isError, error, refetch, isFetching } = useGetProducts(params);
  const { data: categoriesData } = useGetCategories();
  const categories = categoriesData?.data ?? [];

  const rawProducts = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // Enrich each product with its resolved category name so ProductRow
  // never has to do a cross-query lookup that might arrive late.
  const categoryMap = React.useMemo(() => {
    const map = {};
    for (const cat of categories) map[cat.id] = cat.name;
    return map;
  }, [categories]);

  const products = React.useMemo(
    () => rawProducts.map((p) => ({ ...p, categoryName: categoryMap[p.categoryId] ?? "—" })),
    [rawProducts, categoryMap]
  );

  // ── Active filters count ───────────────────────────────────────────────────
  const activeFilters = [
    categoryId,
    size,
    priceMin,
    priceMax,
    hasPromo !== undefined ? hasPromo : undefined,
  ].filter(Boolean).length;

  function handleSort(col, order) {
    setSortBy(col);
    setSortOrder(order);
    setPage(1);
  }

  function resetFilters() {
    setCategoryId(undefined);
    setSize(undefined);
    setPriceMin("");
    setPriceMax("");
    setHasPromo(undefined);
    setPage(1);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="gap-0 py-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="h-9 w-72 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        </div>
        <div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-6 py-3.5 border-b border-border last:border-0"
            >
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="size-10 rounded-md bg-muted animate-pulse shrink-0" />
              <div className="h-4 flex-1 max-w-xs rounded bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse" />
              <div className="h-4 w-10 rounded bg-muted animate-pulse" />
              <div className="ml-auto flex gap-2">
                <div className="h-7 w-7 rounded bg-muted animate-pulse" />
                <div className="h-7 w-7 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card className="py-5">
        <CardContent>
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">Failed to load products</p>
              <p className="text-muted-foreground">
                {error?.message ?? "An unexpected error occurred."}
              </p>
              <button
                onClick={() => refetch()}
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

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <CardHeader className="border-b border-border px-6 py-4 gap-4">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">All Products</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {isFetching
                ? "Loading…"
                : total === 0
                ? "No products found"
                : `${total} ${total === 1 ? "product" : "products"} total`}
            </CardDescription>
          </div>
          <AddProductWindow />
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
                placeholder="Search by title or description…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-8 text-xs"
                aria-label="Search products"
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

                  {/* Category */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={categoryId ? String(categoryId) : "all"}
                      onValueChange={(v) => { setCategoryId(v === "all" ? undefined : v); setPage(1); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Size</Label>
                    <Select
                      value={size ?? "all"}
                      onValueChange={(v) => { setSize(v === "all" ? undefined : v); setPage(1); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All sizes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sizes</SelectItem>
                        {CLOTHING_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price range */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Price range (DZD)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={priceMin}
                        onChange={(e) => { setPriceMin(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                      <span className="text-muted-foreground text-xs shrink-0">—</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={priceMax}
                        onChange={(e) => { setPriceMax(e.target.value); setPage(1); }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Has promo */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Promo</Label>
                    <Select
                      value={hasPromo === undefined ? "all" : hasPromo ? "true" : "false"}
                      onValueChange={(v) => {
                        setHasPromo(v === "all" ? undefined : v === "true");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">On promo only</SelectItem>
                        <SelectItem value="false">No promo</SelectItem>
                      </SelectContent>
                    </Select>
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

          {/* Active filter chips */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categoryId && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Category: {categories.find((c) => String(c.id) === String(categoryId))?.name ?? `#${categoryId}`}
                  <button onClick={() => { setCategoryId(undefined); setPage(1); }} aria-label="Remove category filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {size && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Size: {size}
                  <button onClick={() => { setSize(undefined); setPage(1); }} aria-label="Remove size filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {(priceMin !== "" || priceMax !== "") && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  Price: {priceMin || "0"} – {priceMax || "∞"} DZD
                  <button onClick={() => { setPriceMin(""); setPriceMax(""); setPage(1); }} aria-label="Remove price filter">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {hasPromo !== undefined && (
                <Badge variant="secondary" className="text-xs gap-1 pl-2 pr-1 py-0.5">
                  {hasPromo ? "On promo" : "No promo"}
                  <button onClick={() => { setHasPromo(undefined); setPage(1); }} aria-label="Remove promo filter">
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
        <ProductTable
          products={products}
          categories={categories}
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

export default ProductPannel;
