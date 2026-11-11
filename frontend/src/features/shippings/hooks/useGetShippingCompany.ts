import { useQuery } from "@tanstack/react-query";
import getShippingCompany from "../api/getShippingCompany";
import type { GetShippingCompanyResponse } from "../types";

export function shippingCompanyQueryKey(id: number) {
  return ["shippingCompanies", id] as const;
}

export type ShippingCompanyQueryKey = ReturnType<typeof shippingCompanyQueryKey>;

export function useGetShippingCompany(id: number) {
  return useQuery<
    GetShippingCompanyResponse,
    Error,
    GetShippingCompanyResponse,
    ShippingCompanyQueryKey
  >({
    queryKey: shippingCompanyQueryKey(id),
    queryFn: () => getShippingCompany(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
