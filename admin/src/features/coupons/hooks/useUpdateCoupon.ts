import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateCoupon from "../api/updateCoupon";
import type { UpdateCouponRequest, UpdateCouponResponse } from "../types";
import { couponsQueryKey } from "./useGetCoupons";
import { couponQueryKey } from "./useGetCoupon";

interface UpdateCouponVariables {
  id: number;
  data: UpdateCouponRequest;
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation<UpdateCouponResponse, Error, UpdateCouponVariables>({
    mutationFn: ({ id, data }) => updateCoupon(id, data),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: couponsQueryKey });
      queryClient.invalidateQueries({ queryKey: couponQueryKey(id) });
    },
  });
}
