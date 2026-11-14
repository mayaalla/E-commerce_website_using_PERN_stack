import { useQuery } from "@tanstack/react-query";

import getOrders from "../api/getOrders";
import type { GetOrdersResponse } from "../types";

export const ordersQueryKey = ["orders"] as const;

export type OrdersQueryKey = typeof ordersQueryKey;

export function useGetOrders() {
  return useQuery<GetOrdersResponse, Error, GetOrdersResponse, OrdersQueryKey>({
    queryKey: ordersQueryKey,
    queryFn: getOrders,
    staleTime: 1000 * 60 * 5, // 5 minutes — orders rarely change in the same session
  });
}
