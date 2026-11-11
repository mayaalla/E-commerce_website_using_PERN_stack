import { useQuery } from "@tanstack/react-query";

import getCommunes from "../api/getCommunes";
import type { getAllCommunesResponse } from "../types";

export const CommunesQueryKey = ["Communes"] as const;

export type CommunesQueryKey = typeof CommunesQueryKey;

export function useGetCommunes() {
  return useQuery<getAllCommunesResponse, Error, getAllCommunesResponse, CommunesQueryKey>({
    queryKey: CommunesQueryKey,
    queryFn: getCommunes,
    staleTime: 1000 * 60 * 5, // 5 minutes — Communes rarely change
  });
}
