import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { ValidateCouponResponse } from "../types";

const validateCoupon = async (
  code: string
): Promise<ValidateCouponResponse> => {
  try {
    const response = await apiClient.get<ValidateCouponResponse>(
      `/coupons/validate/${code}`
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while validating the coupon.";
        throw new Error(
          `Validate coupon failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while validating the coupon.");
    }
    throw new Error(
      "An unexpected error occurred while validating the coupon."
    );
  }
};

export default validateCoupon;
