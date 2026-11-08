import { useQuery } from "@tanstack/react-query";

import getProducts from "../api/getProducts";
import type { GetProductsResponse } from "../types";

export const productsQueryKey = ["products"] as const;

export type ProductsQueryKey = typeof productsQueryKey;

export function useGetProducts() {
  return useQuery<GetProductsResponse, Error, GetProductsResponse, ProductsQueryKey>({
    queryKey: productsQueryKey,
    queryFn: getProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes — products rarely change in the same session
  });
}
