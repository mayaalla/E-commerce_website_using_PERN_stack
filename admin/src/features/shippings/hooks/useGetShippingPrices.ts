import { useQuery } from "@tanstack/react-query";
import getShippingPrices from "../api/getShippingPrices";
import type { GetShippingPricesResponse } from "../types";

export const shippingPricesQueryKey = ["shippingPrices"] as const;

export type ShippingPricesQueryKey = typeof shippingPricesQueryKey;

export function useGetShippingPrices() {
  return useQuery<
    GetShippingPricesResponse,
    Error,
    GetShippingPricesResponse,
    ShippingPricesQueryKey
  >({
    queryKey: shippingPricesQueryKey,
    queryFn: getShippingPrices,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
