import { useQuery } from "@tanstack/react-query";

import getCommunesBywilaya from "../api/getCommunesByWilaya";
import type { getAllCommunesResponse } from "../types";


export function CommunesByWilayaQueryKey(code: string) {
  return ["Communes", "ByWilaya", code] as const;
}

export type CommunesByWilayaQueryKey = ReturnType<typeof CommunesByWilayaQueryKey>;

export function useGetCommunesByWilaya(code: string) {
  return useQuery<getAllCommunesResponse, Error, getAllCommunesResponse, CommunesByWilayaQueryKey>({
    queryKey: CommunesByWilayaQueryKey(code),
    queryFn: () => getCommunesBywilaya(code),
    staleTime: 1000 * 60 * 5, // 5 minutes — Communes rarely change
    // Do NOT fire the request until a valid 2-digit wilaya code is provided.
    // An empty code would hit GET /communes/by-wilaya/ (no param) → 400.
    enabled: code.length > 0,
  });
}
