import { useQuery } from "@tanstack/react-query";

import getWilaya from "../api/getWilaya";
import type { getWilayaResponse } from "../types";

export function WilayaQueryKey(id: number) {
  return ["categories", id] as const;
}

export type WilayaQueryKey = ReturnType<typeof WilayaQueryKey>;

export function useGetWilaya(id: number) {
  return useQuery<getWilayaResponse, Error, getWilayaResponse, WilayaQueryKey>({
    queryKey: WilayaQueryKey(id),
    queryFn: () => getWilaya(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
