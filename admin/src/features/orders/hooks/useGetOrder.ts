import { useQuery } from "@tanstack/react-query";

import getOrder from "../api/getOrder";
import type { GetOrderResponse } from "../types";

export function orderQueryKey(id: number) {
  return ["orders", id] as const;
}

export type OrderQueryKey = ReturnType<typeof orderQueryKey>;

export function useGetOrder(id: number) {
  return useQuery<GetOrderResponse, Error, GetOrderResponse, OrderQueryKey>({
    queryKey: orderQueryKey(id),
    queryFn: () => getOrder(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
