import { useQuery } from "@tanstack/react-query";
import getCoupon from "../api/getCoupon";
import type { GetCouponResponse } from "../types";

export function couponQueryKey(id: number) {
  return ["coupons", id] as const;
}

export type CouponQueryKey = ReturnType<typeof couponQueryKey>;

export function useGetCoupon(id: number) {
  return useQuery<GetCouponResponse, Error, GetCouponResponse, CouponQueryKey>({
    queryKey: couponQueryKey(id),
    queryFn: () => getCoupon(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
