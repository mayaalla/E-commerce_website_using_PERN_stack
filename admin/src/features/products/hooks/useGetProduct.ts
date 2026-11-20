import { useQuery } from "@tanstack/react-query";

import getProduct from "../api/getProduct";
import type { GetProductResponse } from "../types";

export function productQueryKey(id: number) {
  return ["products", id] as const;
}

export type ProductQueryKey = ReturnType<typeof productQueryKey>;

export function useGetProduct(id: number) {
  return useQuery<GetProductResponse, Error, GetProductResponse, ProductQueryKey>({
    queryKey: productQueryKey(id),
    queryFn: () => getProduct(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
