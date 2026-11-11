import { useQuery } from "@tanstack/react-query";
import getShippingCompanies from "../api/getShippingCompanies";
import type { GetShippingCompaniesResponse } from "../types";

export const shippingCompaniesQueryKey = ["shippingCompanies"] as const;

export type ShippingCompaniesQueryKey = typeof shippingCompaniesQueryKey;

export function useGetShippingCompanies() {
  return useQuery<
    GetShippingCompaniesResponse,
    Error,
    GetShippingCompaniesResponse,
    ShippingCompaniesQueryKey
  >({
    queryKey: shippingCompaniesQueryKey,
    queryFn: getShippingCompanies,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
