import { useQuery } from "@tanstack/react-query";
import getShippingPrice from "../api/getShippingPrice";
import type { GetShippingPriceResponse } from "../types";

export function shippingPriceQueryKey(id: number) {
  return ["shippingPrices", id] as const;
}

export type ShippingPriceQueryKey = ReturnType<typeof shippingPriceQueryKey>;

export function useGetShippingPrice(id: number) {
  return useQuery<
    GetShippingPriceResponse,
    Error,
    GetShippingPriceResponse,
    ShippingPriceQueryKey
  >({
    queryKey: shippingPriceQueryKey(id),
    queryFn: () => getShippingPrice(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
