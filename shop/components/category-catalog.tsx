"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  LayoutList,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";

import { ProductCard } from "@/components/product-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import type { Product } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryCatalogProps = {
  products: Product[];
  categoryName: string;
};

type SortKey =
  | "featured"
  | "price-low-high"
  | "price-high-low"
  | "name-a-z"
  | "name-z-a"
  | "promo";

type ViewMode = "grid" | "list";

type FilterState = {
  sizes: string[];
  colors: string[];
  priceRange: [number, number];
  hasPromo: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CLOTHING_SIZES = ["34", "36", "38", "40", "42", "44", "46", "48"] as const;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured",       label: "À la une"           },
  { value: "price-low-high", label: "Prix : croissant"   },
  { value: "price-high-low", label: "Prix : décroissant" },
  { value: "name-a-z",       label: "Nom : A → Z"        },
  { value: "name-z-a",       label: "Nom : Z → A"        },
  { value: "promo",          label: "Promotions d'abord" },
];

const PAGE_SIZE_GRID = 12;
const PAGE_SIZE_LIST = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function effectivePrice(product: Product): number {
  return product.promo !== null && Number(product.promo) < Number(product.price)
    ? Number(product.promo)
    : Number(product.price);
}

function deriveMaxPrice(products: Product[]): number {
  if (!products.length) return 10000;
  const max = Math.max(...products.map((p) => Number(p.price)));
  return Math.ceil(max / 500) * 500;
}

function deriveColors(products: Product[]): string[] {
  const set = new Set<string>();
  products.forEach((product) =>
    product.colors.forEach((color) => set.add(color.name.trim().toLowerCase())),
  );
  return [...set].sort();
}

// ─── Filter sidebar (no category section) ────────────────────────────────────

type FilterSidebarProps = {
  filters: FilterState;
  maxPrice: number;
  allColors: string[];
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  activeCount: number;
};

function FilterSidebar({
  filters,
  maxPrice,
  allColors,
  onChange,
  onClear,
  activeCount,
}: FilterSidebarProps) {
  function toggleSize(size: string) {
    const next = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onChange({ sizes: next });
  }

  function toggleColor(color: string) {
    const next = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    onChange({ colors: next });
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold tracking-tight">Filtres</span>
          {activeCount > 0 && (
            <Badge className="rounded-full px-2 py-0 text-[10px] font-semibold tabular-nums">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" />
            Effacer
          </button>
        )}
      </div>

      <Separator />

      <Accordion
        multiple
        defaultValue={["price", "size", "color", "promo"]}
        className="w-full"
      >
        {/* ── Prix ── */}
        <AccordionItem value="price" className="border-b border-border/60">
          <AccordionTrigger className="py-3.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Prix
          </AccordionTrigger>
          <AccordionContent className="pb-5 pt-1">
            <Slider
              min={0}
              max={maxPrice}
              step={50}
              value={filters.priceRange}
              onValueChange={(val) =>
                onChange({ priceRange: val as [number, number] })
              }
              className="mt-2"
            />
            <div className="mt-3 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span>{filters.priceRange[0].toLocaleString("fr-DZ")} DA</span>
              <span>{filters.priceRange[1].toLocaleString("fr-DZ")} DA</span>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Taille ── */}
        <AccordionItem value="size" className="border-b border-border/60">
          <AccordionTrigger className="py-3.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Taille
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="flex flex-wrap gap-1.5">
              {CLOTHING_SIZES.map((size) => {
                const active = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={[
                      "flex h-8 w-11 items-center justify-center border text-xs font-medium transition-all",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:border-foreground",
                    ].join(" ")}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ── Couleur ── */}
        {allColors.length > 0 && (
          <AccordionItem value="color" className="border-b border-border/60">
            <AccordionTrigger className="py-3.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:no-underline">
              Couleur
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-0">
              <div className="flex flex-col gap-2">
                {allColors.map((color) => {
                  const id = `color-cat-${color}`;
                  return (
                    <div key={color} className="flex items-center gap-2.5">
                      <Checkbox
                        id={id}
                        checked={filters.colors.includes(color)}
                        onCheckedChange={() => toggleColor(color)}
                        className="rounded-none"
                      />
                      <Label
                        htmlFor={id}
                        className="cursor-pointer text-sm capitalize text-foreground"
                      >
                        {color}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* ── Promotions ── */}
        <AccordionItem value="promo" className="border-b-0">
          <AccordionTrigger className="py-3.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:no-underline">
            Promotions
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-0">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="cat-has-promo"
                checked={filters.hasPromo}
                onCheckedChange={(checked) =>
                  onChange({ hasPromo: checked === true })
                }
                className="rounded-none"
              />
              <Label
                htmlFor="cat-has-promo"
                className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
              >
                <Tag className="size-3.5 text-muted-foreground" />
                Articles en promotion uniquement
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function ProductPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    const leftEdge = Math.max(2, currentPage - 1);
    const rightEdge = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);
    if (leftEdge > 2) pages.push("ellipsis");
    for (let i = leftEdge; i <= rightEdge; i++) pages.push(i);
    if (rightEdge < totalPages - 1) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Page précédente"
        className="flex h-10 w-10 items-center justify-center border border-border bg-background text-foreground transition-colors hover:border-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((page, idx) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-10 w-10 items-center justify-center text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={[
              "flex h-10 w-10 items-center justify-center border text-sm font-medium transition-colors",
              page === currentPage
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:border-foreground",
            ].join(" ")}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
        className="flex h-10 w-10 items-center justify-center border border-border bg-background text-foreground transition-colors hover:border-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  onClear,
  hasFilters,
}: {
  onClear: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="border-b border-border py-20 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center border border-border">
        <Search className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium tracking-tight">Aucun produit trouvé</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? "Essayez d'élargir vos filtres ou d'effacer la recherche."
          : "Revenez bientôt, de nouveaux produits arrivent."}
      </p>
      {hasFilters && (
        <Button
          type="button"
          variant="outline"
          className="mt-6 h-11 rounded-none px-6"
          onClick={onClear}
        >
          Effacer tous les filtres
        </Button>
      )}
    </div>
  );
}

// ─── Compact list row ─────────────────────────────────────────────────────────

function ListProductRow({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const image = product.images[0];
  const hasPromo =
    product.promo !== null && Number(product.promo) < Number(product.price);
  const displayPrice = hasPromo ? product.promo! : product.price;

  function fmt(v: string) {
    const n = Number(v);
    return Number.isFinite(n)
      ? `${new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(n)} DA`
      : `${v} DA`;
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex items-center gap-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="relative size-20 shrink-0 overflow-hidden bg-muted sm:size-24">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.title}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
        {hasPromo && (
          <span className="absolute left-1 top-1 bg-foreground px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-background">
            Promo
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {categoryName && (
          <p className="mb-0.5 text-xs text-muted-foreground">{categoryName}</p>
        )}
        <p className="truncate text-sm font-medium group-hover:underline">
          {product.title}
        </p>
        {product.sizes.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tailles : {product.sizes.join(", ")}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <span className="block text-sm font-bold tabular-nums">{fmt(displayPrice)}</span>
        {hasPromo && (
          <del className="block text-xs tabular-nums text-muted-foreground">
            {fmt(product.price)}
          </del>
        )}
      </div>
    </Link>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function CategoryCatalog({ products, categoryName }: CategoryCatalogProps) {
  const maxPrice = useMemo(() => deriveMaxPrice(products), [products]);
  const allColors = useMemo(() => deriveColors(products), [products]);

  // ── State ──
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [, startTransition] = useTransition();

  const [filters, setFilters] = useState<FilterState>({
    sizes: [],
    colors: [],
    priceRange: [0, maxPrice],
    hasPromo: false,
  });

  // ── Derived ──
  const patchFilters = useCallback((patch: Partial<FilterState>) => {
    startTransition(() => {
      setFilters((prev) => ({ ...prev, ...patch }));
      setCurrentPage(1);
    });
  }, []);

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSearch("");
      setSort("featured");
      setFilters({
        sizes: [],
        colors: [],
        priceRange: [0, maxPrice],
        hasPromo: false,
      });
      setCurrentPage(1);
    });
  }, [maxPrice]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sizes.length) count++;
    if (filters.colors.length) count++;
    if (filters.hasPromo) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice) count++;
    return count;
  }, [filters, maxPrice]);

  const hasActiveFilters = activeFilterCount > 0 || search.trim() !== "" || sort !== "featured";

  // ── Filtered + sorted products ──
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (
        query &&
        ![
          product.title,
          product.description,
          ...product.colors.map((color) => color.name),
          ...product.sizes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      )
        return false;

      if (filters.sizes.length && !filters.sizes.every((s) => product.sizes.includes(s)))
        return false;

      if (
        filters.colors.length &&
        !filters.colors.some((c) =>
          product.colors.some((productColor) =>
            productColor.name.trim().toLowerCase() === c,
          ),
        )
      )
        return false;

      const price = effectivePrice(product);
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;

      if (
        filters.hasPromo &&
        !(product.promo !== null && Number(product.promo) < Number(product.price))
      )
        return false;

      return true;
    });

    if (sort === "price-low-high") filtered.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    else if (sort === "price-high-low") filtered.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    else if (sort === "name-a-z") filtered.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "name-z-a") filtered.sort((a, b) => b.title.localeCompare(a.title));
    else if (sort === "promo") {
      filtered.sort((a, b) => {
        const aHas = a.promo !== null && Number(a.promo) < Number(a.price) ? 0 : 1;
        const bHas = b.promo !== null && Number(b.promo) < Number(b.price) ? 0 : 1;
        return aHas - bHas;
      });
    }

    return filtered;
  }, [products, search, sort, filters]);

  // ── Pagination ──
  const pageSize = viewMode === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_LIST;
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageProducts = visibleProducts.slice(pageStart, pageStart + pageSize);

  const resetKey = `${visibleProducts.length}|${sort}|${search}|${viewMode}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setCurrentPage(1);
  }

  // ── Active filter chips ──
  const activeChips: { label: string; onRemove: () => void }[] = [];
  filters.sizes.forEach((s) =>
    activeChips.push({
      label: `Taille ${s}`,
      onRemove: () => patchFilters({ sizes: filters.sizes.filter((x) => x !== s) }),
    }),
  );
  filters.colors.forEach((c) =>
    activeChips.push({
      label: c.charAt(0).toUpperCase() + c.slice(1),
      onRemove: () => patchFilters({ colors: filters.colors.filter((x) => x !== c) }),
    }),
  );
  if (filters.hasPromo)
    activeChips.push({
      label: "Promotions",
      onRemove: () => patchFilters({ hasPromo: false }),
    });
  if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice)
    activeChips.push({
      label: `${filters.priceRange[0].toLocaleString("fr-DZ")}–${filters.priceRange[1].toLocaleString("fr-DZ")} DA`,
      onRemove: () => patchFilters({ priceRange: [0, maxPrice] }),
    });

  if (products.length === 0) {
    return (
      <div className="border-b border-border py-24 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun produit dans cette catégorie pour le moment.
        </p>
        <Button className="mt-6 h-11 rounded-none px-6" render={<Link href="/products" />}>
          Voir tous les produits
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
        {/* Search */}
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans cette catégorie…"
            aria-label="Rechercher des produits"
            className="h-10 rounded-none pl-9 pr-3 text-sm"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 w-auto min-w-44 rounded-none gap-2 text-sm">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center border border-border">
          <button
            type="button"
            aria-label="Grille"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={[
              "flex h-10 w-10 items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Liste"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={[
              "flex h-10 w-10 items-center justify-center transition-colors",
              viewMode === "list"
                ? "bg-foreground text-background"
                : "bg-background text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <LayoutList className="size-4" />
          </button>
        </div>

        {/* Mobile filter trigger */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="relative h-10 rounded-none gap-2 lg:hidden"
              />
            }
          >
            <Filter className="size-4" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {activeFilterCount}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto rounded-none p-6">
            <SheetHeader className="mb-2 px-0">
              <SheetTitle className="text-left text-base font-semibold">
                Filtrer les produits
              </SheetTitle>
            </SheetHeader>
            <FilterSidebar
              filters={filters}
              maxPrice={maxPrice}
              allColors={allColors}
              onChange={patchFilters}
              onClear={clearFilters}
              activeCount={activeFilterCount}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Active chips ── */}
      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtres actifs :</span>
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onRemove}
              className="flex items-center gap-1 border border-border bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:border-foreground"
            >
              {chip.label}
              <X className="size-3 text-muted-foreground" />
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Tout effacer
            </button>
          )}
        </div>
      )}

      {/* ── Layout: sidebar + grid ── */}
      <div className="mt-6 flex gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <FilterSidebar
            filters={filters}
            maxPrice={maxPrice}
            allColors={allColors}
            onChange={patchFilters}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />
        </aside>

        {/* Product area */}
        <div className="min-w-0 flex-1">
          {/* Results count */}
          <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
            {visibleProducts.length === 0
              ? "Aucun résultat"
              : `${visibleProducts.length} ${visibleProducts.length === 1 ? "produit" : "produits"}`}
            {hasActiveFilters && " pour vos critères"}
          </p>

          {visibleProducts.length > 0 ? (
            <>
              <ul
                className={[
                  viewMode === "grid"
                    ? "grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-8"
                    : "flex flex-col gap-0 divide-y divide-border",
                ].join(" ")}
              >
                {pageProducts.map((product) => (
                  <li key={product.id} className="min-w-0">
                    {viewMode === "list" ? (
                      <ListProductRow
                        product={product}
                        categoryName={categoryName}
                      />
                    ) : (
                      <ProductCard
                        product={product}
                        categoryName={categoryName}
                      />
                    )}
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <ProductPagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          ) : (
            <EmptyState onClear={clearFilters} hasFilters={hasActiveFilters} />
          )}
        </div>
      </div>
    </div>
  );
}
