import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteCoupon from "../api/deleteCoupon";
import type { DeleteCouponResponse } from "../types";
import { couponsQueryKey } from "./useGetCoupons";
import { couponQueryKey } from "./useGetCoupon";

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation<DeleteCouponResponse, Error, number>({
    mutationFn: deleteCoupon,
    onSuccess: (_response, id) => {
      queryClient.invalidateQueries({ queryKey: couponsQueryKey });
      queryClient.removeQueries({ queryKey: couponQueryKey(id) });
    },
  });
}
