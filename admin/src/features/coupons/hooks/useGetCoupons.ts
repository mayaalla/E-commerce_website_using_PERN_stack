import { useQuery } from "@tanstack/react-query";
import getCoupons from "../api/getCoupons";
import type { GetCouponsResponse } from "../types";

export const couponsQueryKey = ["coupons"] as const;

export type CouponsQueryKey = typeof couponsQueryKey;

export function useGetCoupons() {
  return useQuery<GetCouponsResponse, Error, GetCouponsResponse, CouponsQueryKey>(
    {
      queryKey: couponsQueryKey,
      queryFn: getCoupons,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );
}
