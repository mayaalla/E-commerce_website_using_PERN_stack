import { apiClient } from "@/lib/api-client";
import { AxiosError } from "axios";
import type { UpdateCouponRequest, UpdateCouponResponse } from "../types";

const updateCoupon = async (
  id: number,
  data: UpdateCouponRequest
): Promise<UpdateCouponResponse> => {
  try {
    const response = await apiClient.put<UpdateCouponResponse>(
      `/coupons/${id}`,
      data
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ??
          "An error occurred while updating the coupon.";
        throw new Error(
          `Update coupon failed with status ${status}: ${message}`
        );
      }
      throw new Error("Network error occurred while updating the coupon.");
    }
    throw new Error("An unexpected error occurred while updating the coupon.");
  }
};

export default updateCoupon;
