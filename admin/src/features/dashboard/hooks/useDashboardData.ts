import { useQueries } from "@tanstack/react-query";
import {
  fetchOrders,
  fetchOrderStats,
  fetchProducts,
  fetchCategories,
  fetchWilayas,
  fetchShippingCompanies,
  // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
  // fetchShippingPrices,
  fetchCoupons,
  fetchMe,
} from "../api/api";
import type { DashboardData } from "../types";

const STALE = 60_000; // 1 minute

export function useDashboardData(): DashboardData {
  const results = useQueries({
    queries: [
      { queryKey: ["dashboard", "orders"],            queryFn: fetchOrders,            staleTime: STALE },
      // Revenue and order counts come from the dedicated stats endpoint (GET /orders/stats).
      // This is required because GET /orders excludes soft-deleted orders, so computing
      // totalRevenue or allTimeOrderCount from the orders list would under-report.
      { queryKey: ["dashboard", "orderStats"],        queryFn: fetchOrderStats,        staleTime: STALE },
      { queryKey: ["dashboard", "products"],          queryFn: fetchProducts,          staleTime: STALE },
      { queryKey: ["dashboard", "categories"],        queryFn: fetchCategories,        staleTime: STALE },
      { queryKey: ["dashboard", "wilayas"],           queryFn: fetchWilayas,           staleTime: STALE },
      { queryKey: ["dashboard", "shippingCompanies"], queryFn: fetchShippingCompanies, staleTime: STALE },
      // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
      // { queryKey: ["dashboard", "shippingPrices"],    queryFn: fetchShippingPrices,    staleTime: STALE },
      { queryKey: ["dashboard", "coupons"],           queryFn: fetchCoupons,           staleTime: STALE },
      { queryKey: ["dashboard", "me"],                queryFn: fetchMe,                staleTime: Infinity },
    ],
  });

  const [
    ordersQ,
    orderStatsQ,
    productsQ,
    categoriesQ,
    wilayasQ,
    companiesQ,
    // pricesQ,  // TODO: shipping prices
    couponsQ,
    meQ,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError   = results.some((r) => r.isError);

  return {
    orders:            ordersQ.data?.data           ?? [],
    orderStats:        orderStatsQ.data?.data        ?? null,
    products:          productsQ.data?.data         ?? [],
    categories:        categoriesQ.data?.data       ?? [],
    wilayas:           wilayasQ.data?.data          ?? [],
    shippingCompanies: companiesQ.data?.data        ?? [],
    // TODO: shipping prices — endpoint GET /api/shipping/prices not yet implemented on the backend
    shippingPrices:    /* pricesQ.data?.data ?? */ [],
    coupons:           couponsQ.data?.data          ?? [],
    admin:             meQ.data?.data               ?? null,
    isLoading,
    isError,
  };
}
