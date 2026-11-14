import { useQuery } from "@tanstack/react-query";

import getOrderStats from "../api/getOrderStats";
import type { GetOrderStatsResponse } from "../types";

export const orderStatsQueryKey = ["orders", "stats"] as const;

export type OrderStatsQueryKey = typeof orderStatsQueryKey;

export function useGetOrderStats() {
  return useQuery<GetOrderStatsResponse, Error, GetOrderStatsResponse, OrderStatsQueryKey>({
    queryKey: orderStatsQueryKey,
    queryFn: getOrderStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
