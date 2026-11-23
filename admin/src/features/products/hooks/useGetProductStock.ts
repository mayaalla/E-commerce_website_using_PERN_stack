import { useQuery } from "@tanstack/react-query";

import getProductStock from "../api/getProductStock";
import type { GetProductStockResponse } from "../types";
import { productQueryKey } from "./useGetProduct";

export function productStockQueryKey(productId: number) {
  return [...productQueryKey(productId), "stock"] as const;
}

export function useGetProductStock(productId: number, enabled = true) {
  return useQuery<GetProductStockResponse, Error>({
    queryKey: productStockQueryKey(productId),
    queryFn: ({ signal }) => getProductStock(productId, signal),
    enabled: enabled && Number.isInteger(productId) && productId > 0,
    // Stock changes more often than product metadata, so refresh it when the
    // edit dialog opens instead of treating an old grid as current.
    staleTime: 0,
  });
}
