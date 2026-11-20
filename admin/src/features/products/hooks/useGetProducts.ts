import { useQuery } from "@tanstack/react-query";

import getProducts from "../api/getProducts";
import type { GetProductsResponse, ProductsQueryParams } from "../types";

export const productsQueryKey = (params?: ProductsQueryParams) =>
  ["products", params] as const;

export type ProductsQueryKey = ReturnType<typeof productsQueryKey>;

export function useGetProducts(params?: ProductsQueryParams) {
  return useQuery<GetProductsResponse, Error>({
    queryKey: productsQueryKey(params),
    queryFn: () => getProducts(params),
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });
}
