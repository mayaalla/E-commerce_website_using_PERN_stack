import { useQuery } from "@tanstack/react-query";
import getShippingCompanyPrices from "../api/getShippingCompanyPrices";
import type { GetShippingCompanyPricesResponse } from "../types";

export function shippingCompanyPricesQueryKey(companyId: number) {
  return ["shippingCompanies", companyId, "prices"] as const;
}

export type ShippingCompanyPricesQueryKey = ReturnType<
  typeof shippingCompanyPricesQueryKey
>;

export function useGetShippingCompanyPrices(companyId: number) {
  return useQuery<
    GetShippingCompanyPricesResponse,
    Error,
    GetShippingCompanyPricesResponse,
    ShippingCompanyPricesQueryKey
  >({
    queryKey: shippingCompanyPricesQueryKey(companyId),
    queryFn: () => getShippingCompanyPrices(companyId),
    enabled: Number.isInteger(companyId) && companyId > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
