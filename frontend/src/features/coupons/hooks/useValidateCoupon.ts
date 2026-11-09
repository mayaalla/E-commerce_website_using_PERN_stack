import { useMutation } from "@tanstack/react-query";
import validateCoupon from "../api/validateCoupon";
import type { ValidateCouponResponse } from "../types";

export function useValidateCoupon() {
  return useMutation<ValidateCouponResponse, Error, string>({
    mutationFn: validateCoupon,
  });
}
