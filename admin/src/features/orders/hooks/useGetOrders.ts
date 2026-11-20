import { useQuery } from "@tanstack/react-query";

import getOrders from "../api/getOrders";
import type { GetOrdersResponse, OrdersQueryParams } from "../types";

export const ordersQueryKey = (params?: OrdersQueryParams) =>
  ["orders", params] as const;

export type OrdersQueryKey = ReturnType<typeof ordersQueryKey>;

export function useGetOrders(params?: OrdersQueryParams) {
  return useQuery<GetOrdersResponse, Error>({
    queryKey: ordersQueryKey(params),
    queryFn: () => getOrders(params),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}
