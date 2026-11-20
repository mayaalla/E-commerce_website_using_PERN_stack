import { useQuery } from "@tanstack/react-query";

import getCategory from "../api/getCategory";
import type { getCategoryResponse } from "../types";

export function categoryQueryKey(id: number) {
  return ["categories", id] as const;
}

export type CategoryQueryKey = ReturnType<typeof categoryQueryKey>;

export function useGetCategory(id: number) {
  return useQuery<getCategoryResponse, Error, getCategoryResponse, CategoryQueryKey>({
    queryKey: categoryQueryKey(id),
    queryFn: () => getCategory(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
