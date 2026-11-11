import { useQuery } from "@tanstack/react-query";

import getCommune from "../api/getCommune";
import type { getCommuneResponse } from "../types";

export function CommuneQueryKey(id: number) {
  return ["Communes", id] as const;
}

export type CommuneQueryKey = ReturnType<typeof CommuneQueryKey>;

export function useGetCommune(id: number) {
  return useQuery<getCommuneResponse, Error, getCommuneResponse, CommuneQueryKey>({
    queryKey: CommuneQueryKey(id),
    queryFn: () => getCommune(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
