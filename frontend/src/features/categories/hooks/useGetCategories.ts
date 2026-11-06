import { useQuery } from "@tanstack/react-query";

import getCategories from "../api/getCategories";
import type { getCategoriesResponse } from "../types";

export const categoriesQueryKey = ["categories"] as const;

export type CategoriesQueryKey = typeof categoriesQueryKey;

export function useGetCategories() {
  return useQuery<getCategoriesResponse, Error, getCategoriesResponse, CategoriesQueryKey>({
    queryKey: categoriesQueryKey,
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes — categories rarely change
  });
}
