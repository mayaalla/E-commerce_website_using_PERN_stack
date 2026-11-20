import { useQuery } from "@tanstack/react-query";

import getWilayas from "../api/getAllWilayas";
import type { getAllWilayasResponse } from "../types";

export const WilayasQueryKey = ["Wilayas"] as const;

export type WilayasQueryKey = typeof WilayasQueryKey;

export function useGetWilayas() {
  return useQuery<getAllWilayasResponse, Error, getAllWilayasResponse, WilayasQueryKey>({
    queryKey: WilayasQueryKey,
    queryFn: getWilayas,
    staleTime: 1000 * 60 * 5, // 5 minutes — Wilayas rarely change
  });
}
