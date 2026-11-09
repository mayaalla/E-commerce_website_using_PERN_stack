import { useMutation, useQueryClient } from "@tanstack/react-query";
import createCoupon from "../api/createCoupon";
import type { CreateCouponRequest, CreateCouponResponse } from "../types";
import { couponsQueryKey } from "./useGetCoupons";

export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation<CreateCouponResponse, Error, CreateCouponRequest>({
    mutationFn: createCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: couponsQueryKey });
    },
  });
}
